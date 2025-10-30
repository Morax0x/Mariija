// 📁 commands/backup_db.js (نسخة محدثة 2.0 - للمالك فقط)

import {
    LANG,
    isOwner, // ⬅️ --- يبقى للمالك فقط (آمن) ---
    replyOrFollowUp,
    embedSimple,
    getAuthorId,
    DB_PATH
} from '../utils.js';
import { AttachmentBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'backup_db',
    aliases: ['do'], // ⬅️ --- هذا هو التعديل! (الأمر المستعار) ---
    description: '[مالك] إرسال نسخة احتياطية من قاعدة البيانات.',
    ownerOnly: true, // ⬅️ --- يبقى للمالك فقط (آمن) ---

    async execute(client, interactionOrMessage, args, db) {
        
        try {
            const user = interactionOrMessage.user || interactionOrMessage.author;
            const dmChannel = await user.createDM();
            
            await dmChannel.send({
                content: "إليك نسخة احتياطية من قاعدة البيانات:",
                files: [new AttachmentBuilder(DB_PATH)]
            });

            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "✅ نجاح", LANG.ar.SUCCESS_BACKUP_SENT, "Green")],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error("Error sending DB backup:", error);
            await replyOrFollowUp(interactionOrMessage, { 
                embeds: [embedSimple(client, "❌ خطأ", "لم أتمكن من إرسال الملف إلى خاصك. تأكد أن خاصك مفتوح.", "Red")],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
