// 📁 commands/setchannels.js (النسخة 8.0 - تدعم السيرفرات)

import { processChannels } from '../utils.js';

export default {
    name: 'setchannels',
    description: '[إدارة] إضافة قنوات نصية أو ثريدات/بوستات للمراقبة (يدعم الكاتاغوري).',
    adminOnly: true,

    async execute(client, interactionOrMessage, args, db) {
        // (الدالة المساعدة محدثة وتستخدم guildId من interactionOrMessage)
        return processChannels(interactionOrMessage, args, 'add', db, client);
    }
};
