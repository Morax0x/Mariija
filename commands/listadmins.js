// 📁 commands/listadmins.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    createListEmbed // ⬅️ الدالة محدثة
} from '../utils.js';

export default {
    name: 'listadmins',
    description: 'عرض قائمة المشرفين المعينين.',
    // (متاح للجميع رؤيته)

    async execute(client, interactionOrMessage, args, db) {
        
        // (الدالة المساعدة محدثة وتستخدم guildId من interactionOrMessage)
        const { embed, row } = await createListEmbed(
            client, 
            db, 
            1, 
            'listadmins', // ⬅️ اسم القائمة
            interactionOrMessage 
        );

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed], components: [row] });
    }
};
