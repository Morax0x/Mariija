// 📁 commands/help.js (النسخة 8.1 - المدمجة)

import {
EmbedBuilder, ActionRowBuilder,
ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} from "discord.js";

import {
LANG,
HELP_IMAGE_URL,
DEFAULT_EMBED_COLOR,
replyOrFollowUp,
getAuthorId,
البادئة // (البادئة الافتراضية العالمية)
} from '../utils.js';

export default {
name: 'help',
description: 'عرض قائمة أوامر البوت.',

async execute(client, interactionOrMessage, args, db) {

const authorId = getAuthorId(interactionOrMessage);
const guildId = interactionOrMessage.guildId;
let currentPrefix = البادئة; // (الافتراضية)

// 1. جلب البادئة الصحيحة (من الكود v8.0)
if (guildId) {
const prefixRow = await db.get("SELECT value FROM config WHERE key = ?", `prefix:${guildId}`);
if (prefixRow) {
currentPrefix = prefixRow.value;
}
}

// 2. دالة مساعدة لتطبيق البادئة على الحقول
const formatFields = (fields) => {
if (!fields) return [];
return fields.map(field => ({
name: field.name,
value: field.value.replace(/`/g, `\`${currentPrefix}`), // ⬅️ استبدال البادئة
inline: field.inline
}));
};

// 3. إنشاء الإيمبد الأولي (من الكود القديم)
const initialFields = formatFields(LANG.ar.HELP_FIELDS.MAIN);

const embed = new EmbedBuilder()
.setTitle(LANG.ar.HELP_TITLE)
.setDescription(LANG.ar.HELP_DESC)
.setColor(DEFAULT_EMBED_COLOR)
.setImage(HELP_IMAGE_URL) // (استخدام الصورة الثابتة)
.addFields(initialFields); 

// 4. إنشاء القائمة المنسدلة (من الكود القديم)
const selectMenu = new StringSelectMenuBuilder()
.setCustomId(`help_menu_${authorId}`) 
.setPlaceholder("اخـتـر القـسـم لعـرض اوامـره...")
.addOptions(
new StringSelectMenuOptionBuilder().setLabel("الإعدادات الأساسية").setValue('main').setDescription("أوامر البادئة، المشرفين، قناة الإعلانات.").setEmoji('<a:6ulit:1401908234629156915>'),
new StringSelectMenuOptionBuilder().setLabel("إدارة القنوات").setValue('channels').setDescription("أوامر إضافة وإزالة القنوات والثريدات.").setEmoji('<a:6nekodance:1414942810359992391>'),
new StringSelectMenuOptionBuilder().setLabel("إدارة الناشرين").setValue('publishers').setDescription("أوامر إضافة وإزالة الناشرين.").setEmoji('<a:6hanyaCheer:1412827823458091251>'),
new StringSelectMenuOptionBuilder().setLabel("الإحصائيات").setValue('stats').setDescription("أوامر عرض وتصفير الإحصائيات.").setEmoji('<a:6noted:1396014057395322930>')
);

const row = new ActionRowBuilder().addComponents(selectMenu);

const reply = await replyOrFollowUp(interactionOrMessage, {
embeds: [embed],
components: [row]
});

if (!reply) return; 

// 5. إنشاء المجمع (Collector)
const collector = reply.createMessageComponentCollector({
componentType: ComponentType.StringSelect,
filter: (i) => i.user.id === authorId && i.customId === `help_menu_${authorId}`,
time: 60000 
});

collector.on('collect', async (interaction) => {
try { 
const selectedValue = interaction.values[0];
let rawFields; // (الحقول قبل تطبيق البادئة)
switch (selectedValue) {
case 'main': rawFields = LANG.ar.HELP_FIELDS.MAIN; break;
case 'channels': rawFields = LANG.ar.HELP_FIELDS.CHANNELS; break;
case 'publishers': rawFields = LANG.ar.HELP_FIELDS.PUBLISHERS; break;
case 'stats': rawFields = LANG.ar.HELP_FIELDS.STATS; break;
default: rawFields = LANG.ar.HELP_FIELDS.MAIN; 
}

// 6. تطبيق البادئة على الحقول المحددة
const newFields = formatFields(rawFields);

const updatedEmbed = EmbedBuilder.from(embed).setFields(newFields || []); 

if (!interaction.deferred && !interaction.replied) {
await interaction.update({ embeds: [updatedEmbed] });
}
} catch (error) {
console.error(`Error updating help menu interaction: ${error}`);
if (error.code !== 10062 && !interaction.replied && !interaction.deferred) {
await interaction.followUp({ content: 'حدث خطأ أثناء تحديث القائمة.', ephemeral: true }).catch(console.error);
}
}
});

collector.on('end', () => {
const disabledRow = new ActionRowBuilder().addComponents(
selectMenu.setDisabled(true)
);
if (reply && !reply.deleted) {
reply.edit({ components: [disabledRow] }).catch(e => {
                    // (تجاهل الأخطاء إذا تم حذف الرسالة)
                    if (e.code !== 10008) console.error("Help menu edit error:", e);
                });
}
});
}
};