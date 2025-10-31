// 📁 commands/top.js (النسخة النهائية)

import {
LANG,
replyOrFollowUp,
createStatsEmbedPage 
} from "../utils.js";

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export default {
name: "top",
aliases: ['stats_top'], 
description: 'عـرض قائـمـة أعـلـى الناشـرين.',

async execute(client, interactionOrMessage, args, db) {
const guildId = interactionOrMessage.guildId; 

if (!guildId) {
return replyOrFollowUp(interactionOrMessage, { 
            embeds: [embedSimple(client, "❌ خطأ", "هذا الأمر يجب أن يُستخدم داخل سيرفر.", "Red")] 
        });
}

    // ⬅️ (الدالة المحدثة تستخدم guildId لفلترة النتائج)
const { embed, row, totalPages } = await createStatsEmbedPage(
client, 
db, 
1, 
'stats_top',
guildId // ⬅️ هذا هو الذي يجب أن يمرر
);

await replyOrFollowUp(interactionOrMessage, {
embeds: [embed],
components: [row]
});
},
};