// 📁 commands/top.js

import {
  LANG,
  replyOrFollowUp,
  getCustomization
} from "../utils.js";

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export default {
  name: "top",
  description: "عرض قائمة أعلى الناشرين.",

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} interactionOrMessage
   * @param {string[]} args
   * @param {import('sqlite').Database} db
   */
  async execute(client, interactionOrMessage, args, db) {
    const guildId = interactionOrMessage.guildId || null;
    const perPage = 10;
    const page = 1;

    // نجيب التخصيص (لون وصورة)
    const custom = await getCustomization(db, "stats_top");

    // نجيب المتصدرين
    const offset = (page - 1) * perPage;
    const rows = await db.all(`
      SELECT userId, SUM(points) as totalPoints
      FROM stats
      GROUP BY userId
      ORDER BY totalPoints DESC
      LIMIT ? OFFSET ?
    `, perPage, offset);

    const totalPublishersRow = await db.get("SELECT COUNT(DISTINCT userId) as count FROM stats");
    const totalPublishers = totalPublishersRow?.count || 0;
    const totalPages = Math.ceil(totalPublishers / perPage) || 1;

    // نبني الإيمبد الجميل
    const embed = new EmbedBuilder()
      .setTitle("🏆 لائـحـة الـمـتصـدريـن")
      .setColor(custom.color)
      .setImage("https://i.postimg.cc/QN7gjhyk/Top.png")
      .setFooter({ text: `صفحة ${page}/${totalPages}` });

    if (custom.image) embed.setThumbnail(custom.image);

    if (!rows.length) {
      embed.setDescription("لا يوجد ناشرون بعد.");
    } else {
      let description = "";
      let rank = offset + 1;
      for (const row of rows) {
        const user = await client.users.fetch(row.userId).catch(() => null);
        const username = user ? user.username : `مستخدم غير معروف (${row.userId})`;
        const points = row.totalPoints || 0;
        description += `**${rank}.** <@${row.userId}> — **${points}**\n`;
        rank++;
      }
      embed.setDescription(description);
    }

    // أزرار التحكم
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`page_stats_top_${client.user.id}_${page - 1}`)
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("page_info")
        .setLabel(`${page}/${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`page_stats_top_${client.user.id}_${page + 1}`)
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages)
    );

    await replyOrFollowUp(interactionOrMessage, {
      embeds: [embed],
      components: [row]
    });
  },
};
