// 📁 commands/setadchannel.js (النسخة 7.2 - المصححة)

import {
  replyOrFollowUp,
  embedSimple,
  LANG,
  checkAdmin,
  createSummaryEmbed,
  buildSummaryComponents
} from '../utils.js';
import { ChannelType, PermissionsBitField, MessageFlags } from 'discord.js';

export default {
  name: 'setadchannel',
  description: '[إدارة] تعيين قناة إعلانات الناشرين.',
  adminOnly: true,

  async execute(client, interactionOrMessage, args, db) {
    if (!(await checkAdmin(interactionOrMessage, db))) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
    }

    const guild = interactionOrMessage.guild;
    if (!guild) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "خطأ", "هذا الأمر يجب أن يُستخدم داخل سيرفر.", "Red")] });
    }

    let channel = null;

    if (interactionOrMessage.user) { 
      // --- ( 1 ) حالة السلاش ---
      channel = interactionOrMessage.options.getChannel('channel');

    } else { 
      // --- ( 2 ) حالة البريفكس (هذا هو التصحيح) ---

      // نبحث عن المنشن أولاً
      const mentionedChannel = interactionOrMessage.mentions.channels.first();
      // إذا لم نجد منشن، نبحث عن ID في أول حجة
      const channelId = args[0]?.match(/\d{17,19}/g)?.[0];

      if (mentionedChannel) {
        channel = mentionedChannel;
      } else if (channelId) {
        try {
          channel = await guild.channels.fetch(channelId);
        } catch {
          channel = null;
        }
      }

      // إذا فشل كل شيء
      if (!channel) {
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "الرجاء منشن القناة أو وضع الـ ID.", "Red")] });
      }
    }

    // --- ( 3 ) باقي الكود (مشترك للجهتين) ---

    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "الرجاء اختيار قناة نصية أو قناة إعلانات فقط.", "Red")] });
    }

    const perms = channel.permissionsFor(client.user);
    if (!perms.has(PermissionsBitField.Flags.ViewChannel) || !perms.has(PermissionsBitField.Flags.SendMessages) || !perms.has(PermissionsBitField.Flags.EmbedLinks)) {
      return replyOrFollowUp(interactionOrMessage, {
        embeds: [embedSimple(client, "❌ خطأ صلاحيات", `ليس لدي صلاحية "رؤية القناة"، "إرسال رسائل"، و "إرفاق روابط" في ${channel}.`, "Red")]
      });
    }

    if (interactionOrMessage.user) {
        await interactionOrMessage.deferReply({ ephemeral: true });
    }

    try {
      const key = `adChannel:${guild.id}`;
      await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", key, channel.id);

      const defaultTimeframe = '30d';
      const summaryEmbed = await createSummaryEmbed(client, db, defaultTimeframe);
      if (!summaryEmbed) {
         return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لا يمكن إنشاء الملخص.", "Red")] });
      }

      const components = buildSummaryComponents(guild.id, defaultTimeframe);
      const summaryKey = `summaryMessageId:${guild.id}`;

      const summaryRow = await db.get("SELECT value FROM config WHERE key = ?", summaryKey);
      let summaryUpdated = false;
      if (summaryRow?.value) {
           try {
               const oldMsg = await channel.messages.fetch(summaryRow.value);
               await oldMsg.edit({ embeds: [summaryEmbed], components: components });
               summaryUpdated = true;
           } catch (e) {
               // (فشل التعديل، سيتم إرسال رسالة جديدة)
           }
      }

      if (!summaryUpdated) {
          const newMsg = await channel.send({ embeds: [summaryEmbed], components: components });
          await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", summaryKey, newMsg.id);
      }

      return replyOrFollowUp(interactionOrMessage, {
        embeds: [embedSimple(client, LANG.ar.SUCCESS_AD_CHANNEL_SET_TITLE, LANG.ar.SUCCESS_AD_CHANNEL_SET_DESC.replace("{channel}", `${channel}`), "Green")]
      });

    } catch (e) {
      console.error("Error in setadchannel:", e);
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء حفظ القناة في قاعدة البيانات.", "Red")] });
    }
  }
};
