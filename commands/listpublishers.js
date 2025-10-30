// 📁 commands/listpublishers.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    createListEmbed // ⬅️ الدالة محدثة
} from '../utils.js';

export default {
    name: 'listpublishers',
    description: 'عرض قائمة الناشرين المسجلين.',
    // (متاح للجميع رؤيته)

    async execute(client, interactionOrMessage, args, db) {
        
        // (الدالة المساعدة محدثة وتستخدم guildId من interactionOrMessage)
        const { embed, row } = await createListEmbed(
            client, 
            db, 
            1, 
            'listpublishers', // ⬅️ اسم القائمة
            interactionOrMessage 
        );

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], components: [row] });
    }
};
