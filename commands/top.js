// 📁 commands/top.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    createStatsEmbedPage // ⬅️ الدالة المحدثة
} from '../utils.js';

export default {
    name: 'top',
    aliases: ['stats_top'], // (اسم مستعار ليتوافق مع أوامر التخصيص)
    description: 'عـرض قائـمـة أعـلـى الناشـرين.',
    
    async execute(client, interactionOrMessage, args, db) {
        
        const guildId = interactionOrMessage.guildId; // ⬅️ جلب ID السيرفر

        // ⬅️ (تمرير guildId)
        const { embed, row } = await createStatsEmbedPage(
            client, 
            db, 
            1, // page
            'stats_top',
            guildId // ⬅️ الإضافة الجديدة
        );

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], components: [row] });
    }
};
