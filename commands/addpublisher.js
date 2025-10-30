// 📁 commands/addpublisher.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    sendOrUpdatePublisherAd, // ⬅️ الدالة المحدثة
    createSummaryEmbed,
    getGuildAdChannelId,
    buildSummaryComponents
} from '../utils.js';
import { MessageFlags, EmbedBuilder, ChannelType } from 'discord.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default {
    name: 'addpublisher',
    description: '[إدارة] إضافة ناشر رسمي (أو عدة ناشرين).',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        const guild = interactionOrMessage.guild;
        if (!guild) return; // (تم التحقق منه في index.js)

        let usersInputString;

        if (interactionOrMessage.user) { 
            usersInputString = interactionOrMessage.options.getString('users');
            await interactionOrMessage.deferReply({ ephemeral: true });
        } else { 
            usersInputString = args.join(' ');
        }

        const userIds = usersInputString.match(/\d{17,19}/g) || [];

        if (userIds.length === 0) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لم يتم تحديد أي مستخدمين (منشن أو ID).", "Red")], flags: MessageFlags.Ephemeral });
        }

        let added = 0;
        let already = 0;
        let failedFetch = 0;
        let dbErrors = 0;
        const addedMembersList = []; // (للتحديث البطيء)
        const addedMentions = []; // (للرد)
        const failedMentions = [];

        for (const userId of userIds) {
            try {
                const user = await client.users.fetch(userId);
                if (user.bot) {
                    failedMentions.push(`<@${userId}> (لا يمكن إضافة بوت)`);
                    continue;
                }
                
                // ⬅️ (فلترة حسب السيرفر)
                const existing = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", user.id, guild.id);
                if (existing) {
                    already++;
                    failedMentions.push(`<@${user.id}> ${LANG.ar.PUBLISHER_ADD_FAIL_ALREADY}`);
                } else {
                    // ⬅️ (إضافة مع guildId)
                    await db.run("INSERT INTO publishers (guildId, userId, tag, joinDate) VALUES (?, ?, ?, ?)", 
                        guild.id, user.id, user.tag, new Date().toISOString()
                    );
                    added++;
                    addedMembersList.push(user.id);
                    if (addedMentions.length < 25) {
                        addedMentions.push(`<@${user.id}>`);
                    }
                }
            } catch (e) {
                if (e.code === 10013) { // Unknown User
                    failedFetch++;
                    failedMentions.push(`\`${userId}\` ${LANG.ar.PUBLISHER_ADD_FAIL_FETCH}`);
                } else {
                    dbErrors++;
                    failedMentions.push(`\`${userId}\` ${LANG.ar.PUBLISHER_ADD_FAIL_DB}`);
                    console.error("Error adding publisher:", e);
                }
            }
        }

        if (added === 0 && failedMentions.length === 0 && already === 0) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", LANG.ar.ERROR_PUBLISHERS_ADD_NONE.description, "Red")], flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setTitle(LANG.ar.SUCCESS_PUBLISHERS_ADDED_TITLE)
            .setColor(0x3BA55D)
            .setTimestamp();
            
        if (added > 0) {
            embed.addFields({ name: `✅ تمت إضافة (${added}) ناشر:`, value: addedMentions.join('\n') });
        }
        if (failedMentions.length > 0) {
            embed.addFields({ name: `⚠️ فشل إضافة (${failedMentions.length}):`, value: failedMentions.join('\n') });
        }
        if (dbErrors > 0) {
             embed.addFields({ name: "أخطاء قاعدة بيانات", value: `${dbErrors}` });
        }

        await replyOrFollowUp(interactionOrMessage, { embeds: [embed], flags: MessageFlags.Ephemeral });

        // --- (التحديث البطيء لقناة الإعلانات) ---
        if (addedMembersList.length > 0) {
            const adChannelId = await getGuildAdChannelId(db, guild.id);
            const adChannel = adChannelId ? await client.channels.fetch(adChannelId).catch(() => null) : null;
            
            if (adChannel) {
                console.log(`[AdChannel] بدء تحديث ${addedMembersList.length} ناشر مضاف حديثاً...`);
                for (const memberId of addedMembersList) {
                    // ⬅️ (تمرير guildId)
                    await sendOrUpdatePublisherAd(client, db, guild.id, memberId, '30d').catch(() => {});
                    await delay(2000); // (تأخير ثانيتين لتجنب الحظر)
                }
                
                // تحديث الملخص (مرة واحدة)
                const defaultTimeframe = '30d';
                // ⬅️ (تمرير guildId)
                const summary = await createSummaryEmbed(client, db, defaultTimeframe, guild.id).catch(() => null);
                if (summary) {
                    const components = buildSummaryComponents(guild.id, defaultTimeframe);
                    const summaryKey = `summaryMessageId:${guild.id}`;
                    const summaryRow = await db.get("SELECT value FROM config WHERE key = ?", summaryKey);

                    if (summaryRow?.value) {
                        try {
                            const oldMsg = await adChannel.messages.fetch(summaryRow.value);
                            await oldMsg.delete();
                        } catch (e) {}
                    }
                    const newMsg = await adChannel.send({ embeds: [summary], components: components });
                    await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", summaryKey, newMsg.id);
                }
                console.log("[AdChannel] اكتمل تحديث الناشرين.");
            }
        }
    }
};
