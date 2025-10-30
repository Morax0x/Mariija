// 📁 commands/listadmins.js (إصلاح 5.1 - تنظيف)

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
    name: 'listadmins',
    description: 'عرض قائمة المشرفين المعينين.',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        const authorId = getAuthorId(interactionOrMessage);

        const { embed, row } = await createListEmbed(client, db, 1, 'listadmins', interactionOrMessage);

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