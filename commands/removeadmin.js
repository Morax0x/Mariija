// 📁 commands/removeadmin.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'removeadmin',
    description: '[إدارة] إزالة مشرف نشر.',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        const guildId = interactionOrMessage.guildId;
        let targetUser;

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

        try {
            // 3. التحقق (مع guildId)
            const existing = await db.get("SELECT 1 FROM admins WHERE userId = ? AND guildId = ?", targetUser.id, guildId);
            if (!existing) {
                return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "🤔", `المستخدم ${targetUser.tag} ليس مشرفاً أصلاً.`, "Yellow")], flags: MessageFlags.Ephemeral });
            }

            // 4. الحذف (مع guildId)
            await db.run("DELETE FROM admins WHERE userId = ? AND guildId = ?", targetUser.id, guildId);

            return replyOrFollowUp(interactionOrMessage, {
                embeds: [embedSimple(client, "✅ نجاح", `✶ تـمـت إزالـة ${targetUser.tag} من قائمة المشرفين بـنجـاح.`, "Green")],
                flags: MessageFlags.Ephemeral
            });

        } catch (e) {
            console.error("Error in removeadmin:", e);
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء الحذف من قاعدة البيانات.", "Red")], flags: MessageFlags.Ephemeral });
        }
    }
};
