// 📁 commands/help.js (النسخة 8.0 - تدعم السيرفرات)

import {
    LANG,
    replyOrFollowUp,
    embedSimple,
    HELP_IMAGE_URL,
    البادئة // (البادئة الافتراضية العالمية)
} from '../utils.js';
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'help',
    description: 'عرض قائمة أوامـر البوت.',
    
    async execute(client, interactionOrMessage, args, db) {
        
        const guildId = interactionOrMessage.guildId;
        let currentPrefix = البادئة; // (الافتراضية)

        if (guildId) {
            const prefixRow = await db.get("SELECT value FROM config WHERE key = ?", `prefix:${guildId}`);
            if (prefixRow) {
                currentPrefix = prefixRow.value;
            }
        }

        // (استبدال علامة البادئة الافتراضية بالبادئة الصحيحة)
        const fields = Object.values(LANG.ar.HELP_FIELDS).map(section => {
            return section.map(field => ({
                name: field.name,
                value: field.value.replace(/`/g, `\`${currentPrefix}`), // ⬅️ استبدال البادئة
                inline: field.inline
            }));
        }).flat();


        const embed = new EmbedBuilder()
            .setTitle(LANG.ar.HELP_TITLE)
            .setDescription(LANG.ar.HELP_DESC)
            .setColor(0xFFFFFF) // (لون افتراضي للهيلب)
            .setImage(HELP_IMAGE_URL) // (الصورة الثابتة للهيلب)
            .addFields(fields);

        return replyOrFollowUp(interactionOrMessage, { embeds: [embed] });
    }
};
