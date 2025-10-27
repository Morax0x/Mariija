import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ChannelType } from "discord.js";
import { createDetailedStatsEmbed, cleanChannelName } from "./utils/embeds.js";
import { getDetailedStatsData, calculatePointsInPeriod, DEFAULT_EMBED_COLOR } from "./index.js";
import { stat } from "fs/promises";

const PAGINATION_LIMIT = 10;
const INVISIBLE_SPACE = '\u200b';
const NEW_SUMMARY_IMAGE = 'https://media.discordapp.net/attachments/1394280285289320550/1432411843086778369/12.jpg?ex=6900f4fc&is=68ffa37c&hm=9277ed32a483ec839dd15bf4eaf5e0f864fae3567621fb25cb8e292d3dc9d429&=&format=webp&width=1872&height=309';

export function createPaginatedListEmbed(title, items, page = 0, pageSize = PAGINATION_LIMIT, customIdPrefix, custom = null) {
    const isEmptyList = items.length === 0;
    const defaultEmptyMessage = "لا توجد عناصر لعرضها حالياً.";
    const actualItems = isEmptyList ? [] : items;
    const totalItems = actualItems.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    page = Math.max(0, Math.min(page, totalPages > 0 ? totalPages - 1 : 0));
    const start = page * pageSize;
    const end = start + pageSize;
    const currentItems = actualItems.slice(start, end);
    let description = isEmptyList ? defaultEmptyMessage : (currentItems.join('\n') || defaultEmptyMessage);
    if (!description || description.trim() === '') { description = INVISIBLE_SPACE; }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(custom?.embed_color || DEFAULT_EMBED_COLOR)
        .setImage(custom?.embed_image || null)
        .setTimestamp();

    if (totalItems > 0) { embed.setFooter({ text: `${page + 1}/${totalPages} | الإجمالي: ${totalItems}` }); }

    const components = [];
    if (totalPages > 1) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`${customIdPrefix}:${page - 1}`).setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('page_indicator').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId(`${customIdPrefix}:${page + 1}`).setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1)
        );
        components.push(row);
    }
    return { embed, components };
}

async function createAdChannelSummaryEmbed(client, db, guildId, currentLang) {
    if (!db || !guildId) return null;
    try {
        const topPublishers = await db.all(`SELECT p.user_id, SUM(cp.points) AS total_points FROM publishers p LEFT JOIN channel_points cp ON p.user_id = cp.user_id AND p.guild_id = cp.guild_id WHERE p.guild_id = ? GROUP BY p.user_id ORDER BY total_points DESC LIMIT 3`, guildId);
        const topChannelsWithPoints = await db.all(`SELECT channel_id, SUM(points) as total_points FROM channel_points WHERE guild_id = ? AND points > 0 GROUP BY channel_id ORDER BY total_points DESC LIMIT 3`, guildId);
        const totalServerPointsResult = await db.get(`SELECT SUM(points) as grand_total FROM channel_points WHERE guild_id = ?`, guildId);
        const totalServerPoints = totalServerPointsResult?.grand_total || 0;
        let description = "✶ اعـلـى الـنـاشـريـن:\n";
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return null;

        if (topPublishers.length > 0) {
            for (let i = 0; i < 3; i++) {
                if (i < topPublishers.length) {
                    const user = client.users.cache.get(topPublishers[i].user_id) || await client.users.fetch(topPublishers[i].user_id).catch(() => null);
                    const userName = user ? `<@${user.id}>` : `[User ${topPublishers[i].user_id}]`;
                    const points = topPublishers[i].total_points || 0;
                    description += `${i + 1} - ${userName} (${points})\n`;
                } else { description += `${i + 1} -\n`; }
            }
        } else { description += "1 -\n2 -\n3 -\n"; }

        description += "\n✶ اعـلـى الـقـنـوات:\n";
        let displayedChannelCount = 0;
        const topChannelIdsWithPoints = new Set();

        if (topChannelsWithPoints.length > 0) {
            for (let i = 0; i < topChannelsWithPoints.length; i++) {
                const channel = guild.channels.cache.get(topChannelsWithPoints[i].channel_id) || await guild.channels.fetch(topChannelsWithPoints[i].channel_id).catch(() => null);
                const channelName = channel ? `<#${channel.id}>` : `[Channel ${topChannelsWithPoints[i].channel_id}]`;
                const points = topChannelsWithPoints[i].total_points || 0;
                description += `${displayedChannelCount + 1} - ${channelName} (${points})\n`;
                topChannelIdsWithPoints.add(topChannelsWithPoints[i].channel_id);
                displayedChannelCount++;
            }
        }

        if (displayedChannelCount < 3) {
            const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
            const monitoredIds = config?.monitored_channels ? config.monitored_channels.split(',') : [];
            for (const channelId of monitoredIds) {
                if (displayedChannelCount >= 3) break;
                if (channelId && !topChannelIdsWithPoints.has(channelId)) {
                     const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
                     if (!channel || channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildCategory) continue;
                     const channelName = `<#${channel.id}>`;
                     description += `${displayedChannelCount + 1} - ${channelName} (0)\n`;
                     displayedChannelCount++;
                }
            }
        }

        for (let i = displayedChannelCount; i < 3; i++) { description += `${i + 1} -\n`; }

        description += `\n✶ مـجمـوع نـقـاط الـسيـرفـر: ${totalServerPoints}`;
        let topPublisherUser = null;
        if (topPublishers.length > 0) { topPublisherUser = client.users.cache.get(topPublishers[0].user_id) || await client.users.fetch(topPublishers[0].user_id).catch(() => null); }

        const embed = new EmbedBuilder()
            .setTitle("✥ احـصـائيـات النـاشريـن")
            .setDescription(description)
            .setColor(0xFF0000)
            .setImage(NEW_SUMMARY_IMAGE)
            .setTimestamp();
        if (topPublisherUser) { embed.setThumbnail(topPublisherUser.displayAvatarURL({ dynamic: true, size: 256 })); }
        return embed;
    } catch (error) { console.error(`[Summary Embed] Error creating summary for guild ${guildId}:`, error); return null; }
}

async function updateIndividualPublisherMessages(client, db, currentLang) {
    if (!db) { console.error("[Task] updateIndividualPublisherMessages: DB connection invalid."); return; }
    console.log("[Task] Starting individual publisher message update task...");
    let updatedCount = 0; let errorCount = 0;
    try {
        const publishersToUpdate = await db.all(`SELECT p.user_id, p.guild_id, p.ad_message_id, c.ad_channel_id FROM publishers p JOIN config c ON p.guild_id = c.guild_id WHERE c.ad_channel_id IS NOT NULL`);
        console.log(`[Task] Found ${publishersToUpdate.length} publishers in guilds with ad channels.`);
        for (const pub of publishersToUpdate) {
            let channel = null; let messageToEdit = null;
            try {
                channel = client.channels.cache.get(pub.ad_channel_id) || await client.channels.fetch(pub.ad_channel_id).catch(() => null);
                if (!channel || !channel.isTextBased()) { errorCount++; continue; }
                if (pub.ad_message_id) { messageToEdit = await channel.messages.fetch(pub.ad_message_id).catch(() => null); }
                const guild = client.guilds.cache.get(pub.guild_id) || await client.guilds.fetch(pub.guild_id).catch(() => null);
                if (!guild) { errorCount++; continue; }
                const targetUser = client.users.cache.get(pub.user_id) || await client.users.fetch(pub.user_id).catch(() => null);
                if (!targetUser) { errorCount++; continue; }
                const { pointsData, dateData, monitoredChannels } = await getDetailedStatsData(pub.user_id, pub.guild_id, 0);
                const { embed, components } = await createDetailedStatsEmbed(targetUser, guild, currentLang, 0, pointsData, dateData, monitoredChannels, 0);
                if (messageToEdit) {
                    await messageToEdit.edit({ embeds: [embed], components: components }).catch(async (e) => {
                         if (e.code === 10008) {
                             console.warn(`[Task] Ad message ${pub.ad_message_id} not found for ${targetUser.tag}. Posting new one.`);
                             const newMessage = await channel.send({ embeds: [embed], components: components });
                             await db.run("UPDATE publishers SET ad_message_id = ? WHERE guild_id = ? AND user_id = ?", newMessage.id, pub.guild_id, pub.user_id);
                         } else { throw e; }
                    });
                    updatedCount++;
                } else {
                    const newMessage = await channel.send({ embeds: [embed], components: components });
                    await db.run("UPDATE publishers SET ad_message_id = ? WHERE guild_id = ? AND user_id = ?", newMessage.id, pub.guild_id, pub.user_id);
                    updatedCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                errorCount++; console.error(`[Task] Failed processing publisher ${pub.user_id} (Msg: ${pub.ad_message_id}):`, e.message);
                if (e.code === 429) { console.warn("[Task] Rate limit hit! Pausing..."); await new Promise(resolve => setTimeout(resolve, e.retry_after * 1000 || 5000)); console.warn("[Task] Resuming updates..."); }
                else if (e.code === 10008 && db) {
                     console.warn(`[Task] Ad message ${pub.ad_message_id} not found (on error). Clearing ID for ${pub.user_id}.`);
                     await db.run("UPDATE publishers SET ad_message_id = NULL WHERE guild_id = ? AND user_id = ?", pub.guild_id, pub.user_id).catch(dbErr => console.error("DB Error clearing missing ad_message_id:", dbErr));
                 }
            }
        }
    } catch (error) { console.error("[Task] General error fetching publishers for update:", error); errorCount++; }
    console.log(`[Task] Finished individual publisher message update. Updated/Created: ${updatedCount}, Errors: ${errorCount}`);
}

export async function updateAllTopLists(client, db, currentLang) {
    if (!db) { console.error("[Task] updateAllTopLists: DB connection invalid."); return; }
    console.log("[Task] Starting summary list update task...");
    try {
        const allConfigs = await db.all("SELECT guild_id, ad_channel_id, top_list_message_id FROM config WHERE ad_channel_id IS NOT NULL");
        for (const config of allConfigs) {
            let channel = null; let summaryMessage = null;
            try {
                channel = client.channels.cache.get(config.ad_channel_id) || await client.channels.fetch(config.ad_channel_id).catch(() => null);
                if (!channel || !channel.isTextBased()) { continue; }
                const summaryEmbed = await createAdChannelSummaryEmbed(client, db, config.guild_id, currentLang);
                if (!summaryEmbed) continue;
                if (config.top_list_message_id) { summaryMessage = await channel.messages.fetch(config.top_list_message_id).catch(() => null); }
                if (summaryMessage) {
                    await summaryMessage.edit({ embeds: [summaryEmbed], components: [] }).catch(async (e) => {
                         if (e.code === 10008) {
                             console.warn(`[Task] Summary message ${config.top_list_message_id} not found for guild ${config.guild_id}. Posting new one.`);
                             const newMessage = await channel.send({ embeds: [summaryEmbed], components: [] });
                             await db.run("UPDATE config SET top_list_message_id = ? WHERE guild_id = ?", newMessage.id, config.guild_id);
                         } else { throw e; }
                    });
                } else {
                    const newMessage = await channel.send({ embeds: [summaryEmbed], components: [] });
                    await db.run("UPDATE config SET top_list_message_id = ? WHERE guild_id = ?", newMessage.id, config.guild_id);
                }
                 await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                 console.error(`[Task] Failed updating summary list for guild ${config.guild_id}:`, e.message);
                 if (e.code === 10008 && db) {
                      console.warn(`[Task] Summary message ${config.top_list_message_id} not found (on error). Clearing ID for guild ${config.guild_id}.`);
                      await db.run("UPDATE config SET top_list_message_id = NULL WHERE guild_id = ?", config.guild_id).catch(dbErr => console.error("DB Error clearing missing top_list_message_id:", dbErr));
                 }
            }
        }
    } catch (error) { console.error("[Task] Error fetching configs in updateAllTopLists:", error); }
    console.log("[Task] Finished summary list update task.");
}


export async function sendDailyBackup(client, dbPath, ownerId) {
    console.log("[Task] Attempting to start daily backup task...");
    if (!dbPath || !ownerId) { console.error("[Backup Error] dbPath or ownerId is missing!"); return; }
    if (!client || !client.isReady()) { console.error("[Backup Error] Client is not ready or invalid."); return; }
    try { await stat(dbPath); console.log(`[Backup] Database file found at: ${dbPath}`); }
    catch (fileError) { console.error(`[Backup Error] Database file not found or inaccessible at path: ${dbPath}`, fileError); return; }
    let owner = null;
    try { owner = client.users.cache.get(ownerId) || await client.users.fetch(ownerId); if (!owner) { console.error(`[Backup Error] Owner with ID ${ownerId} could not be fetched or found!`); return; } console.log(`[Backup] Owner found: ${owner.tag}`); }
    catch (fetchError) { console.error(`[Backup Error] Failed to fetch owner with ID ${ownerId}:`, fetchError); return; }
    try {
        const attachment = new AttachmentBuilder(dbPath, { name: 'publisher_stats2.db' });
        await owner.send({ content: `**النسخ الاحتياطي اليومي لقاعدة البيانات** 💾\nالتاريخ: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })}`, files: [attachment] });
        console.log("[Task] ✅ Backup sent successfully.");
    } catch (sendError) { console.error("[Backup Error] Failed to send backup DM to owner:", sendError.message); if (sendError.code === 50007) { console.error("[Backup Error] Hint: Cannot send DMs to this user. Check Privacy Settings or if the bot is blocked."); } }
}


export function startScheduledTasks(client, getDb, currentLang, dbPath, ownerId) {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const initialDelay = 5000;
    const backupDelay = 10000;
    const individualUpdateDelay = 20000;
    const summaryUpdateDelay = 30000;

    const safelyRunTask = async (taskFunction, taskName, ...args) => {
        if (!client || !client.isReady()) { console.warn(`[Task Scheduler] Client not ready, skipping ${taskName} execution.`); return; }
        console.log(`[Task Scheduler] Running task: ${taskName}`);
        try {
            const currentDb = getDb();
            if (!currentDb && taskName !== "Daily Backup" && taskName !== "Initial Backup") { console.error(`[Task Scheduler] Cannot run ${taskName}: DB connection not available.`); return; }
            if (taskName.includes("Backup")) { await taskFunction(client, ...args); }
            else { await taskFunction(client, currentDb, ...args); }
            console.log(`[Task Scheduler] Finished task: ${taskName}`);
        } catch (error) { console.error(`[Task Scheduler] Error executing ${taskName}:`, error); }
    };

    console.log(`[Task Scheduler] Scheduling initial tasks...`);
    setTimeout(() => safelyRunTask(sendDailyBackup, "Initial Backup", dbPath, ownerId), backupDelay);
    setTimeout(() => safelyRunTask(updateIndividualPublisherMessages, "Initial Individual Update", currentLang), individualUpdateDelay);
    setTimeout(() => safelyRunTask(updateAllTopLists, "Initial Summary Update", currentLang), summaryUpdateDelay);

    console.log(`[Task Scheduler] Setting up intervals for daily tasks...`);
    setInterval(() => safelyRunTask(sendDailyBackup, "Daily Backup", dbPath, ownerId), twentyFourHours);
    setInterval(() => safelyRunTask(updateIndividualPublisherMessages, "Daily Individual Update", currentLang), twentyFourHours + 5000);
    setInterval(() => safelyRunTask(updateAllTopLists, "Daily Summary Update", currentLang), twentyFourHours + 10000);
    console.log(`[Task Scheduler] Daily intervals set.`);
}


export async function postPublisherStatsToAdChannel(client, db, user, guildId, currentLang) {
    if (!db) { console.error("[AdChannel] DB connection invalid."); return; }
    const config = await db.get("SELECT ad_channel_id, top_list_message_id FROM config WHERE guild_id = ?", guildId);
    if (!config || !config.ad_channel_id) return;
    try {
        const channel = client.channels.cache.get(config.ad_channel_id) || await client.channels.fetch(config.ad_channel_id).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;
        const { pointsData, dateData, monitoredChannels } = await getDetailedStatsData(user.id, guildId, 0);
        const { embed, components } = await createDetailedStatsEmbed(user, guild, currentLang, 0, pointsData, dateData, monitoredChannels, 0);
        const newMessage = await channel.send({ embeds: [embed], components: components });
        await db.run("UPDATE publishers SET ad_message_id = ? WHERE guild_id = ? AND user_id = ?", newMessage.id, guildId, user.id);
        if (config.top_list_message_id) {
            await channel.messages.delete(config.top_list_message_id).catch(err => { if (err.code !== 10008) console.error(`[AdChannel] Error deleting old summary message: ${err.message}`); });
            await db.run("UPDATE config SET top_list_message_id = NULL WHERE guild_id = ?", guildId);
        }
        const summaryEmbed = await createAdChannelSummaryEmbed(client, db, guildId, currentLang);
        if (summaryEmbed) {
            const newSummaryMessage = await channel.send({ embeds: [summaryEmbed], components: [] });
            await db.run("UPDATE config SET top_list_message_id = ? WHERE guild_id = ?", newSummaryMessage.id, guildId);
        }
    } catch (e) { console.error(`[AdChannel] Failed posting new publisher stats (${user.tag}) or handling summary: ${e.message}`, e); }
}