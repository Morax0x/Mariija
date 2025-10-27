import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

// دالة لإنشاء قائمة الهيلب المنسدلة
export function createHelpSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu_selector')
        .setPlaceholder('اخـتـر مـجـموعـة الاوامــر ..')
        .addOptions([
            new StringSelectMenuOptionBuilder().setLabel('الإعدادات الأساسية').setValue('help_main').setEmoji('⚙️'),
            new StringSelectMenuOptionBuilder().setLabel('إدارة القنوات').setValue('help_channels').setEmoji('📢'),
            new StringSelectMenuOptionBuilder().setLabel('إدارة الناشرين').setValue('help_publishers').setEmoji('👤'),
            new StringSelectMenuOptionBuilder().setLabel('الإحصائيات').setValue('help_stats').setEmoji('📊'),
        ]);
    return [new ActionRowBuilder().addComponents(selectMenu)];
}