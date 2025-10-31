// 📁 commands/customize.js (النسخة 8.1 - مصححة من أخطاء SQL)

import {
replyOrFollowUp,
embedSimple,
checkAdmin,
LANG,
CUSTOMIZABLE_COMMANDS,
} from "../utils.js";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";

const isValidHex = (hex) => /^#?[0-9A-Fa-f]{6}$/.test(hex || "");
const isValidUrl = (u) => /^https?:\/\/\S+$/i.test(u || "");

export default {
name: "customize",
description: "[إدارة] تخصيص لون وصور بعض إيمبدات الأوامر.",
adminOnly: true,
options: [
{ name: "command", description: "الأمر المراد تخصيصه.", type: ApplicationCommandOptionType.String, required: true, choices: CUSTOMIZABLE_COMMANDS.map((cmd) => ({ name: cmd, value: cmd })) },
{ name: "image", description: 'رابط الصورة الكبيرة (URL)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false },
{ name: "thumbnail", description: 'رابط الصورة الصغيرة (URL)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false },
{ name: "color", description: 'كود اللون الجديد (Hex)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false },
],

async execute(client, interactionOrMessage, args, db) {
if (!(await checkAdmin(interactionOrMessage, db))) {
return replyOrFollowUp(interactionOrMessage, {
embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")],
flags: MessageFlags.Ephemeral,
});
}

const guildId = interactionOrMessage.guildId; 
if (!guildId) return; 

let command, image, color, thumbnail;

if (interactionOrMessage.user) {
command = interactionOrMessage.options.getString("command");
image = interactionOrMessage.options.getString("image");
thumbnail = interactionOrMessage.options.getString("thumbnail");
color = interactionOrMessage.options.getString("color");
} else {
const [cmdArg, imgArg, colorArg, thumbArg] = args;
command = cmdArg;
image = imgArg;
color = colorArg;
thumbnail = thumbArg;
}

if (!command || !CUSTOMIZABLE_COMMANDS.includes(command)) {
return replyOrFollowUp(interactionOrMessage, {
embeds: [embedSimple(client, "❌ خطأ", `استخدم أحد الأوامر القابلة للتخصيص فقط:\n\`${CUSTOMIZABLE_COMMANDS.join("`, `")}\``, "Red" )],
flags: MessageFlags.Ephemeral,
});
}

let newImage = null;
let newThumbnail = null;
let newColor = null;
let resetImage = false;
let resetThumbnail = false;
let resetColor = false;

if (typeof image === "string") {
if (image.toLowerCase?.() === "reset") resetImage = true;
else if (!isValidUrl(image)) {
return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "رابط الصورة الكبيرة غير صالح.", "Red")], flags: MessageFlags.Ephemeral });
} else { newImage = image; }
}

if (typeof thumbnail === "string") {
if (thumbnail.toLowerCase?.() === "reset") resetThumbnail = true;
else if (!isValidUrl(thumbnail)) {
return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "رابط الصورة الصغيرة (thumbnail) غير صالح.", "Red")], flags: MessageFlags.Ephemeral });
} else { newThumbnail = thumbnail; }
}

if (typeof color === "string") {
if (color.toLowerCase?.() === "reset") resetColor = true;
else if (!isValidHex(color)) {
return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", LANG.ar.CUSTOMIZE_INVALID_COLOR, "Red")], flags: MessageFlags.Ephemeral });
} else { newColor = color.startsWith("#") ? color : `#${color}`; }
}

try {
// ⬅️ (استعلام نظيف)
const current = await db.get(
"SELECT color, image, thumbnail FROM customization WHERE guildId = ? AND command = ?",
guildId, command
);

const merged = {
color: resetColor ? null : newColor ?? current?.color ?? null,
image: resetImage ? null : newImage ?? current?.image ?? null,
thumbnail: resetThumbnail ? null : newThumbnail ?? current?.thumbnail ?? null,
};

// ⬅️ (استعلام نظيف)
await db.run(
`INSERT INTO customization (guildId, command, color, image, thumbnail)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(guildId, command) DO UPDATE SET
color = excluded.color,
image = excluded.image,
thumbnail = excluded.thumbnail`,
guildId, command, merged.color, merged.image, merged.thumbnail
);

const changes = [];
if (resetImage) changes.push("الصورة الكبيرة ➜ reset");
else if (newImage) changes.push(`الصورة الكبيرة ➜ تم التحديث`);
if (resetThumbnail) changes.push("الصورة الصغيرة ➜ reset");
else if (newThumbnail) changes.push(`الصورة الصغيرة ➜ تم التحديث`);
if (resetColor) changes.push("اللون ➜ reset");
else if (newColor) changes.push(`اللون ➜ ${newColor}`);
const changedText = changes.length ? changes.join("\n") : "لا يوجد تغييرات.";

return replyOrFollowUp(interactionOrMessage, {
embeds: [embedSimple(client, "✅ تم الحفظ", `${LANG.ar.CUSTOMIZE_SUCCESS.replace("{command}", command)}\n${changedText}`, "Green")],
flags: MessageFlags.Ephemeral
});
} catch (e) {
console.error("customize failed:", e);
// ⬅️ (نستخدم رسالة الخطأ الأصلية)
return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", `تعذر الحفظ: ${e.message}`, "Red")], flags: MessageFlags.Ephemeral });
}
},
};