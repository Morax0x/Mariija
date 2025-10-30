// 📁 commands/listchannels.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    createListEmbed // ⬅️ الدالة محدثة
} from '../utils.js';

export default {
    name: 'listchannels',
    description: 'عرض (القنوات/الثريدات/البوستات) المعينة للتتبـع.',
    // (متاح للجميع رؤيته)

    async execute(client, interactionOrMessage, args, db) {
        
        // (الدالة المساعدة محدثة وتستخدم guildId من interactionOrMessage)
        const { embed, row } = await createListEmbed(
            client, 
            db, 
            1, 
            'listchannels', // ⬅️ اسم القائمة
            interactionOrMessage 
        );

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], components: [row] });
    }
};
