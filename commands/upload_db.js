// 📁 commands/upload_db.js (نسخة 2.1 - مصححة)

import {
    LANG,
    isOwner, 
    replyOrFollowUp, // ⬅️ الدالة الآمنة
    embedSimple,
    getAuthorId,
    DB_PATH
} from '../utils.js';
import { MessageFlags } from 'discord.js';
import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { open } from "sqlite"; // ⬅️ نحتاج هذه
import sqlite3 from "sqlite3"; // ⬅️ ونحتاج هذه لإعادة الاتصال

export default {
    name: 'upload_db',
    aliases: ['up'], 
    description: '[مالك] رفع واستبدال قاعدة البيانات.',
    ownerOnly: true, 

    async execute(client, interactionOrMessage, args, db) {

        const attachment = (interactionOrMessage.user)
            ? interactionOrMessage.options.getAttachment('file')
            : interactionOrMessage.attachments.first();

        if (!attachment || !attachment.name.endsWith('.db')) {
            return replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ خطأ", LANG.ar.ERROR_DB_UPLOAD_NO_FILE, "Red")],
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "🔄 جاري المعالجة", LANG.ar.SUCCESS_DB_UPLOADED, "Yellow")],
                flags: MessageFlags.Ephemeral
            });

            // إغلاق الاتصال الحالي بقاعدة البيانات
            if (db) await db.close(); 

            const response = await fetch(attachment.url);
            if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // الكتابة فوق الملف القديم
            await writeFile(DB_PATH, buffer);

            // *** 🟢 التصحيح الأول: استخدام الدالة الآمنة ***
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "🎉 نجاح", LANG.ar.SUCCESS_DB_REPLACED + "\n\n**مهم جداً: قم بإعادة تشغيل البوت الآن!**", "Green")]
            });

            // (ملاحظة: البوت سيتوقف عن العمل حتى تعيد تشغيله يدوياً
            // لأننا أغلقنا الاتصال بـ db ولن نعيد فتحه)

        } catch (error) {
            console.error("DB Upload Error:", error);

            // *** 🟢 التصحيح الثاني: استخدام الدالة الآمنة ***
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ فشل", LANG.ar.ERROR_DB_UPLOAD_FAIL.replace("{error}", error.message), "Red")] 
            });

            // (إعادة فتح الاتصال في حالة الفشل حتى لا يتوقف البوت)
            try {
                db = await open({ filename: DB_PATH, driver: sqlite3.Database });
            } catch (e) {
                console.error("Failed to reopen DB after upload failure:", e);
                // (إذا فشل هنا، فالبوت في مشكلة ويحتاج إعادة تشغيل)
            }
        }
    }
};
