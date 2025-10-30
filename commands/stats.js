// 📁 commands/stats.js (النسخة 6.0 - تستدعي الأزرار الزمنية)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    getAuthorId,
    createPaginatedStatsEmbed, // ⬅️ الدالة المحدثة
    createChannelStatsEmbed 
} from '../utils.js';

import { ChannelType } from 'discord.js';

export default {
    name: 'stats',
    description: 'عرض إحصائيات ناشر (أو إحصائياتك إذا لم تمنشن).',
    // هذا الأمر متاح للجميع

    async execute(client, interactionOrMessage, args, db) {

        let user; // المستخدم المستهدف لعرض الإحصائيات
        const author = interactionOrMessage.user || interactionOrMessage.author; // صاحب الأمر

        // 1. جلب المستخدم من المنشن/الخيار أولاً
        const mentionedUser = (interactionOrMessage.user)
            ? interactionOrMessage.options.getUser('user') 
            : interactionOrMessage.mentions.users.first();

        const channel = (interactionOrMessage.user)
            ? interactionOrMessage.options.getChannel('channel')
            : interactionOrMessage.mentions.channels.filter(c => 
                c.type === ChannelType.GuildText || 
                c.type === ChannelType.GuildAnnouncement || 
                c.type === ChannelType.PublicThread ||
                c.type === ChannelType.PrivateThread ||
                c.type === ChannelType.AnnouncementThread ||
                c.type === ChannelType.GuildForum 
                ).first(); 

        // 2. إذا تم منشن/اختيار مستخدم، استخدمه
        if (mentionedUser) {
            user = mentionedUser;
        } 
        // 3. إذا لم يتم المنشن/الاختيار، استخدم صاحب الأمر
        else {
            user = author; 

            const isAuthorPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ?", user.id);

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

        // --- باقي الكود ---

        const isTargetPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ?", user.id);
        if (!isTargetPublisher) {
             return replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, LANG.ar.ERROR_NO_STATS_TITLE.replace("{tag}", user.tag), LANG.ar.ERROR_NO_STATS, "Red")] 
            });
        }

        // --- حالة عرض إحصائيات قناة محددة ---
        // (ملاحظة: هذي بتظل تعرض "ALL" لأننا ما عدلنا دالة createChannelStatsEmbed)
        if (channel) {
             if(channel.type === ChannelType.GuildForum){
                  return replyOrFollowUp(interactionOrMessage, { 
                      embeds: [embedSimple(client, "💡 تنبيه", `لعرض إحصائيات البوستات داخل المنتدى ${channel.toString()}، استخدم الأمر بدون تحديد قناة.`, "Blue")] 
                  });
             }

            const isMonitored = await db.get("SELECT 1 FROM channels WHERE channelId = ?", channel.id);
            if (!isMonitored) {
                return replyOrFollowUp(interactionOrMessage, { 
                    embeds: [embedSimple(client, LANG.ar.ERROR_CHANNEL_NOT_MONITORED.title, LANG.ar.ERROR_CHANNEL_NOT_MONITORED.description, "Yellow")] 
                });
            }
            const embed = await createChannelStatsEmbed(client, db, channel.id, channel, user);
            return replyOrFollowUp(interactionOrMessage, { embeds: [embed] });
        }

        // --- حالة عرض الإحصائيات الكاملة (مع الأزرار الزمنية) ---

        // ⬇️ --- هذا هو التصليح --- ⬇️

        const requestAuthorId = getAuthorId(interactionOrMessage); 
        const defaultTimeframe = '30d'; // ⬅️ الإطار الزمني الافتراضي (30 يوم)

        // نستدعي الدالة الجديدة ونطلب "rows" (صفين أزرار)
        const { embed, rows } = await createPaginatedStatsEmbed(
            client, 
            db, 
            user, 
            1, // page
            requestAuthorId, 
            defaultTimeframe
        ); 

        // نرسل الرد مع "rows" (الصفين)
        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], components: rows });

        // ⬆️ --- نهاية التصليح --- ⬆️
    }
};