// 📁 commands/setprefix.js (نسخة محدثة 2.0)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    setPrefix // ⬅️ --- تم استيراد الدالة الجديدة ---
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'setprefix',
    description: 'تعيين بادئة جديدة للبوت.',
    adminOnly: true, // ⬅️ سيتم التحقق من الصلاحيات تلقائياً

    /**
     * @param {Client} client
     * @param {import("discord.js").Message | import("discord.js").ChatInputCommandInteraction} interactionOrMessage
     * @param {String[]} args (للأوامر التقليدية) | {InteractionOptions} args (للسلاش)
     * @param {Database} db
     */
    async execute(client, interactionOrMessage, args, db) {

        const newPrefix = (interactionOrMessage.user) 
            ? interactionOrMessage.options.getString('new_prefix') 
            : args[0];

        if (!newPrefix) {
            return replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ خطأ", "الرجاء تحديد بادئة جديدة.", "Red")] 
            });
        }

        try {
            // 1. التحديث في قاعدة البيانات
            await db.run("UPDATE config SET value = ? WHERE key = 'prefix'", newPrefix);

            // 2. التحديث في ذاكرة البوت (الخطوة الجديدة)
            setPrefix(newPrefix); // ⬅️ --- هذا هو السطر السحري ---

            // 3. إرسال رسالة النجاح (بدون طلب إعادة التشغيل)
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "✅ نجاح", LANG.ar.SUCCESS_PREFIX_SET.replace("{newPrefix}", newPrefix), "Green")] 
            });

        } catch (err) {
            console.error(err);
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ خطأ", LANG.ar.ERROR_SQL, "Red")] 
            });
        }
    }
};
