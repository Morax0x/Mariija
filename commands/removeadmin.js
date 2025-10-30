// 📁 commands/removeadmin.js (نسخة محدثة 2.0 - للمشرفين)

import {
    LANG,
    checkAdmin, // ⬅️ --- تم التغيير من isOwner إلى checkAdmin ---
    replyOrFollowUp,
    embedSimple
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'removeadmin',
    description: 'إزالة مشرف نشر.',
    adminOnly: true, // ⬅️ --- هذا هو التعديل! ---

    async execute(client, interactionOrMessage, args, db) {

        // جلب المستخدم من السلاش أو المنشن
        const user = (interactionOrMessage.user)
            ? interactionOrMessage.options.getUser('user')
            : interactionOrMessage.mentions.users.first();

        if (!user) {
            return replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, LANG.ar.ERROR_MENTION_USER.title, LANG.ar.ERROR_MENTION_USER.description, "Red")] 
            });
        }

        try {
            const result = await db.run("DELETE FROM admins WHERE userId = ?", user.id);

            if (result.changes === 0) {
                return replyOrFollowUp(interactionOrMessage, { 
                    embeds: [embedSimple(client, "🤔", LANG.ar.ERROR_ADMIN_NOT_LISTED.replace("{userName}", user.username), "Yellow")] 
                });
            }

            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, LANG.ar.SUCCESS_ADMIN_REMOVED, `تمت إزالة ${user.tag} من المشرفين.`, "Green")] 
            });

        } catch (err) {
            console.error(err);
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ خطأ", LANG.ar.ERROR_SQL, "Red")] 
            });
        }
    }
};
