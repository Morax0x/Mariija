// 📁 commands/setadchannel.js (النسخة 8.0 - تدعم السيرفرات)

import {
  replyOrFollowUp,
  embedSimple,
  LANG,
  checkAdmin,
  createSummaryEmbed, // ⬅️ دالة محدثة
  buildSummaryComponents
} from '../utils.js';
import { ChannelType, PermissionsBitField, MessageFlags } from 'discord.js';

export default {
  name: 'setadchannel',
  description: '[إدارة] تعيين قناة إعلانات الناشرين (لهذا السيرفر).',
  adminOnly: true,

  async execute(client, interactionOrMessage, args, db) {
    if (!(await checkAdmin(interactionOrMessage, db))) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
    }

    const guild = interactionOrMessage.guild;
    if (!guild) return; // (مستحيل الحدوث إذا كان الأمر للسيرفرات فقط)

    let channel = null;

    if (interactionOrMessage.user) { 
      channel = interactionOrMessage.options.getChannel('channel');
    } else { 
      const mentionedChannel = interactionOrMessage.mentions.channels.first();
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

      if (!channel) {
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "الرجاء منشن القناة أو وضع الـ ID.", "Red")] });
      }
    }

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
      await db.run("DELETE FROM config WHERE key = 'adChannel'"); // (إزالة الإعداد العالمي القديم إن وجد)

      const defaultTimeframe = '30d';

      // *** 🟢 هذا هو السطر الذي كان يسبب الخطأ 🟢 ***
      // (v8.0 يرسل guild.id)
      const summaryEmbed = await createSummaryEmbed(client, db, defaultTimeframe, guild.id); 

      if (!summaryEmbed) {
         return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لا يمكن إنشاء الملخص.", "Red")] });
      }

      const components = buildSummaryComponents(guild.id, defaultTimeframe);
      const summaryKey = `summaryMessageId:${guild.id}`;
      const summaryRow = await db.get("SELECT value FROM config WHERE key = ?", summaryKey);

      if (summaryRow?.value) {
           try {
               const oldMsg = await channel.messages.fetch(summaryRow.value);
               await oldMsg.delete();
           } catch (e) {
               // (فشل الحذف، لا مشكلة)
           }
      }

      const newMsg = await channel.send({ embeds: [summaryEmbed], components: components });
      await db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", summaryKey, newMsg.id);

      return replyOrFollowUp(interactionOrMessage, {
        embeds: [embedSimple(client, LANG.ar.SUCCESS_AD_CHANNEL_SET_TITLE, LANG.ar.SUCCESS_AD_CHANNEL_SET_DESC.replace("{channel}", `${channel}`), "Green")],
        flags: MessageFlags.Ephemeral // (إضافة: إخفاء الرد)
      });

    } catch (e) {
      console.error("Error in setadchannel:", e);
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ فادح", "حدث خطأ أثناء حفظ القناة في قاعدة البيانات.", "Red")] });
    }
  }
};