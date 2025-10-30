// 📁 commands/addroleadmins.js (النسخة 8.0 - تدعم السيرفرات)

import { EmbedBuilder, MessageFlags } from "discord.js";
import { 
    LANG, 
    checkAdmin, 
    replyOrFollowUp, 
    embedSimple
} from "../utils.js";

export default {
  name: "addroleadmins",
  description: "[إدارة] إضافة كل أعضاء رتبة كـ مشرفين.",
  adminOnly: true,
  async execute(client, interactionOrMessage, args, db) {
    if (!(await checkAdmin(interactionOrMessage, db))) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
    }

    const guild = interactionOrMessage.guild;
    if (!guild) return; // (يجب أن يكون داخل سيرفر)

    if (interactionOrMessage.user) { // ⬅️ (تحقق للسلاش)
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
    const listedEmbed = []; 

    for (const m of members.values()) {
      if (m.user.bot) {
        skippedBots++;
        continue;
      }
      try {
        // ⬅️ (فلترة حسب السيرفر)
        const existing = await db.get("SELECT 1 FROM admins WHERE userId = ? AND guildId = ?", m.id, guild.id);
        if (existing) {
          already++;
        } else {
          // ⬅️ (إضافة مع guildId)
          await db.run("INSERT OR IGNORE INTO admins (guildId, userId) VALUES (?, ?)", guild.id, m.id);
          added++;
          if (listedEmbed.length < 25) {
             listedEmbed.push(`<@${m.id}>`);
          }
        }
      } catch (e) {
        // (تجاهل الأخطاء الفردية)
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle("✅ تمت إضافـة المشرفين")
      .setColor(0x3BA55D)
      .addFields(
        { name: "الرتبة", value: `${role}`, inline: false },
        { name: `المضافون (${added})`, value: added > 0 ? listedEmbed.join("\n") : "لا أحد", inline: false },
        { name: "إحصائيات", value: `موجودون مسبقاً: **${already}**\nتم تخطيهم (بوتات): **${skippedBots}**`, inline: false }
      );

    return replyOrFollowUp(interactionOrMessage, { embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
