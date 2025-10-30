// 📁 commands/channelstats.js
// ✅ النسخة (6.3) - تستدعي الأزرار الزمنية

import {
    LANG,
    replyOrFollowUp,
    getAuthorId,
    createChannelListStats // ⬅️ الدالة اللي بنعدلها في utils
} from '../utils.js';

export default {
    name: 'channelstats',
    description: 'عرض إحصائيات النشر حسب القناة/العنصر.',
    // هذا الأمر متاح للجميع

    async execute(client, interactionOrMessage, args, db) {

        const authorId = getAuthorId(interactionOrMessage);
        const defaultTimeframe = '30d'; // ⬅️ الإطار الزمني الافتراضي

        // جلب الصفحة الأولى من إحصائيات القنوات
        // ⬇️ (التعديل هنا: نطلب "rows" ونمرر الإطار الزمني) ⬇️
        const { embed, rows } = await createChannelListStats(
            db, 
            1, // page
            authorId, 
            defaultTimeframe
        );

        // ⬇️ (التعديل هنا: نرسل "rows" بدال "row") ⬇️
        await replyOrFollowUp(interactionOrMessage, { 
            embeds: [embed], 
            components: rows // (rows صارت مصفوفة من صف واحد)
        });
    }
};