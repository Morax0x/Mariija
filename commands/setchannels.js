// 📁 commands/setchannels.js
// (هذا الكود الصح حق مراقبة القنوات)

import {
    processChannels // ⬅️ هذا يستدعي الدالة اللي تقبل الكاتاغوري والفورم
} from '../utils.js';

export default {
    name: 'setchannels',
    description: 'إضافة قنوات نصية أو ثريدات/بوستات للمراقبة.',
    adminOnly: true, // ⬅️ سيتم التحقق من الصلاحيات تلقائياً

    /**
     * @param {Client} client
     * @param {import("discord.js").Message | import("discord.js").ChatInputCommandInteraction} interactionOrMessage
     * @param {String[]} args (للأوامر التقليدية) | {InteractionOptions} args (للسلاش)
     * @param {Database} db
     */
    async execute(client, interactionOrMessage, args, db) {

        // ببساطة، نستدعي الدالة ونعطيها وضع 'add'
        // الدالة نفسها (processChannels) ستقوم بكل العمل
        await processChannels(interactionOrMessage, args, 'add', db, client);

    }
};