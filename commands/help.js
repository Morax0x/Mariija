// 📁 commands/help.js

import {
    EmbedBuilder, ActionRowBuilder,
    ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} from "discord.js";

// --- 1. استيراد الدوال والثوابت التي نحتاجها ---
import {
    LANG,
    HELP_IMAGE_URL,
    DEFAULT_EMBED_COLOR,
    replyOrFollowUp,
    getAuthorId
} from '../utils.js';

// --- 2. هيكل الأمر الجديد ---
export default {
    name: 'help', // اسم الأمر (للبادئة والسلاش)
    description: 'عرض قائمة أوامر البوت.', // (للسلاش)

    /**
     * @param {Client} client
     * @param {import("discord.js").Message | import("discord.js").ChatInputCommandInteraction} interactionOrMessage
     * @param {String[]} args (للأوامر التقليدية) | {InteractionOptions} args (للسلاش)
     * @param {Database} db
     */
    async execute(client, interactionOrMessage, args, db) {

        const authorId = getAuthorId(interactionOrMessage);

        const embed = new EmbedBuilder()
            .setTitle(LANG.ar.HELP_TITLE)
            .setDescription(LANG.ar.HELP_DESC)
            .setColor(DEFAULT_EMBED_COLOR)
            .setImage('https://i.postimg.cc/Dfb79B76/Help.jpg') // ⬅️ تم تغيير الصورة هنا
            .addFields(LANG.ar.HELP_FIELDS.MAIN); 

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

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === authorId && i.customId === `help_menu_${authorId}`,
            time: 60000 
        });

        collector.on('collect', async (interaction) => {
            try { 
                const selectedValue = interaction.values[0];
                let newFields;
                 switch (selectedValue) {
                    case 'main': newFields = LANG.ar.HELP_FIELDS.MAIN; break;
                    case 'channels': newFields = LANG.ar.HELP_FIELDS.CHANNELS; break;
                    case 'publishers': newFields = LANG.ar.HELP_FIELDS.PUBLISHERS; break;
                    case 'stats': newFields = LANG.ar.HELP_FIELDS.STATS; break;
                    default: newFields = LANG.ar.HELP_FIELDS.MAIN; 
                }

                const updatedEmbed = EmbedBuilder.from(embed).setFields(newFields || []); 
                 if (!interaction.deferred && !interaction.replied) {
                     await interaction.update({ embeds: [updatedEmbed] });
                 } else {
                     console.warn(`Interaction ${interaction.id} already replied or deferred before update.`);
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
                 reply.edit({ components: [disabledRow] }).catch(console.error);
            }
        });
    }
};