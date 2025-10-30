// 📁 commands/stats.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    getAuthorId,
    createPaginatedStatsEmbed, // ⬅️ دالة محدثة
    createChannelStatsEmbed  // ⬅️ دالة محدثة
} from '../utils.js';

import { ChannelType } from 'discord.js';

export default {
    name: 'stats',
    description: 'عرض إحصائيات ناشر (أو إحصائياتك إذا لم تمنشن).',

    async execute(client, interactionOrMessage, args, db) {

        let targetUser;
        let targetChannel;
        const author = interactionOrMessage.user || interactionOrMessage.author;
        const guildId = interactionOrMessage.guildId; // ⬅️ جلب ID السيرفر

        if (interactionOrMessage.user) { // Slash command
            targetUser = interactionOrMessage.options.getUser('user') || author;
            targetChannel = interactionOrMessage.options.getChannel('channel');
        
        } else { // Prefix command
            const mentionedUser = interactionOrMessage.mentions.users.first();
            const mentionedChannel = interactionOrMessage.mentions.channels.first();

            let userArg = null;
            let channelArg = null;

            const arg0 = args[0]?.match(/\d{17,19}/g)?.[0];
            const arg1 = args[1]?.match(/\d{17,19}/g)?.[0];

            if (mentionedUser) {
                userArg = mentionedUser;
                if (mentionedChannel) {
                    channelArg = mentionedChannel;
                } else if (arg1) {
                    channelArg = await client.channels.fetch(arg1).catch(() => null);
                }
            } 
            else if (arg0) {
                const fetchedUser = await client.users.fetch(arg0).catch(() => null);
                if (fetchedUser) {
                    userArg = fetchedUser;
                    if (mentionedChannel) {
                        channelArg = mentionedChannel;
                    } else if (arg1) {
                        channelArg = await client.channels.fetch(arg1).catch(() => null);
                    }
                } else {
                    channelArg = await client.channels.fetch(arg0).catch(() => null);
                    userArg = author;
                }
            }

            targetUser = userArg || author;
            targetChannel = channelArg || (mentionedChannel && !userArg ? mentionedChannel : null);
        }

        // --- التحقق من الناشر (صاحب الأمر) ---
        if (targetUser.id === author.id) {
            // ⬅️ (فلترة حسب السيرفر)
            const isAuthorPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", author.id, guildId);
            if (!isAuthorPublisher) {
                 return replyOrFollowUp(interactionOrMessage, {
                     embeds: [embedSimple(client, 
                         LANG.ar.ERROR_STATS_SELF_NOT_PUBLISHER.title, 
                         LANG.ar.ERROR_STATS_SELF_NOT_PUBLISHER.description, 
                         "Red"
                     )]
                 });
            }
        }

        // --- التحقق من الناشر (المستهدف) ---
        // ⬅️ (فلترة حسب السيرفر)
        const isTargetPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", targetUser.id, guildId);
        if (!isTargetPublisher) {
             return replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, LANG.ar.ERROR_NO_STATS_TITLE.replace("{tag}", targetUser.tag), LANG.ar.ERROR_NO_STATS, "Red")] 
            });
        }

        // --- حالة عرض إحصائيات قناة محددة ---
        if (targetChannel) {
             if(targetChannel.type === ChannelType.GuildForum){
                  return replyOrFollowUp(interactionOrMessage, { 
                      embeds: [embedSimple(client, "💡 تنبيه", `لعرض إحصائيات البوستات داخل المنتدى ${targetChannel.toString()}، استخدم الأمر بدون تحديد قناة.`, "Blue")] 
                  });
             }

            // ⬅️ (فلترة حسب السيرفر)
            const isMonitored = await db.get("SELECT 1 FROM channels WHERE channelId = ? AND guildId = ?", targetChannel.id, guildId);
            if (!isMonitored) {
                return replyOrFollowUp(interactionOrMessage, { 
                    embeds: [embedSimple(client, LANG.ar.ERROR_CHANNEL_NOT_MONITORED.title, LANG.ar.ERROR_CHANNEL_NOT_MONITORED.description, "Yellow")] 
                });
            }
            // ⬅️ (تمرير guildId)
            const embed = await createChannelStatsEmbed(client, db, targetChannel.id, targetChannel, targetUser, guildId);
            return replyOrFollowUp(interactionOrMessage, { embeds: [embed] });
        }

        // --- حالة عرض الإحصائيات الكاملة (مع الأزرار الزمنية) ---
        const requestAuthorId = getAuthorId(interactionOrMessage); 
        const defaultTimeframe = '30d';

        // ⬅️ (تمرير guildId)
        const { embed, rows } = await createPaginatedStatsEmbed(
            client, 
            db, 
            targetUser, 
            1, // page
            requestAuthorId, 
            defaultTimeframe,
            'stats',
            guildId // ⬅️ الإضافة الجديدة
        ); 

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], components: rows });
    }
};
