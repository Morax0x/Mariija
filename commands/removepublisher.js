// 📁 commands/removepublisher.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    deletePublisherAdMessage // ⬅️ الدالة المحدثة
} from '../utils.js';
import { MessageFlags, EmbedBuilder } from 'discord.js';

export default {
    name: 'removepublisher',
    description: '[إدارة] إزالة ناشر أو عدة ناشرين وحذف سجلاتهم.',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        
        if (!(await checkAdmin(interactionOrMessage, db))) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
        }

        const guildId = interactionOrMessage.guildId;
        let userIds = [];

        if (interactionOrMessage.user) { 
            await interactionOrMessage.deferReply({ ephemeral: true });
            const user = interactionOrMessage.options.getUser('user');
            const usersString = interactionOrMessage.options.getString('users');

            if (user) {
                userIds.push(user.id);
            }
            if (usersString) {
                userIds = [...userIds, ...(usersString.match(/\d{17,19}/g) || [])];
            }
        } else { 
            userIds = args.join(' ').match(/\d{17,19}/g) || [];
        }
        
        // إزالة التكرار
        userIds = [...new Set(userIds)];

        if (userIds.length === 0) {
            return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لم يتم تحديد أي مستخدمين (منشن أو ID).", "Red")], flags: MessageFlags.Ephemeral });
        }

        let removedCount = 0;
        let notFoundCount = 0;
        const removedMentions = [];
        const notFoundMentions = [];

        for (const userId of userIds) {
            try {
                // ⬅️ (التحقق مع guildId)
                const existing = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", userId, guildId);
                
                if (existing) {
                    // ⬅️ (الحذف مع guildId)
                    // (سيؤدي هذا إلى حذف سجلاتهم من stats و post_log بسبب CASCADE)
                    await db.run("DELETE FROM publishers WHERE userId = ? AND guildId = ?", userId, guildId);
                    
                    // ⬅️ (حذف رسالته من قناة الإعلانات)
                    await deletePublisherAdMessage(client, db, guildId, userId);
                    
                    removedCount++;
                    if (removedMentions.length < 25) {
                        removedMentions.push(`<@${userId}>`);
                    }
                } else {
                    notFoundCount++;
                    if (notFoundMentions.length < 25) {
                         notFoundMentions.push(`<@${userId}>`);
                    }
                }
            } catch (e) {
                console.error("Error removing publisher:", e);
                 notFoundCount++;
                 if (notFoundMentions.length < 25) {
                     notFoundMentions.push(`\`${userId}\` (خطأ DB)`);
                 }
            }
        }

        if (removedCount === 0 && notFoundCount === 0) {
             return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لم يتم العثور على أي مستخدمين صالحين.", "Red")], flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setTitle("✅ تمت إزالـة الناشـرين")
            .setColor(0xED4245)
            .setTimestamp();

        if (removedCount > 0) {
            embed.addFields({ name: `🗑️ تمت إزالة (${removedCount}) ناشر:`, value: removedMentions.join('\n') });
        }
        if (notFoundCount > 0) {
            embed.addFields({ name: `🤔 لم يتم العثور على (${notFoundCount}):`, value: notFoundMentions.join('\n') });
        }

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
