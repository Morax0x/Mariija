// 📁 commands/removepublisher.js (النسخة المحدثة 7.9)

import {
  LANG,
  checkAdmin, // (ملاحظة: index.js 7.9 يعالج هذا التحقق بالفعل)
  replyOrFollowUp,
  embedSimple,
  // deletePublisherAdMessage  <-- (تمت إزالة هذه الدالة لأنها قديمة)
} from "../utils.js";
import { EmbedBuilder, ChannelType } from "discord.js"; // ⭐️ (أضفنا ChannelType)

export default {
  name: "removepublisher",
  description: "إزالة ناشر أو عدة ناشرين وحذف سجلاتهم.",
  adminOnly: true,

  async execute(client, interactionOrMessage, args, db) {
    // نجمع كل المستخدمين المطلوب إزالتهم (منشن/ID)
    let userIds = [];

    if (interactionOrMessage.user) {
      // Slash command
      const oneUser = interactionOrMessage.options.getUser("user");
      const usersStr = interactionOrMessage.options.getString("users"); // خيار إضافي اختياري
      if (oneUser) userIds.push(oneUser.id);
      if (usersStr) {
        const extra = usersStr.match(/\d{17,19}/g) || [];
        userIds.push(...extra);
      }
    } else {
      // Prefix command: removepublisher @u1 @u2 123456...
      for (const arg of args) {
        const m = arg.match(/^(?:<@!?)?(\d{17,19})>?$/);
        if (m) userIds.push(m[1]);
      }
    }

    // تنظيف التكرارات
    userIds = [...new Set(userIds)];

    if (userIds.length === 0) {
      return replyOrFollowUp(interactionOrMessage, {
        embeds: [embedSimple(client, LANG.ar.ERROR_MENTION_USER.title, LANG.ar.ERROR_MENTION_USER.description, "Red")]
      });
    }

    // ⭐️ (إضافة defer لضمان عدم انتهاء مهلة التفاعل)
    if (interactionOrMessage.deferReply) {
      await interactionOrMessage.deferReply({ ephemeral: true });
    }

    let removed = [];
    let notFound = [];
    let failed = [];

    for (const uid of userIds) {
      try {
        const exists = await db.get("SELECT 1 FROM publishers WHERE userId = ?", uid);
        if (!exists) {
          notFound.push(`<@${uid}>`);
          continue;
        }

        // =========================================================
        // ========= ⭐️ هذا هو التحديث المطلوب ⭐️ =================
        // =========================================================

        // 1. جلب *كل* رسائل الإعلانات لهذا الناشر (من كل السيرفرات)
        //    من الجدول الجديد 'publisher_ad_messages'
        const adMessages = await db.all(
            "SELECT guildId, messageId FROM publisher_ad_messages WHERE userId = ?",
            uid
        );

        // 2. محاولة حذف الرسائل من قنوات الديسكورد
        if (adMessages.length > 0) {
          for (const msg of adMessages) {
            try {
              // جلب قناة الإعلانات الخاصة بالسيرفر
              const keyScoped = `adChannel:${msg.guildId}`;
              const row = await db.get("SELECT value FROM config WHERE key = ?", keyScoped);
              if (!row) row = await db.get("SELECT value FROM config WHERE key = 'adChannel'"); // fallback
              const channelId = row?.value;

              if (channelId) {
                const channel = await client.channels.fetch(channelId).catch(() => null);
                if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
                  const message = await channel.messages.fetch(msg.messageId).catch(() => null);
                  if (message) await message.delete();
                }
              }
            } catch (e) {
              console.warn(`[RemovePublisher] فشل حذف رسالة إعلان قديمة (ID: ${msg.messageId}): ${e.message}`);
            }
          }
        }

        // 3. حذف الناشر من الجدول الرئيسي.
        //    بفضل 'ON DELETE CASCADE' في index.js (v7.9)،
        //    سيتم حذف بياناته من 'stats' و 'post_log' و 'publisher_ad_messages' تلقائياً.
        await db.run("DELETE FROM publishers WHERE userId = ?", uid);

        // (الأسطر القديمة هذه لم تعد ضرورية بسبب ON DELETE CASCADE)
        // await db.run("DELETE FROM stats WHERE userId = ?", uid);
        // await db.run("DELETE FROM post_log WHERE userId = ?", uid);

        // =========================================================
        // ========= ⭐️ نهاية التحديث ⭐️ ===========================
        // =========================================================

        removed.push(`<@${uid}>`);
      } catch (e) {
        console.error("removepublisher error:", e);
        failed.push(`<@${uid}>`);
      }
    }

    const embed = new EmbedBuilder().setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });

    if (removed.length > 0) {
      embed.addFields({ name: LANG.ar.SUCCESS_PUBLISHER_REMOVED, value: removed.join("\n") }).setColor(0x3BA55D);
    }
    if (notFound.length > 0) {
      embed.addFields({ name: LANG.ar.ERROR_PUBLISHER_NOT_FOUND_TITLE.replace("{tag}", ""), value: notFound.join("\n") }).setColor(0xFEE75C);
    }
    if (failed.length > 0) {
      embed.addFields({ name: "⚠️ فشل الإزالة", value: failed.join("\n") }).setColor(0xED4245);
    }
    if (removed.length === 0 && notFound.length === 0 && failed.length === 0) {
      embed.setDescription("لم يتم التعرف على أي مستخدمين صالحين.").setColor(0xED4245);
    }

    // ⭐️ (تعديل الرد ليعمل مع defer)
    if (interactionOrMessage.editReply) {
         return interactionOrMessage.editReply({ embeds: [embed] });
    }
    return replyOrFollowUp(interactionOrMessage, { embeds: [embed] });
  }
};