// 📁 commands/addadmin.js (نسخة محدثة 2.0 - للمشرفين)

import {
    LANG,
    checkAdmin, // ⬅️ --- تم التغيير من isOwner إلى checkAdmin ---
    replyOrFollowUp,
    embedSimple
} from '../utils.js';
import { MessageFlags, Collection } from 'discord.js';

export default {
    name: 'addadmin',
    description: 'إضافة مستخدم كـ مشرف نشر.',
    adminOnly: true, // ⬅️ --- هذا هو التعديل! الآن أي شخص معه "Manage Server" يقدر ---

    async execute(client, interactionOrMessage, args, db) {

        // جلب المستخدمين من السلاش أو المنشن
        const users = (interactionOrMessage.user)
            ? new Collection([[interactionOrMessage.options.getUser('user').id, interactionOrMessage.options.getUser('user')]])
            : interactionOrMessage.mentions.users;

        if (users.size === 0) {
            return replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, LANG.ar.ERROR_MENTION_USER.title, LANG.ar.ERROR_MENTION_USER.description, "Red")] 
            });
        }

        try {
            const stmt = await db.prepare("INSERT OR IGNORE INTO admins (userId) VALUES (?)");
            let addedCount = 0;
            for (const user of users.values()) {
                await stmt.run(user.id);
                addedCount++;
            }
            await stmt.finalize();

            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, LANG.ar.SUCCESS_ADMIN_ADDED, `تم إضافة ${addedCount} مشرفين بنجاح.`, "Green")] 
            });

        } catch (err) {
            console.error(err);
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ خطأ", LANG.ar.ERROR_SQL, "Red")] 
            });
        }
    }
};
