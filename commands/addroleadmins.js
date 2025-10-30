// 📁 commands/addroleadmins.js (النسخة 7.2 - المصححة)

import { EmbedBuilder, MessageFlags } from "discord.js";
import { 
    LANG, 
    checkAdmin, 
    replyOrFollowUp, 
    embedSimple
} from "../utils.js";

export default {
  name: "addroleadmins",
  description: "إضافة كل أعضاء رتبة كـ مشرفين.",
  adminOnly: true, // (أو ownerOnly: true إذا أردت)
  async execute(client, interactionOrMessage, args, db) {
    if (!(await checkAdmin(interactionOrMessage, db))) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
    }

    const guild = interactionOrMessage.guild;
    if (!guild) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "خطأ", "الأمر يجب أن يُستخدم داخل سيرفر.", "Red")] });
    }

    // *** 🟢 تصحيح 1: التحقق إذا كان الأمر سلاش لتأجيل الرد ***
    if (interactionOrMessage.user) {
        await interactionOrMessage.deferReply({ ephemeral: true });
    }

    let role = null;
    if (interactionOrMessage.user) {
      role = interactionOrMessage.options.getRole("role");
    } else {
      const raw = args?.[0];
      if (!raw) {
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "خطأ", "حدد رتبة بالمنشن أو الـ ID.", "Red")] });
      }
      const roleId = raw.replace(/[<@&>]/g, "");
      role = guild.roles.cache.get(roleId) || null;
      if (!role) {
        try { role = await guild.roles.fetch(roleId); } catch { role = null; }
      }
    }

    if (!role) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "خطأ", "لم أتمكن من العثور على الرتبة.", "Red")] });
    }

    // جلب الأعضاء (قد يستغرق وقتاً)
    try {
        await guild.members.fetch();
    } catch (e) {
        console.error("Failed to fetch members:", e);
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "فشل جلب قائمة الأعضاء. تأكد من تفعيل (GuildMembers Intent) في البوت.", "Red")] });
    }

    const members = guild.members.cache.filter(m => m.roles.cache.has(role.id));
    if (members.size === 0) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "معلومة", "لا يوجد أعضاء في هذه الرتبة.", "Yellow")] });
    }

    let added = 0;
    let skippedBots = 0;
    let already = 0;
    let dbErrors = 0;
    const listedEmbed = []; // قائمة للمنشن في الإيمبد

    for (const m of members.values()) {
      if (m.user.bot) {
        skippedBots++;
        continue;
      }
      try {
        const existing = await db.get("SELECT 1 FROM admins WHERE userId = ?", m.id);
        if (existing) {
          already++;
        } else {
          // *** تغيير: الإضافة إلى جدول "admins" ***
          await db.run("INSERT OR IGNORE INTO admins (userId) VALUES (?)", m.id);
          added++;
          if (listedEmbed.length < 25) {
             listedEmbed.push(`<@${m.id}>`);
          }
        }
      } catch {
        dbErrors++;
      }
    }

    // *** 🟢 تصحيح 2: إزالة سطر الأخطاء حسب طلبك ***
    const embed = new EmbedBuilder()
      .setTitle("✅ تمت إضافـة المشرفين") // (تم تغيير العنوان)
      .setColor(0x3BA55D)
      .addFields(
        { name: "الرتبة", value: `${role}`, inline: false },
        { name: `المضافون (${added})`, value: added > 0 ? listedEmbed.join("\n") : "لا أحد", inline: false },
        { name: "إحصائيات", value: `موجودون مسبقاً: **${already}**\nتم تخطيهم (بوتات): **${skippedBots}**`, inline: false }
      );

    return replyOrFollowUp(interactionOrMessage, { embeds: [embed] });
  }
}
