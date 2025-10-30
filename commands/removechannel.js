// 📁 commands/removechannel.js

import {
    processChannels // ⬅️ الدالة التي أضفناها لـ utils.js
} from '../utils.js';

export default {
    name: 'removechannel',
    description: 'إزالة قنوات نصية أو ثريدات/بوستات من المراقبة.',
    adminOnly: true, // ⬅️ سيتم التحقق من الصلاحيات تلقائياً

    async execute(client, interactionOrMessage, args, db) {
        
        // نفس الأمر السابق، ولكن نعطيه وضع 'remove'
        await processChannels(interactionOrMessage, args, 'remove', db, client);
        
    }
};
