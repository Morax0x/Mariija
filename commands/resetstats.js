// 📁 commands/resetstats.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    deletePublisherAdMessage, // ⬅️ دالة محدثة
    getStartDateForTimeframe
} from '../utils.js';
import { MessageFlags } from 'discord.js';

const timeframeRegex = /^(1d|7d|14d|30d)$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export default {
    name: 'resetstats',
    description: '[إدارة] إعادة تعيين نقاط ناشر.',
    adminOnly: true, 

    async execute(client, interactionOrMessage, args, db) {
        
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        const guildId = interactionOrMessage.guildId; // ⬅️ جلب ID السيرفر
        let targetUser;
        let channelsInputString; 

        if (interactionOrMessage.user) { 
            targetUser = interactionOrMessage.options.getUser('user');
            channelsInputString = interactionOrMessage.options.getString('channels');
        } else { 
            const mentionedUser = interactionOrMessage.mentions.users.first();
            const userArg = args[0]?.match(/\d{17,19}/g)?.[0]; 

            if (mentionedUser) {
                targetUser = mentionedUser;
            } else if (userArg) {
                targetUser = await client.users.fetch(userArg).catch(() => null);
            }

            if (!targetUser) {
                return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "يجب تحديد المستخدم (منشن أو ID) أولاً.", "Red")] });
            }
            channelsInputString = args.slice(1).join(' ').trim() || null; 
        }

        if (!targetUser) {
             return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لم يتم العثور على المستخدم المحدد.", "Red")], flags: MessageFlags.Ephemeral });
        }

        // ⬅️ (فلترة حسب السيرفر)
        const isPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", targetUser.id, guildId);
        if (!isPublisher) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "🤔", `المستخدم ${targetUser.tag} ليس ناشراً مسجلاً بالأصل.`, "Yellow")], flags: MessageFlags.Ephemeral });
        }

        if (interactionOrMessage.user) {
            await interactionOrMessage.deferReply({ ephemeral: true });
        }

        try {
            // --- (الخيار 1: الحذف الكامل "all") ---
            if (channelsInputString && channelsInputString.toLowerCase() === 'all') {
                
                // ⬅️ (الحذف مع guildId)
                await db.run("DELETE FROM publishers WHERE userId = ? AND guildId = ?", targetUser.id, guildId);
                // ⬅️ (الدالة المساعدة محدثة وتستخدم guildId)
                await deletePublisherAdMessage(client, db, guildId, targetUser.id);

                return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "🗑️ تم الحذف بالكامل", LANG.ar.SUCCESS_STATS_RESET_ALL.replace("{tag}", targetUser.tag) , "Green")]
                });
            }

            // --- (الخيار 2: حذف مدة زمنية (1d, 7d...)) ---
            if (channelsInputString && timeframeRegex.test(channelsInputString)) {
                const timeframe = channelsInputString.toLowerCase();
                const startDate = getStartDateForTimeframe(timeframe); 

                // ⬅️ (فلترة حسب السيرفر)
                const pointsToSubtractByChannel = await db.all(
                    "SELECT channelId, SUM(mediaCount) as loss FROM post_log WHERE userId = ? AND timestamp >= ? AND guildId = ? GROUP BY channelId",
                    targetUser.id, startDate, guildId
                );

                if (pointsToSubtractByChannel.length === 0) {
                     return replyOrFollowUp(interactionOrMessage, {
                        embeds: [embedSimple(client, "🤔", `الناشر **${targetUser.tag}** ليس لديه أي نقاط مسجلة في آخر ${timeframe}.`, "Yellow")]
                    });
                }

                let totalLoss = 0;
                for (const item of pointsToSubtractByChannel) {
                    totalLoss += item.loss;
                    // ⬅️ (تحديث مع guildId)
                    await db.run(
                        "UPDATE stats SET points = MAX(0, points - ?), messageCount = MAX(0, messageCount - ?) WHERE userId = ? AND channelId = ? AND guildId = ?",
                        item.loss, item.loss, targetUser.id, item.channelId, guildId
                    );
                }
                // ⬅️ (الحذف مع guildId)
                await db.run("DELETE FROM post_log WHERE userId = ? AND timestamp >= ? AND guildId = ?", targetUser.id, startDate, guildId);

                return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "♻️ تم تصفير المدة", `تم حذف **${totalLoss}** نقطة من الناشر **${targetUser.tag}** (الخاصة بآخر ${timeframe}).`, "Green")]
                });
            }

            // --- (الخيار 3: حذف يوم محدد YYYY-MM-DD) ---
            if (channelsInputString && dateRegex.test(channelsInputString)) {
                const specificDateStr = channelsInputString;
                const startDate = new Date(specificDateStr);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                const startISO = startDate.toISOString();
                const endISO = endDate.toISOString();

                // ⬅️ (فلترة حسب السيرفر)
                const pointsToSubtractByChannel = await db.all(
                    "SELECT channelId, SUM(mediaCount) as loss FROM post_log WHERE userId = ? AND timestamp >= ? AND timestamp < ? AND guildId = ? GROUP BY channelId",
                    targetUser.id, startISO, endISO, guildId
                );

                if (pointsToSubtractByChannel.length === 0) {
                     return replyOrFollowUp(interactionOrMessage, {
                        embeds: [embedSimple(client, "🤔", `الناشر **${targetUser.tag}** ليس لديه أي نقاط مسجلة في يوم ${specificDateStr}.`, "Yellow")]
                    });
                }

                let totalLoss = 0;
                for (const item of pointsToSubtractByChannel) {
                    totalLoss += item.loss;
                    // ⬅️ (تحديث مع guildId)
                    await db.run(
                        "UPDATE stats SET points = MAX(0, points - ?), messageCount = MAX(0, messageCount - ?) WHERE userId = ? AND channelId = ? AND guildId = ?",
                        item.loss, item.loss, targetUser.id, item.channelId, guildId
                    );
                }
                // ⬅️ (الحذف مع guildId)
                await db.run("DELETE FROM post_log WHERE userId = ? AND timestamp >= ? AND timestamp < ? AND guildId = ?", targetUser.id, startISO, endISO, guildId);

                return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "♻️ تم تصفير اليوم", `تم حذف **${totalLoss}** نقطة من الناشر **${targetUser.tag}** (الخاصة بيوم ${specificDateStr}).`, "Green")]
                });
            }


            // --- (الخيار 4: حذف قنوات معينة) ---
            let channelIdsToReset = [];
            if (channelsInputString) {
                const ids = channelsInputString.match(/\d{17,19}/g) || [];
                
                if (ids.length > 0) {
                    // ⬅️ (فلترة حسب السيرفر)
                    const monitoredChannels = await db.all("SELECT channelId FROM channels WHERE guildId = ?", guildId);
                    const monitoredSet = new Set(monitoredChannels.map(c => c.channelId));
                    channelIdsToReset = ids.filter(id => monitoredSet.has(id));
                }

                if (channelIdsToReset.length > 0) {
                    const placeholders = channelIdsToReset.map(() => '?').join(',');
                    // ⬅️ (الحذف مع guildId)
                    await db.run(`DELETE FROM stats WHERE userId = ? AND guildId = ? AND channelId IN (${placeholders})`, [targetUser.id, guildId, ...channelIdsToReset]);
                    await db.run(`DELETE FROM post_log WHERE userId = ? AND guildId = ? AND channelId IN (${placeholders})`, [targetUser.id, guildId, ...channelIdsToReset]);
                    
                    const channelMentions = channelIdsToReset.map(id => `<#${id}>`).join('\n');
                    return replyOrFollowUp(interactionOrMessage, {
                        embeds: [embedSimple(client, "♻️ تم التصفير الجزئي", `تم تصفير نقاط الناشر **${targetUser.tag}** في القنوات التالية:\n${channelMentions}`, "Green")]
                    });
                } else {
                    return replyOrFollowUp(interactionOrMessage, {
                        embeds: [embedSimple(client, "❌ خطأ", "صيغة غير مفهومة. استخدم `all`، أو `1d`/`7d`، أو `YYYY-MM-DD`، أو منشن/ID قنوات.", "Red")]
                    });
                }
            }

            // --- (الخيار 5: الافتراضي - تصفير كل القنوات) ---
            if (!channelsInputString) {
                // ⬅️ (الحذف مع guildId)
                await db.run("DELETE FROM stats WHERE userId = ? AND guildId = ?", targetUser.id, guildId);
                await db.run("DELETE FROM post_log WHERE userId = ? AND guildId = ?", targetUser.id, guildId);

                return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "♻️ تم التصفير", LANG.ar.SUCCESS_STATS_RESET_USER.replace("{tag}", targetUser.tag), "Green")]
                });
            }

        } catch (e) {
            console.error("Error in resetstats:", e);
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء محاولة التصفير في قاعدة البيانات.", "Red")] });
        }
    }
};
