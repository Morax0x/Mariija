// 📁 commands/addpublisher.js (النسخة 7.1)

import {
  LANG,
  replyOrFollowUp,
  embedSimple,
  createSummaryEmbed,
  getGuildAdChannelId,
  sendOrUpdatePublisherAd,
  buildSummaryComponents
} from '../utils.js';
import { EmbedBuilder, ChannelType } from 'discord.js';

export default {
  name: 'addpublisher',
  description: 'إضافة ناشر رسمي (أو عدة ناشرين).',
  adminOnly: true,

  async execute(client, interactionOrMessage, args, db) {
    const guildId = interactionOrMessage.guildId || interactionOrMessage.guild?.id;

    if (interactionOrMessage.deferReply) {
        await interactionOrMessage.deferReply({ ephemeral: true });
    }

    let userIds = [];
    if (interactionOrMessage.user) {
      const usersString = interactionOrMessage.options.getString('users') || '';
      userIds = usersString.match(/\d{17,19}/g) || [];
    } else {
      const joined = args.join(' ');
      userIds = joined.match(/\d{17,19}/g) || [];
    }
    userIds = [...new Set(userIds)];

    if (userIds.length === 0) {
      return replyOrFollowUp(interactionOrMessage, {
        embeds: [embedSimple(client, LANG.ar.ERROR_PUBLISHERS_ADD_NONE.title, LANG.ar.ERROR_PUBLISHERS_ADD_NONE.description, "Red")]
      });
    }

    const added = [];
    const failed = [];

    for (const id of userIds) {
      try {
        const user = await client.users.fetch(id).catch(() => null);
        if (!user || user.bot) { failed.push(`<@${id}>`); continue; }

        const exists = await db.get("SELECT 1 FROM publishers WHERE userId = ?", id);
        if (exists) { failed.push(`${user.tag} ${LANG.ar.PUBLISHER_ADD_FAIL_ALREADY}`); continue; }

        await db.run("INSERT OR IGNORE INTO publishers (userId, tag, joinDate) VALUES (?, ?, ?)", user.id, user.tag, new Date().toISOString());
        const nowExists = await db.get("SELECT 1 FROM publishers WHERE userId = ?", id);
        if (!nowExists) { failed.push(`<@${id}>`); continue; }

        added.push(`<@${id}>`);

        if (guildId) {
          await sendOrUpdatePublisherAd(client, db, guildId, id, '30d').catch(() => {});
        }
      } catch {
        failed.push(`<@${id}>`);
      }
    }

    if (guildId && added.length > 0) {
      const adChannelId = await getGuildAdChannelId(db, guildId);
      if (adChannelId) {
        const adChannel = await client.channels.fetch(adChannelId).catch(() => null);
        if (adChannel && (adChannel.type === ChannelType.GuildText || adChannel.type === ChannelType.GuildAnnouncement)) {

          const defaultTimeframe = '30d';
          const summary = await createSummaryEmbed(client, db, defaultTimeframe).catch(() => null);
          if (summary) {
            const components = buildSummaryComponents(guildId, defaultTimeframe);
            const summaryKey = `summaryMessageId:${guildId}`;
            const summaryRow = await db.get("SELECT value FROM config WHERE key = ?", summaryKey);

            if (summaryRow?.value) {
                try {
                    const oldMsg = await adChannel.messages.fetch(summaryRow.value);
                    await oldMsg.delete();
                } catch (e) {}
            }

            const newMsg = await adChannel.send({ embeds: [summary], components: components });
            await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", summaryKey, newMsg.id);
          }
        }
      }
    }

    const result = new EmbedBuilder().setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });

    if (added.length > 0) {
      result.setTitle(LANG.ar.SUCCESS_PUBLISHERS_ADDED_TITLE)
            .setDescription(added.join('\n'))
            .setColor(0x3BA55D);
    }

    if (failed.length > 0) {
      result.addFields({ name: LANG.ar.ERROR_PUBLISHERS_ADD_FAIL_TITLE, value: failed.join('\n') }).setColor(added.length ? 0xFEE75C : 0xED4245);
    }

    if (added.length === 0 && failed.length === 0) {
      return replyOrFollowUp(interactionOrMessage, {
        embeds: [embedSimple(client, LANG.ar.ERROR_PUBLISHERS_ADD_NONE.title, LANG.ar.ERROR_PUBLISHERS_ADD_NONE.description, "Red")]
      });
    }

    return replyOrFollowUp(interactionOrMessage, { embeds: [result] });
  }
};