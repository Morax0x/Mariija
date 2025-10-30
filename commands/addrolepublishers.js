// 📁 commands/addrolepublishers.js (النسخة 8.0 - تدعم السيرفرات)

import { EmbedBuilder, MessageFlags, ChannelType } from "discord.js";
import { 
    LANG, 
    checkAdmin, 
    replyOrFollowUp, 
    embedSimple,
    createSummaryEmbed, // ⬅️ دالة محدثة
    getGuildAdChannelId, // ⬅️ دالة محدثة
    buildSummaryComponents,
    sendOrUpdatePublisherAd // ⬅️ دالة محدثة
} from "../utils.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default {
  name: "addrolepublishers",
  description: "[إدارة] إضافة كل أعضاء رتبة كـ ناشرين.",
  adminOnly: true,
  async execute(client, interactionOrMessage, args, db) {
    if (!(await checkAdmin(interactionOrMessage, db))) {
      return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
    }

    const guild = interactionOrMessage.guild;
    if (!guild) return;

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
    const addedMembersList = []; 
    const listedEmbed = []; 

    for (const m of members.values()) {
      if (m.user.bot) {
        skippedBots++;
        continue;
      }
      try {
        // ⬅️ (فلترة حسب السيرفر)
        const existing = await db.get("SELECT 1 FROM publishers WHERE userId = ? AND guildId = ?", m.id, guild.id);
        if (existing) {
          already++;
        } else {
          // ⬅️ (إضافة مع guildId)
          await db.run("INSERT OR IGNORE INTO publishers (guildId, userId, tag, joinDate) VALUES (?, ?, ?, ?)", guild.id, m.id, m.user.tag, new Date().toISOString());
          added++;
          addedMembersList.push(m.id); 
          if (listedEmbed.length < 25) {
             listedEmbed.push(`<@${m.id}>`);
          }
        }
      } catch (e) {
        // (تجاهل الأخطاء)
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle("✅ تمت إضافـة الناشـرين")
      .setColor(0x3BA55D)
      .addFields(
        { name: "الرتبة", value: `${role}`, inline: false },
        { name: `المضافون (${added})`, value: added > 0 ? listedEmbed.join("\n") : "لا أحد", inline: false },
        { name: "إحصائيات", value: `موجودون مسبقاً: **${already}**\nتم تخطيهم (بوتات): **${skippedBots}**`, inline: false }
      );

    await replyOrFollowUp(interactionOrMessage, { embeds: [embed], flags: MessageFlags.Ephemeral });

    // --- (التحديث البطيء لقناة الإعلانات) ---
    if (addedMembersList.length > 0) {
        // ⬅️ (الدوال محدثة وتستخدم guild.id)
        const adChannelId = await getGuildAdChannelId(db, guild.id);
        const adChannel = adChannelId ? await client.channels.fetch(adChannelId).catch(() => null) : null;
        
        if (adChannel) {
            console.log(`[AdChannel] بدء تحديث ${addedMembersList.length} ناشر مضاف حديثاً...`);
            for (const memberId of addedMembersList) {
                await sendOrUpdatePublisherAd(client, db, guild.id, memberId, '30d').catch(() => {});
                await delay(2000); 
            }
            
            const defaultTimeframe = '30d';
            const summary = await createSummaryEmbed(client, db, defaultTimeframe, guild.id).catch(() => null);
            if (summary) {
                const components = buildSummaryComponents(guild.id, defaultTimeframe);
                const summaryKey = `summaryMessageId:${guild.id}`;
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
            console.log("[AdChannel] اكتمل تحديث الناشرين.");
        }
    }
  }
}
