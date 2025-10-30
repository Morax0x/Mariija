// 📁 commands/resetstats.js (النسخة 1.0 - يدعم ID/Mention)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    deletePublisherAdMessage // ⬅️ نستوردها لحذف رسالته عند الحذف الكامل
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'resetstats',
    description: 'إعادة تعيين نقاط ناشر.',
    adminOnly: true, // ⬅️ هذا الأمر للمشرفين فقط

    async execute(client, interactionOrMessage, args, db) {
        
        // 1. التحقق من الصلاحيات
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        let targetUser;
        let channelsInputString; // هذا سيحتوي على "all" أو "#ch1 #ch2" أو null

        // 2. تحليل الأوامر (سلاش أو بريفكس)
        if (interactionOrMessage.user) { 
            // --- حالة السلاش ---
            targetUser = interactionOrMessage.options.getUser('user');
            channelsInputString = interactionOrMessage.options.getString('channels'); // "all" أو "id1 id2"
        } else { 
            // --- حالة البريفكس ---
            const mentionedUser = interactionOrMessage.mentions.users.first();
            const userArg = args[0]?.match(/\d{17,19}/g)?.[0]; // أول ID في الرسالة

            if (mentionedUser) {
                targetUser = mentionedUser;
            } else if (userArg) {
                targetUser = await client.users.fetch(userArg).catch(() => null);
            }

            if (!targetUser) {
                return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "يجب تحديد المستخدم (منشن أو ID) أولاً.", "Red")] });
            }

            // باقي الحجج هي القنوات أو كلمة "all"
            channelsInputString = args.slice(1).join(' ').trim() || null; 
        }

        // 3. التحقق من الناشر
        if (!targetUser) {
             return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لم يتم العثور على المستخدم المحدد.", "Red")], flags: MessageFlags.Ephemeral });
        }

        const isPublisher = await db.get("SELECT 1 FROM publishers WHERE userId = ?", targetUser.id);
        if (!isPublisher) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "🤔", `المستخدم ${targetUser.tag} ليس ناشراً مسجلاً بالأصل.`, "Yellow")], flags: MessageFlags.Ephemeral });
        }

        // تأجيل الرد (فقط للسلاش)
        if (interactionOrMessage.user) {
            await interactionOrMessage.deferReply({ ephemeral: true });
        }

        try {
            // --- (الخيار 1: الحذف الكامل) ---
            if (channelsInputString && channelsInputString.toLowerCase() === 'all') {
                
                // الحذف من جدول الناشرين سيؤدي إلى حذف سجلاته (CASCADE)
                await db.run("DELETE FROM publishers WHERE userId = ?", targetUser.id);
                
                // (اختياري ولكن محبذ) حذف رسالته من قناة الإعلانات
                await deletePublisherAdMessage(client, db, interactionOrMessage.guildId, targetUser.id);

                return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "🗑️ تم الحذف بالكامل", LANG.ar.SUCCESS_STATS_RESET_ALL.replace("{tag}", targetUser.tag) , "Green")]
                });
            }

            // --- (الخيار 2: حذف قنوات معينة) ---
            let channelIdsToReset = [];
            if (channelsInputString) {
                // استخراج كل الـ IDs من النص
                const ids = channelsInputString.match(/\d{17,19}/g) || [];
                
                if (ids.length > 0) {
                    // نتأكد أن هذه القنوات مراقبة
                    const monitoredChannels = await db.all("SELECT channelId FROM channels");
                    const monitoredSet = new Set(monitoredChannels.map(c => c.channelId));
                    channelIdsToReset = ids.filter(id => monitoredSet.has(id));
                }

                if (channelIdsToReset.length === 0) {
                     return replyOrFollowUp(interactionOrMessage, {
                        embeds: [embedSimple(client, "❌ خطأ", "لم أجد أي قنوات مراقبة صالحة (منشن أو ID) في مدخلاتك.", "Red")]
                    });
                }

                // تنفيذ الحذف الجزئي
                const placeholders = channelIdsToReset.map(() => '?').join(',');
                await db.run(`DELETE FROM stats WHERE userId = ? AND channelId IN (${placeholders})`, [targetUser.id, ...channelIdsToReset]);
                await db.run(`DELETE FROM post_log WHERE userId = ? AND channelId IN (${placeholders})`, [targetUser.id, ...channelIdsToReset]);
                
                const channelMentions = channelIdsToReset.map(id => `<#${id}>`).join('\n');
                return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "♻️ تم التصفير الجزئي", `تم تصفير نقاط الناشر **${targetUser.tag}** في القنوات التالية:\n${channelMentions}`, "Green")]
                });
            }

            // --- (الخيار 3: الافتراضي - تصفير كل القنوات) ---
            if (!channelsInputString) {
                // حذف كل سجلاته من stats و post_log (لكنه يبقى في "publishers")
                await db.run("DELETE FROM stats WHERE userId = ?", targetUser.id);
                await db.run("DELETE FROM post_log WHERE userId = ?", targetUser.id);

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
