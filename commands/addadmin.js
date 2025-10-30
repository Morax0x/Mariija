// 📁 commands/addadmin.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'addadmin',
    description: '[إدارة] إضافة مستخدم كـ مشرف نشـر.',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        
        // 1. التحقق من الصلاحيات (الدالة checkAdmin محدثة)
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        const guildId = interactionOrMessage.guildId;
        let targetUser;

        // 2. جلب المستخدم (سلاش أو بريفكس/ID)
        if (interactionOrMessage.user) { 
            targetUser = interactionOrMessage.options.getUser('user');
        } else {
            const mentionedUser = interactionOrMessage.mentions.users.first();
            const userId = args[0]?.match(/\d{17,19}/g)?.[0];

            if (mentionedUser) {
                targetUser = mentionedUser;
            } else if (userId) {
                targetUser = await client.users.fetch(userId).catch(() => null);
            }
        }

        if (!targetUser) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "يجب تحديد المستخدم (منشن أو ID).", "Red")], flags: MessageFlags.Ephemeral });
        }

        if (targetUser.bot) {
             return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "🤔", "لا يمكن إضافة البوتات كمشرفين.", "Yellow")], flags: MessageFlags.Ephemeral });
        }

        try {
            // 3. التحقق من قاعدة البيانات (مع guildId)
            const existing = await db.get("SELECT 1 FROM admins WHERE userId = ? AND guildId = ?", targetUser.id, guildId);
            if (existing) {
                return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "🤔", `المستخدم ${targetUser.tag} هو مشرف بالفعل.`, "Yellow")], flags: MessageFlags.Ephemeral });
            }

            // 4. الإضافة (مع guildId)
            await db.run("INSERT INTO admins (guildId, userId) VALUES (?, ?)", guildId, targetUser.id);

            return replyOrFollowUp(interactionOrMessage, {
                embeds: [embedSimple(client, "✅ نجاح", `✶ تـم تعييـن ${targetUser.tag} كـ مشرف نشر بنجـاح.`, "Green")],
                flags: MessageFlags.Ephemeral
            });

        } catch (e) {
            console.error("Error in addadmin:", e);
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء الإضافة إلى قاعدة البيانات.", "Red")], flags: MessageFlags.Ephemeral });
        }
    }
};
