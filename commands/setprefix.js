// 📁 commands/setprefix.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    setPrefix // (هذه الدالة ستعدل البادئة الافتراضية فقط)
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'setprefix',
    description: '[إدارة] تعيين بادئة جديدة للبوت (لهذا السيرفر فقط).',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        const guildId = interactionOrMessage.guildId;
        let newPrefix;

        if (interactionOrMessage.user) { 
            newPrefix = interactionOrMessage.options.getString('new_prefix');
        } else { 
            newPrefix = args[0];
        }

        if (!newPrefix || newPrefix.length > 5) {
             return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "يجب تحديد بادئة جديدة (5 أحرف كحد أقصى).", "Red")], flags: MessageFlags.Ephemeral });
        }

        try {
            // ⬅️ (استخدام مفتاح خاص بالسيرفر)
            const key = `prefix:${guildId}`;
            
            // (تحديث: إذا كانت "reset"، نستخدم البادئة العالمية)
            if (newPrefix.toLowerCase() === 'reset') {
                 await db.run("DELETE FROM config WHERE key = ?", key);
                 return replyOrFollowUp(interactionOrMessage, {
                    embeds: [embedSimple(client, "✅ نجاح", "تمت إعادة تعيين البادئة إلى الافتراضية.", "Green")],
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", key, newPrefix);

            return replyOrFollowUp(interactionOrMessage, {
                embeds: [embedSimple(client, "✅ نجاح", `تم تعيين بادئة هذا السيرفر إلى: \`${newPrefix}\``, "Green")],
                flags: MessageFlags.Ephemeral
            });

        } catch (e) {
            console.error("Error in setprefix:", e);
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء حفظ البادئة.", "Red")], flags: MessageFlags.Ephemeral });
        }
    }
};
