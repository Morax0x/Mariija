// 📁 commands/listchannels.js (إصلاح 5.1 - تنظيف)

import {
    LANG,
    checkAdmin,
    replyOrFollowUp,
    embedSimple,
    getAuthorId,
    createListEmbed
} from '../utils.js';
import { MessageFlags } from 'discord.js';

export default {
    name: 'listchannels',
    description: 'عرض العناصر (القنوات/الثريدات/البوستات) المعينة للتتبع.',
    adminOnly: true, 

    async execute(client, interactionOrMessage, args, db) {

        // (تم حذف اللوق التشخيصي من هنا)

        const authorId = getAuthorId(interactionOrMessage);

        const { embed, row } = await createListEmbed(client, db, 1, 'listchannels', interactionOrMessage);

        row.components.forEach(button => {
            const idParts = button.data.custom_id.split('_');
            if (idParts[0] === 'page') { 
                idParts[2] = authorId; 
                button.setCustomId(idParts.join('_'));
            }
        });

        await replyOrFollowUp(interactionOrMessage, { 
            embeds: [embed], 
            components: [row] 
        });
    }
};