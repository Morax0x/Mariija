// 📁 index.js (النسخة 8.4 - النظيفة تماماً)

import {
    Client, GatewayIntentBits, Partials, ChannelType,
    AttachmentBuilder, MessageFlags, Collection, EmbedBuilder
} from "discord.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv/config";
import { writeFile } from 'fs/promises';
import fetch from 'node-fetch';

import {
    DB_PATH, SLASH_COMMANDS, LANG, OWNER_ID,
    isOwner, checkAdmin, embedSimple, createSummaryEmbed, replyOrFollowUp,
    createPaginatedStatsEmbed, createListEmbed, createStatsEmbedPage,
    createChannelListStats,
    البادئة, setPrefix, cleanChannelName,
    buildSummaryComponents, buildPublisherAdComponents,
    sendOrUpdatePublisherAd
} from './utils.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error("خطأ: حط توكن البوت في متغير البيئة TOKEN");
    process.exit(1);
}

export let db;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.paginateFunctions = {};

async function initializeDatabase() {
    try {
        db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        await db.exec("PRAGMA foreign_keys = ON;");

        await db.exec(`CREATE TABLE IF NOT EXISTS publishers (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            tag TEXT,
            joinDate TEXT,
            PRIMARY KEY (guildId, userId)
        );`);

        await db.exec(`CREATE TABLE IF NOT EXISTS publisher_ad_messages (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            messageId TEXT NOT NULL,
            PRIMARY KEY (guildId, userId),
            FOREIGN KEY (guildId, userId) REFERENCES publishers(guildId, userId) ON DELETE CASCADE
        );`);

        await db.exec(`CREATE TABLE IF NOT EXISTS channels (
            guildId TEXT NOT NULL,
            channelId TEXT NOT NULL,
            name TEXT,
            PRIMARY KEY (channelId)
        );`);

        await db.exec(`CREATE TABLE IF NOT EXISTS stats (
            guildId TEXT NOT NULL,
            userId TEXT,
            channelId TEXT,
            messageCount INTEGER DEFAULT 0,
            points INTEGER DEFAULT 0,
            lastPostDate TEXT,
            PRIMARY KEY (guildId, userId, channelId),
            FOREIGN KEY (guildId, userId) REFERENCES publishers(guildId, userId) ON DELETE CASCADE,
            FOREIGN KEY (channelId) REFERENCES channels(channelId) ON DELETE CASCADE
        );`);

        await db.exec(`CREATE TABLE IF NOT EXISTS post_log (
            messageId TEXT PRIMARY KEY,
            guildId TEXT NOT NULL,
            userId TEXT,
            channelId TEXT,
            timestamp TEXT,
            mediaCount INTEGER DEFAULT 0,
            FOREIGN KEY (guildId, userId) REFERENCES publishers(guildId, userId) ON DELETE CASCADE,
            FOREIGN KEY (channelId) REFERENCES channels(channelId) ON DELETE CASCADE
        );`);

        await db.exec(`CREATE TABLE IF NOT EXISTS admins (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            PRIMARY KEY (guildId, userId)
        );`);
        
        await db.exec(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        );`);

        await db.exec(`CREATE TABLE IF NOT EXISTS customization (
            guildId TEXT NOT NULL,
            command TEXT NOT NULL,
            color TEXT,
            image TEXT,
            thumbnail TEXT,
            PRIMARY KEY (guildId, command)
        );`);

        const prefixRow = await db.get("SELECT value FROM config WHERE key = 'prefix_global_fallback'");
        if (prefixRow) { setPrefix(prefixRow.value); }
        else { await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('prefix_global_fallback', ?)", البادئة); }
        
        console.log(`Database initialized (Guild-Aware). Default prefix: ${البادئة}`);
    
    } catch (err) { 
        console.error("Failed to initialize database (Guild-Aware):", err); 
        process.exit(1); 
    }
}

async function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) { fs.mkdirSync(commandsPath); }
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        try {
            const command = (await import(fileUrl)).default;
            if ('name' in command && 'execute' in command) {
                client.commands.set(command.name, command);
                console.log(`[+] تم تحميل الأمر: ${command.name}`);
            } else { console.log(`[!] فشل تحميل الأمر في ${filePath}`); }
        } catch (error) { console.error(`[X] خطأ في تحميل الأمر ${filePath}:`, error); }
    }
}

async function sendDailyBackup() {
    try {
        if (!OWNER_ID) {
            console.error('❌ متغير OWNER_ID غير موجود! لا يمكن إرسال النسخة الاحتياطية.');
            return;
        }
        const owner = await client.users.fetch(OWNER_ID);
        if (!owner) {
            console.error(`❌ لا يمكن العثور على المالك (OWNER_ID: ${OWNER_ID})`);
            return;
        }

        const attachment = new AttachmentBuilder(DB_PATH, {
            name: `publisher_stats_backup_${new Date().toISOString().split('T')[0]}.db`
        });

        await owner.send({
            content: '📦 **النسخة الاحتياطية لقاعدة البيانات**',
            files: [attachment]
        });

        console.log(`✅ تم إرسال النسخة الاحتياطية إلى خاص المالك (ID: ${OWNER_ID})`);
    } catch (error) {
        console.error('❌ فشل إرسال النسخة الاحتياطية:', error);
    }
}

async function sendGuildJoinNotification(guild) {
    try {
        if (!OWNER_ID) return;
        const owner = await client.users.fetch(OWNER_ID);
        if (!owner) return;

        const embed = new EmbedBuilder()
            .setTitle('🆕 تمت إضافة البوت إلى سيرفر جديد')
            .setColor(0x00FF00)
            .addFields(
                { name: 'اسم السيرفر', value: guild.name, inline: true },
                { name: 'ID السيرفر', value: guild.id, inline: true },
            	{ name: 'عدد الأعضاء', value: guild.memberCount.toString(), inline: true },
                { name: 'المالك', value: guild.ownerId ? `<@${guild.ownerId}>` : 'غير معروف', inline: true },
                { name: 'تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
            )
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setTimestamp();

        await owner.send({ embeds: [embed] });
        console.log(`✅ تم إرسال إشعار انضمام للسيرفر: ${guild.name}`);
    } catch (error) {
        console.error('❌ فشل إرسال إشعار انضمام السيرفر:', error);
    }
}

async function handleMessageCreate(message) {
    if (message.author.bot || !message.guild) return;
    
    const guildId = message.guildId; 

    try {
        const isPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", message.author.id, guildId);
        const isMonitored = await db.get("SELECT 1 FROM channels WHERE channelId = ? AND guildId = ?", message.channel.id, guildId);
        
        if (isPublisher && isMonitored) {
            let mediaCount = 0;
            if (message.attachments.size > 0) {
                mediaCount += message.attachments.filter(attachment => {
                    const type = attachment.contentType?.toLowerCase() || '';
                    return type.startsWith('image/') || type.startsWith('video/') || type.includes('gif') ||
                           attachment.name?.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi|webm|webp)$/i);
                }).size;
            }
            if (message.content) {
                const mediaLinks = message.content.match(/https?:\/\/[^\s]+/gi);
                if (mediaLinks) {
                    const validLinks = mediaLinks.filter(link =>
                        link.includes('cdn.discordapp.com') ||
                        link.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi|webm|webp)$/i)
                    );
                    mediaCount += validLinks.length;
                }
            }
            if (message.embeds.length > 0) {
                mediaCount += message.embeds.filter(embed =>
                    embed.type === 'image' || embed.type === 'video' || embed.type === 'gifv' ||
                    (embed.thumbnail && (embed.thumbnail.url || embed.thumbnail.proxyURL)) ||
                    (embed.image && (embed.image.url || embed.image.proxyURL)) ||
                    (embed.video && (embed.video.url || embed.video.proxyURL))
                ).length;
            }
            if (mediaCount > 0) {
                const now = new Date().toISOString();
                console.log(`📊 ${message.author.tag} نشر ${mediaCount} وسائط في ${message.channel.name} (G: ${guildId})`);
                await db.run(
                    `INSERT INTO stats (guildId, userId, channelId, messageCount, points, lastPostDate)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON CONFLICT(guildId, userId, channelId)
                     DO UPDATE SET
                        messageCount = messageCount + ?,
                        points = points + ?,
                        lastPostDate = ?`,
                    [guildId, message.author.id, message.channel.id, mediaCount, mediaCount, now, mediaCount, mediaCount, now]
                );
                await db.run(
                    `INSERT OR REPLACE INTO post_log (messageId, guildId, userId, channelId, timestamp, mediaCount)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [message.id, guildId, message.author.id, message.channel.id, now, mediaCount]
                );
            }
        }
    } catch (err) {
        console.error("Error in handleMessageCreate (Media Tracking):", err);
    }

    let guildPrefix = البادئة; 
    const prefixRow = await db.get("SELECT value FROM config WHERE key = ?", `prefix:${guildId}`);
    if (prefixRow) {
        guildPrefix = prefixRow.value;
    }

    if (!message.content.startsWith(guildPrefix)) return;
    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    if (command.adminOnly && !(await checkAdmin(message, db))) {
        return message.reply({ embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")] });
    }
    if (command.ownerOnly && !isOwner(message.author.id)) {
        return message.reply({ embeds: [embedSimple(client, LANG.ar.ERROR_OWNER_ONLY, "", "Red")] });
    }

    try {
        await command.execute(client, message, args, db);
    } catch (error) {
        console.error(`Error executing prefix command '${commandName}':`, error);
        await message.reply({ embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء تنفيذ هذا الأمر.", "Red")] });
    }
}

async function handleMessageDelete(message) {
    if (message.author?.bot || !message.guildId) return; 
    
    try {
        const logEntry = await db.get(`SELECT userId, channelId, mediaCount, guildId FROM post_log WHERE messageId = ?`, message.id);
        if (!logEntry) return;

        const { userId, channelId, mediaCount, guildId } = logEntry; 
        
        await db.run(`UPDATE stats SET
            points = MAX(0, points - ?),
            messageCount = MAX(0, messageCount - ?)
            WHERE userId = ? AND channelId = ? AND guildId = ?`,
            [mediaCount, mediaCount, userId, channelId, guildId]); 

        await db.run(`DELETE FROM post_log WHERE messageId = ?`, message.id);
        console.log(`🗑️ تم خصم ${mediaCount} نقاط من ${userId} (G: ${guildId})`);
    } catch (err) {
        console.error("Error in handleMessageDelete (Media Tracking):", err);
    }
}

async function handleMessageUpdate(oldMessage, newMessage) {
    try {
        if (newMessage.author.bot || !newMessage.guild) return;
        const guildId = newMessage.guildId; 

        const isPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", newMessage.author.id, guildId);
        const isMonitored = await db.get("SELECT 1 FROM channels WHERE channelId = ? AND guildId = ?", newMessage.channel.id, guildId);
        if (!isPublisher || !isMonitored) return;

        const logEntry = await db.get(`SELECT mediaCount FROM post_log WHERE messageId = ?`, newMessage.id);
        if (!logEntry) return; 
        
        const oldMediaCount = logEntry.mediaCount;
        let newMediaCount = 0;
        
        if (newMessage.attachments.size > 0) {
            newMediaCount += newMessage.attachments.filter(attachment => {
                const type = attachment.contentType?.toLowerCase() || '';
                return type.startsWith('image/') || type.startsWith('video/') || type.includes('gif') ||
                       attachment.name?.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi|webm|webp)$/i);
            }).size;
        }
        if (newMessage.content) {
            const mediaLinks = newMessage.content.match(/https?:\/\/[^\s]+/gi);
            if (mediaLinks) {
                const validLinks = mediaLinks.filter(link =>
                    link.includes('cdn.discordapp.com') ||
                    link.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi|webm|webp)$/i)
                );
                newMediaCount += validLinks.length;
            }
        }
        if (newMessage.embeds.length > 0) {
            newMediaCount += newMessage.embeds.filter(embed =>
                embed.type === 'image' || embed.type === 'video' || embed.type === 'gifv' ||
                (embed.thumbnail && (embed.thumbnail.url || embed.thumbnail.proxyURL)) ||
                (embed.image && (embed.image.url || embed.image.proxyURL)) ||
                (embed.video && (embed.video.url || embed.video.proxyURL))
            ).length;
        }

        const difference = newMediaCount - oldMediaCount;
        if (difference !== 0) {
            const now = new Date().toISOString();
            await db.run(`UPDATE stats SET
                points = MAX(0, points + ?),
                messageCount = MAX(0, messageCount + ?),
                lastPostDate = ?
                WHERE userId = ? AND channelId = ? AND guildId = ?`,
                [difference, difference, now, newMessage.author.id, newMessage.channel.id, guildId]);
            
            await db.run(`UPDATE post_log SET mediaCount = ?, timestamp = ? WHERE messageId = ?`,
                [newMediaCount, now, newMessage.id]);
            
            console.log(`✏️ ${newMessage.author.tag} عدل وسائط: ${oldMediaCount} -> ${newMediaCount} (فرق: ${difference}) (G: ${guildId})`);
        }
    } catch (err) {
        console.error("Error in handleMessageUpdate (Media Tracking):", err);
    }
}

async function handleInteraction(interaction) {
  if (!interaction.guildId) {
      if (interaction.isCommand()) {
        await interaction.reply({ embeds: [embedSimple(client, "❌ خطأ", "هذا البوت يعمل داخل السيرفرات فقط.", "Red")], ephemeral: true });
      }
      return; 
  }

  const guildId = interaction.guildId; 

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (command.adminOnly && !(await checkAdmin(interaction, db)))
      return interaction.reply({ embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], ephemeral: true });
    if (command.ownerOnly && !isOwner(interaction.user.id))
      return interaction.reply({ embeds: [embedSimple(client, LANG.ar.ERROR_OWNER_ONLY, "", "Red")], ephemeral: true });
    
    try {
      await command.execute(client, interaction, interaction.options, db);
    } catch (error) {
      console.error(`Error executing slash command '${interaction.commandName}':`, error);
      await replyOrFollowUp(interaction, {
        embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء تنفيذ هذا الأمر.", "Red")],
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  if (interaction.isButton()) {
    const idParts = interaction.customId.split("_");
    const buttonType = idParts[0];

    try {
      // --- (أزرار الملخص) ---
      if (buttonType === "summary") {
        await interaction.deferUpdate();
        const action = idParts[1];
        let newTimeframe = '30d';

        if (action === "time") { newTimeframe = idParts[3]; }
        else if (action === "refresh") { newTimeframe = idParts[3]; }

        const embed = await createSummaryEmbed(client, db, newTimeframe, guildId);
        if (!embed) return;
        const components = buildSummaryComponents(guildId, newTimeframe);
        await interaction.editReply({ embeds: [embed], components }).catch(() => {});
        return;
      }

      // --- (أزرار /stats) ---
      if (buttonType === "stats") {
        await interaction.deferUpdate();
        const action = idParts[1];
        const statsAuthorId = idParts[2];
        
        if (interaction.user.id !== statsAuthorId) {
            return interaction.followUp({ content: "لا يمكنك استخدام أزرار هذا الأمر، اطلب الأمر بنفسك.", ephemeral: true });
        }
        const targetUserId = idParts[3];
        const targetUser = await client.users.fetch(targetUserId).catch(() => null);
        if (!targetUser) return;

        let newPage = 1;
        let newTimeframe = '30d';

        if (action === "page") {
          newTimeframe = idParts[4];
          newPage = parseInt(idParts[5]) || 1;
        } else if (action === "time") {
          newTimeframe = idParts[4];
          newPage = 1;
        }

        const { embed, rows } = await createPaginatedStatsEmbed(client, db, targetUser, newPage, statsAuthorId, newTimeframe, "stats", guildId);
        await interaction.editReply({ embeds: [embed], components: rows }).catch(() => {});
        return;
      }

      // --- (أزرار قناة الإعلانات) ---
      if (buttonType === "pubad") {
        await interaction.deferUpdate();
        const action = idParts[1]; 
        const pubadAuthorId = idParts[2]; // (هذا هو guildId)
        const targetUserId = idParts[3];
        
        const targetUser = await client.users.fetch(targetUserId).catch(() => null);
        if (!targetUser) return;

        let newPage = 1;
        let newTimeframe = '30d';

        if (action === "page") {
          newTimeframe = idParts[4];
          newPage = parseInt(idParts[5]) || 1;
        } else if (action === "time") {
          newTimeframe = idParts[4];
          newPage = 1;
        } else if (action === "refresh") {
          newTimeframe = idParts[4] || '30d';
          newPage = 1;
        }

        const { embed, rows } = await createPaginatedStatsEmbed(client, db, targetUser, newPage, pubadAuthorId, newTimeframe, "pubad", guildId);
        await interaction.editReply({ embeds: [embed], components: rows }).catch(() => {});
        return;
      }

      // --- (أزرار القوائم) ---
      if (buttonType === "page") {
        await interaction.deferUpdate();
        const command = idParts[1];
        const newPage = Math.max(1, parseInt(idParts[3]) || 1);

        if (command === "stats_top") {
          const { embed, row } = await createStatsEmbedPage(client, db, newPage, "stats_top", guildId);
          await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
        } else if (command === "listchannels" || command === "listadmins" || command === "listpublishers") {
          const { embed, row } = await createListEmbed(client, db, newPage, command, interaction); 
          await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
        }
        return;
      }
      
      // --- (أزرار channelstats) ---
      if (buttonType === "channelstats") {
          await interaction.deferUpdate();
          const action = idParts[1];
          const authorId = idParts[2];
          
          if (interaction.user.id !== authorId) {
             return interaction.followUp({ content: "لا يمكنك استخدام أزرار هذا الأمر.", ephemeral: true });
          }
          
          let newPage = 1;
          let newTimeframe = '30d';

          if (action === 'time') {
              newTimeframe = idParts[3];
              newPage = 1;
          } else if (action === 'page') {
              newTimeframe = idParts[3];
              newPage = parseInt(idParts[4]) || 1;
          }
          
          const { embed, rows } = await createChannelListStats(db, newPage, authorId, newTimeframe, guildId);
          await interaction.editReply({ embeds: [embed], components: rows }).catch(() => {});
          return;
      }

    } catch (e) {
      console.error("❌ Error handling interaction:", e);
CHANNELS }
  }
}


const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startScheduledTasks(client) {
    setInterval(async () => {
        console.log("⏰ بدء مهمة تحديث إحصائيات الناشرين اليومية (لكل سيرفر)...");
        try {
            for (const guild of client.guilds.cache.values()) {
                const keyScoped = `adChannel:${guild.id}`;
                const row = await db.get("SELECT value FROM config WHERE key = ?", keyScoped);
                const channelId = row?.value;
                
                if (!channelId) {
                    console.log(`- لا توجد قناة إعلانات لسيرفر ${guild.name}، تخطي.`);
                    continue;
                }
                const adChannel = await client.channels.fetch(channelId).catch(() => null);
                if (!adChannel || (adChannel.type !== ChannelType.GuildText && adChannel.type !== ChannelType.GuildAnnouncement)) {
                    console.error(`❌ لا يمكن العثور على قناة الإعلانات (ID: ${channelId}) في سيرفر ${guild.name}`);
                    continue;
                }

                const publishers = await db.all("SELECT userId FROM publishers WHERE guildId = ?", guild.id);
                
                if (publishers.length > 0) {
                     console.log(`- سيرفر ${guild.name}: جارٍ تحديث ${publishers.length} ناشر...`);
                    for (const publisher of publishers) {
                        const targetUser = await client.users.fetch(publisher.userId).catch(() => null);
                        if (!targetUser) {
                            console.log(`-- لا يمكن العثور على الناشر (ID: ${publisher.userId})، تخطي.`);
                            continue;
                        }
                        await sendOrUpdatePublisherAd(client, db, guild.id, targetUser.id, '30d');
                        await delay(1000); 
                    }
                } else {
                    console.log(`- لا يوجد ناشرون مسجلون، تخطي إحصائيات الناشرين لسيرفر ${guild.name}.`);
                }

                console.log(`- سيرفر ${guild.name}: جارٍ تحديث الملخص اليومي (حذف وإعادة إرسال)...`);
                try {
                    const defaultTimeframe = '30d';
                    const summaryEmbed = await createSummaryEmbed(client, db, defaultTimeframe, guild.id);
                    if (summaryEmbed) {
                        const components = buildSummaryComponents(guild.id, defaultTimeframe);
                        const summaryKey = `summaryMessageId:${guild.id}`;
                        const summaryRow = await db.get("SELECT value FROM config WHERE key = ?", summaryKey);
                        const messageId = summaryRow?.value;

                        if (messageId) {
                            try {
                                const oldMsg = await adChannel.messages.fetch(messageId);
s                                await oldMsg.delete();
                            } catch (e) {
                                console.warn(`- فشل حذف ملخص قديم (ID: ${messageId}).`);
                            }
                        }

                        const newMsg = await adChannel.send({ embeds: [summaryEmbed], components: components });
                        await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", summaryKey, newMsg.id);
                    }
                } catch(e) {
                    console.error(`❌ فشل تحديث الملخص اليومي لسيرفر ${guild.name}:`, e);
section              }

            }
        } catch (error) {
            console.error("❌ خطأ فادح في مهمة تحديث الإحصائيات اليومية:", error);
        }
    }, 1000 * 60 * 60 * 24); 

    setInterval(async () => {
        try {
            await sendDailyBackup();
        } catch (error) {
            console.error("❌ Error in 24-hour backup:", error);
        }
    }, 1000 * 60 * 60 * 24); 
}


client.on('guildCreate', async (guild) => {
    console.log(`🆕 البوت انضم إلى سيرفر جديد: ${guild.name} (${guild.id})`);
    await sendGuildJoinNotification(guild);
});

async function startBot() {
    try {
        console.log("Starting bot...");
        await initializeDatabase(); 
        await loadCommands();

        client.once('ready', async (c) => {
            console.log(`✅ ${c.user.tag} جاهز للعمل!`);
            console.log(`📊 عدد السيرفرات: ${client.guilds.cache.size}`);
            
            try {
                const guildId = process.env.GUILD_ID;
                if (guildId) {
                    await client.guilds.cache.get(guildId)?.commands.set(SLASH_COMMANDS);
                    console.log(`✅ Slash commands registered in guild ${guildId}`);
                } else {
                    await client.application.commands.set(SLASH_COMMANDS);
                    console.log("✅ Slash commands registered globally.");
                }
            } catch (err) {
                console.error("❌ Failed to register slash commands:", err);
            }

            console.log("📦 محاولة إرسال نسخة احتياطية عند بدء التشغيل...");
            await sendDailyBackup();

            startScheduledTasks(client);
        });

        client.on('messageCreate', handleMessageCreate);
        client.on('messageDelete', handleMessageDelete);
        client.on('messageUpdate', handleMessageUpdate);
        client.on('interactionCreate', handleInteraction);

        await client.login(TOKEN);
    } catch (e) {
        console.error("❌ Fatal error during bot startup:", e);
        process.exit(1);
        }
    }

    startBot();
