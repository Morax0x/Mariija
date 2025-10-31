// 📁 utils.js (النسخة 8.0 - الكاملة / تدعم السيرفرات)

import {
    EmbedBuilder, PermissionsBitField, ChannelType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    MessageFlags, Collection, ApplicationCommandOptionType
} from "discord.js";
import emojiRegex from 'emoji-regex';

// --- (ثوابت البوت) ---
export const OWNER_ID = '1145327691772481577';
export const DB_PATH = "./publisher_stats2.db";
export const HELP_IMAGE_URL = 'https://i.postimg.cc/Dfb79B76/Help.jpg';
export const STATS_IMAGE_URL = 'https://i.postimg.cc/Dfb79B76/Help.jpg';
export const SUMMARY_IMAGE_URL = 'https://i.postimg.cc/Dfb79B76/Help.jpg';
export const DEFAULT_EMBED_COLOR = 0xFFFFFF;
export const CUSTOMIZABLE_COMMANDS = ['listadmins', 'listchannels', 'listpublishers', 'stats_top'];
export const fixedChannelOrder = ['هنتـاي', 'القوانين', 'الرتب', 'الدليل', 'التعزيز', 'مستويات', 'البوابة'];
export let البادئة = "!"; // (البادئة الافتراضية العالمية)

// --- (ملف اللغة، كما هو) ---
export const LANG = {
ar: {
HELP_TITLE: "✥ لـوحـة الأوامـر",
HELP_DESC: '\u200b',
HELP_FIELDS: {
MAIN: [{ name: "الإعدادات الأسـاسيـة", value: "✶ `setprefix <بادئة_جديدة>`\n- تعيين بادئـة (Prefix) جديدة للبوت.\n\n✶ `addadmin @م1 @م2`\n- إضافة مستخدم (أو عدة مستخدمين) إلى قائمة المشرفين.\n\n✶ `removeadmin @مستخدم`\n- إزالة مستخدم محدد من قائمة المشرفين.\n\n✶ `listadmins`\n- عرض قائمة المشرفين المعينين.\n\n✶ `addroleadmins @Role`\n- استيراد كل أعضاء رتبة كمشرفين (مرة واحدة – غير تلقائي).\n\n✶ `setadchannel #قناة`\n- تعيين قناة لإعلانات وتحديثات الناشرين.\n\n✶ `customize`\n- تخصيص ألوان وصور بعض إيمبدات الأوامر.", inline: false }],
CHANNELS: [{ name: "إدارة القنوات", value: "✶ `setchannels #ق1 #ثريد1 ...`\n- إضافة قناة نصية أو ثريد/بوست للمراقبة (يدعم الكاتاغوري والقنوات النصية وإضافة بوستات ).\n\n✶ `removechannel #ق1 #ثريد1 ...`\n- إزالة قناة نصية أو ثريد/بوست من المراقبة (يدعم الكاتاغوري ).\n\n✶ `listchannels`\n- عرض العناصر (القنوات/الثريدات/البوستات) المعينة للتتبع.", inline: false }],
PUBLISHERS: [{ name: "إدارة الناشرين", value: "✶ `addpublisher @م1 @م2 ...`\n- إضافة ناشر رسمي (أو عدة ناشرين) للمراقبة.\n\n✶ `removepublisher @مستخدم`\n- إزالة ناشر وحذف سجلاته.\n\n✶ `listpublishers`\n- عرض قائمة الناشرين المسجلين.\n\n✶ `addrolepublishers @Role`\n- استيراد كل أعضاء رتبة كناشرين (مرة واحدة – غير تلقائي).", inline: false }],
STATS: [{ name: "الإحصائيات", value: "✶ `top`\n- عرض قائمة أعلى الناشرين.\n\n✶ `stats [@مستخدم]`\n- عرض إحصائيات الناشر (أو إحصائياتك إذا كنت ناشراً).\n\n✶ `stats @مستخدم #قناة`\n- عرض إجمالي النقاط للناشر في قناة/عنصر محدد.\n\n✶ `channelstats`\n- عرض إحصائيات النقاط حسب القناة.\n\n✶ `resetstats @مستخدم [all | #ق1 #ق2 ...]`\n- إعادة تعيين نقاط ناشر. (`all` لحذف السجلات بالكامل، أو قنوات/عناصر محددة).", inline: false }]
},
ERROR_PERM: "صلاحية غير كافيــة",
ERROR_MENTION_USER: { title: "✶ هــاه؟", description: "- حـدد مستخدم على الاقل يا حلو <:0Kkiss:1413810014979887144>" },
ERROR_MENTION_CHANNEL: "فضلاً، علّم قناة نصية بالمنشن.",
ERROR_MENTION_ROLE: "فضلاً، علّم رتبة بالمنشن.",
ERROR_PUBLISHER_EXISTS: "✶ المستخدم {tag}",
ERROR_PUBLISHER_NOT_FOUND: "يـا سـطـل الي تحاول تسويـله ازالـة مو مسجل كـ ناشـر اصلا <:1creepout:1414567816736149617>!",
ERROR_PUBLISHER_NOT_FOUND_TITLE: "✥ همم .. ؟ {tag}",
ERROR_NO_PUBLISHERS: "ما فيه ناشرين مسجلين بعد.",
ERROR_NO_STATS: "مو مسجل كـ ناشـر بعد سجله كـ نـاشـر اولا عشان تطلع الاحصائيات",
ERROR_NO_STATS_TITLE: "✥ المستخدم: {tag}",
ERROR_NO_CHANNELS_SET: "لم يتم تعيين قنوات للمراقبة بعد.",
ERROR_SQL: "حدث خطأ في قاعدة البيانات أثناء تنفيذ الأمر.",
ERROR_STATS_SELF_NOT_PUBLISHER: { title: "لست ناشراً بعد!", description: "لا يمكنك عرض إحصائياتك لأنك لست مسجلاً كناشر." },
SUCCESS_LANG_SET: "تم تعيين لغة البوت إلى العربية.",
SUCCESS_PREFIX_SET: "تم تعيين بادئة البوت الجديدة إلى `{newPrefix}`.",
SUCCESS_ADMIN_USER_SET: "✶ تـم تعييـن الـمشرف بنجـاح",
SUCCESS_ADMIN_REMOVED: "✶ تـمـت الازالـة بـنجـاح",
ERROR_NO_ADMIN_SET: "لا يوجد مسؤول محدد لإزالته حاليًا.",
ERROR_ADMIN_NOT_LISTED: "المستخدم **{userName}** ليس ضمن قائمة المشرفين المعينين.",
SUCCESS_ADMIN_ADDED: "✶ تم إضافة المشرفين بنجاح",
SUCCESS_CHANNELS_TITLE: "✅ تـم تـحـديـث الـقـنـوات",
SUCCESS_CHANNELS_SET: "تم تحديث القنوات التالية للمراقبة:\n{channels}",
SUCCESS_CHANNEL_REMOVED_TITLE: "❌ تـمـت إزالـة الـقـنوات",
SUCCESS_CHANNEL_REMOVED: "تم إزالة القـنـوات التالية من المراقبة:\n{channels}",
SUCCESS_CHANNELS_LIST_TITLE: "✥ الـقـنوات الـمـراقـبـة",
SUCCESS_AD_CHANNEL_SET_TITLE: "✅ قنـاة الإعلانات",
SUCCESS_AD_CHANNEL_SET_DESC: "تم تعيين قناة {channel} لاستقبال تحديثات الناشرين اليومية والإعلانات.",
SUCCESS_BACKUP_SENT: "✅ تم إرسال نسخة احتياطية من قاعدة البيانات إلى خاصك.",
ERROR_OWNER_ONLY: "✥ هـذا الأمـر لـصاحـب الـبـوت فـقـط",
SUCCESS_DB_DOWNLOADED: "✅ تم إرسال ملف قاعدة البيانات الحالي إلى خاصك.",
ERROR_DB_UPLOAD_NO_FILE: "❌ الرجاء إرفاق ملف `.db` واحد فقط مع الأمر.",
ERROR_DB_UPLOAD_FAIL: "❌ فشل تحديث قاعدة البيانات: {error}",
SUCCESS_DB_UPLOADED: "✅ تم استلال الملف. جارٍ محاولة تحديث قاعدة البيانات...",
SUCCESS_DB_REPLACED: "🎉 تم تحديث قاعدة البيانات بنجاح! قد يستغرق البوت لحظات لإعادة الاتصال بالملف الجديد.",
SUCCESS_PUBLISHER_ADDED_TITLE: "✥ تـم اضـافـة الـناشـر بنجـاح",
SUCCESS_PUBLISHER_ADDED_DESC: "تمـت إضافـة **{tag}** كناشر سيبدأ تتبع نـشـره الآن.",
SUCCESS_PUBLISHER_AD_SENT: "تم إرسال إحصائياته إلى قناة الإعلانات.", 
SUCCESS_PUBLISHER_ADDED_FIELD_1: "✥ الـنـاشـر الجـديـد",
SUCCESS_PUBLISHER_ADDED_FIELD_2: "✥ تاريـخ الاضافة",
SUCCESS_PUBLISHERS_ADDED_TITLE: "✅ تمت إضافـة الناشـرين",
ERROR_PUBLISHERS_ADDED_DESC: "تمت إضافة الناشرين التاليين بنجاح:",
ERROR_PUBLISHERS_ADD_FAIL_TITLE: "⚠️ فشل إضافة بعض الناشـرين",
ERROR_PUBLISHERS_ADD_FAIL_DESC: "تمت إضافة البعض بنجاح، لكن فشلت إضافة التاليين:",
ERROR_PUBLISHERS_ADD_NONE: { title: "❌ لم يتم العثور على مستخدمين صالحين", description: "لم يتم تحديد أي مستخدمين صالحين للإضافة. تأكد من استخدام منشن أو ID صحيح." },
PUBLISHER_ADD_FAIL_ALREADY: "(مضـاف بالفـعـل)",
PUBLISHER_ADD_FAIL_DB: "(خطأ قاعدة بيانات)",
PUBLISHER_ADD_FAIL_FETCH: "(لـم يتم العثـور على المستـخدم)",
SUCCESS_STATS_RESET_USER: "تم تصفيـر الناشر **{tag}** في جميع القنـوات.", 
SUCCESS_STATS_RESET_ALL: "تم تصفير وحذف جميع سجلات الناشر **{tag}** من قاعدة البيانات.", 
SUCCESS_PUBLISHER_REMOVED: "✥ تـمـت ازالـة الـناشـر",
SUCCESS_PUBLISHER_AD_DELETED: "تم حذف رسالة إحصائياته من قناة الإعلانـات.", 
STATS_TOP_TITLE: "✥ لائـحـة متصـدريـن النـشـر",
STATS_CHANNEL_LIST_TITLE: "✥ إحصائيات النشر حسب الـقنـاة",
STATS_USER_TITLE: "✥ احـصـائيـات الـنـاشـر {nickname}",
STATS_USER_CHANNEL_TITLE: "✥ احـصـائيـات الـنـاشـر {nickname}",
STATS_TOTAL_POINTS: "",
STATS_PER_CHANNEL: "نقاط حسب القنـاة",
STATS_NO_POINTS: "لا توجـد نقاط مسجـلة بعـد.",
LOG_POINTS_INCREASED: "تم زيـادة {points} لـ {tag} في {channelName}.", 
LOG_POINTS_DECREASED: "تم خصم {points} من {tag} (حذف محتوى) في {channelName}.", 
ERROR_ROLE_PERM: "يجب أن تمتلك صلاحية 'Manage Server' أو رتبة {roleName} لاستخدام هذا الأمر.",
BUTTON_PREV: "⬅️",
BUTTON_NEXT: "➡️",
BUTTON_PAGE: "{current}/{total}",
JOIN_DATE_FORMAT: "Join: {joinDate}",
LAST_POST_DATE_FORMAT: "Last Post: {lastPostDate}",
NON_ACTIVITY_FORMAT: "لا يوجد",
FOOTER_SEPARATOR: " | ",
STATS_TOTAL_FIELD_NAME: "✶ الـمـجمـوع", 
STATS_FIELD_TITLE_TOTAL: "✶ Total",
INVISIBLE_FIELD_TITLE: '\u200b',
STATS_CHANNEL_POINTS: "✶ المجموع في هذه الـقنـاة", 
STATS_CHANNEL_TOTAL: "✶ المجموع الكلي", 
STATS_CHANNEL_NAME_FIELD: "✶ الـقـنـاة:",
ERROR_CHANNEL_NOT_MONITORED: { title: "✥ هـمم ... ؟", description: "الـقنـاة التي حددتها ليست ضمن قنوات المراقبة. عينها أولاً." },
CUSTOMIZE_INVALID_COLOR: "❌ كود اللون غير صالح. يجب أن يكون بصيغة Hex (مثال: #FF0000).",
CUSTOMIZE_INVALID_URL: "❌ رابط الصورة غير صالح. تأكد من أنه يبدأ بـ http أو https.",
CUSTOMIZE_SUCCESS: "✅ تم حفظ تخصيص الإيمبد للأمر `{command}`.",
CUSTOMIZE_RESET_SUCCESS: "✅ تم إعادة تعيين تخصيص الإيمبد للأمر `{command}`.",
SUMMARY_TITLE: "✥ احـصـائيـات الـيوم",
SUMMARY_TOP_PUBLISHERS: "✶ اعلـى الـنـاشـريـن:",
SUMMARY_TOP_CHANNELS: "✶ اعلـى الـقـنوات:",
SUMMARY_TOTAL_POINTS: "✶ مجموع نقاط السيرفر:",
SUMMARY_NO_PUBLISHERS: "لا يوجد ناشرون بعد.",
SUMMARY_NO_CHANNELS: "لا توجد قنوات بعد."
}
};

// --- (تحديث: تم تعديل خيارات الأوامر لتتوافق مع التحديثات) ---
export const SLASH_COMMANDS = [
    { name: 'top', description: 'عـرض قائـمـة أعـلـى الناشـرين.' },
    { name: 'stats', description: 'عرض إحصائيات ناشـر (أو إحصائياتك إذا لم تمنشن).', options: [{ name: 'user', description: 'الناشر المراد عرض إحصائياتـه (منشن أو ID). اتركه فارغاً لعرض إحصائياتك.', type: ApplicationCommandOptionType.User, required: false }, { name: 'channel', description: 'العنصر المحدد (قناة/ثريد/بوست) لعرض إحصائياته.', type: ApplicationCommandOptionType.Channel, required: false, channel_types: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread] }] },
    { name: 'channelstats', description: 'عرض إحصائيات النشر حسب القناة.', options: [{ name: 'channel', description: 'العنصر المراد عرض إحصائياته (منشن أو ID).', type: ApplicationCommandOptionType.Channel, required: false, channel_types: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread] }] },
    { name: 'listpublishers', description: 'عرض قائمة الناشرين المسجلين.' },
    { name: 'listadmins', description: 'عرض قائمة المشرفين المعينين.' },
    { name: 'listchannels', description: 'عرض (القنوات/الثريدات/البوستات) المعينة للتتبـع.' },
    { name: 'help', description: 'عرض قائمة أوامـر البوت.' },
    { name: 'setprefix', description: '[إدارة] تعيين بادئة جديدة للبوت (لهذا السيرفر فقط).', options: [{ name: 'new_prefix', description: 'البادئة الجديدة المطلوبة.', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'addadmin', description: '[إدارة] إضافة مستخدم كـ مشرف نشـر.', options: [{ name: 'user', description: 'المستخدم المراد إضافته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }] },
    { name: 'removeadmin', description: '[إدارة] إزالة مشرف نشر.', options: [{ name: 'user', description: 'المستخدم المراد إزالته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }] },
    { name: 'setchannels', description: '[إدارة] إضافة قنوات نصية أو ثريدات/بوستات للمراقبة (يدعم الكاتاغوري).', options: [{ name: 'channels', description: 'القناة أو الكاتاغوري (منشن أو ID).', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'removechannel', description: '[إدارة] إزالة قنوات نصية أو ثريدات/بوستات من المراقبة (يدعم الكاتاغوري والقنوات).', options: [{ name: 'channels', description: 'العناصر أو الكاتاغوري المراد إزالتها (منشن أو ID).', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'addpublisher', description: '[إدارة] إضافة ناشر رسمي (أو عدة ناشرين).', options: [{ name: 'users', description: 'المستخدمون المراد إضافتهم (منشن أو ID، يمكن وضع أكثر من واحد).', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'removepublisher', description: '[إدارة] إزالة ناشر أو عدة ناشرين وحذف سجلاتهم.', options: [
        { name: 'user', description: 'مستخدم واحد (منشن أو ID).', type: ApplicationCommandOptionType.User, required: false },
        { name: 'users', description: 'عدة مستخدمين (منشنات/IDs بمحتوى نصّي).', type: ApplicationCommandOptionType.String, required: false }
    ] },
    { name: 'resetstats', description: '[إدارة] إعادة تعيين نقاط ناشر.', options: [{ name: 'user', description: 'الناشر المراد تصفير نقاطه (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }, { name: 'channels', description: '"all", "1d", "YYYY-MM-DD", أو #قناة (منشن أو ID)', type: ApplicationCommandOptionType.String, required: false }] },
    { name: 'setadchannel', description: '[إدارة] تعيين قناة إعلانات الناشرين (لهذا السيرفر).', options: [{ name: 'channel', description: 'القناة التي ستستقبل التحديثات.', type: ApplicationCommandOptionType.Channel, required: true, channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
    { name: 'customize', description: '[إدارة] تخصيص لون وصورة بعض إيمبدات الأوامر.', options: [{ name: 'command', description: 'الأمر المراد تخصيص إيمبده.', type: ApplicationCommandOptionType.String, required: true, choices: CUSTOMIZABLE_COMMANDS.map(cmd => ({ name: cmd, value: cmd })) }, { name: 'image', description: 'رابط الصورة الكبيرة (URL)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false }, { name: 'thumbnail', description: 'رابط الصورة الصغيرة (URL)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false }, { name: 'color', description: 'كود اللون الجديد (Hex)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false }] },
    { name: 'addrolepublishers', description: '[إدارة] إضافة كل أعضاء رتبة كـ ناشرين.', options: [{ name: 'role', description: 'الرتبة المطلوب استيراد أعضائها كـ ناشرين', type: ApplicationCommandOptionType.Role, required: true }] },
    { name: 'addroleadmins', description: '[إدارة] إضافة كل أعضاء رتبة كـ مشرفين.', options: [{ name: 'role', description: 'الرتبة المطلوب استيراد أعضائها كـ مشرفين', type: ApplicationCommandOptionType.Role, required: true }] }
];

const emoji = emojiRegex();

export function isOwner(userId) { return userId === OWNER_ID; }

// ==========================================================
// *** 🟢 (تعديل: checkAdmin أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function checkAdmin(interactionOrMessage, db) {
    const user = interactionOrMessage.user || interactionOrMessage.author;
    const guildId = interactionOrMessage.guildId;

    if (isOwner(user.id)) return true;
    if (!guildId) return false; // (لا يمكن أن تكون مشرفاً في الخاص)
    if (interactionOrMessage.member?.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
    
    const admin = await db.get("SELECT 1 FROM admins WHERE userId = ? AND guildId = ?", user.id, guildId);
    return !!admin;
}

// (الدوال المساعدة: replyOrFollowUp, getAuthorId, cleanChannelName - كما هي)
export async function replyOrFollowUp(interactionOrMessage, options) {
    if (interactionOrMessage.user) {
        if (options.ephemeral) {
            options.flags = MessageFlags.Ephemeral;
            delete options.ephemeral;
        }
        try {
            if (interactionOrMessage.deferred || interactionOrMessage.replied) {
                return await interactionOrMessage.followUp(options);
            } else {
                return await interactionOrMessage.reply(options);
            }
        } catch (error) {
            if (error.code === 10062) {
                console.warn(`Attempted to reply/followUp to an unknown interaction: ${interactionOrMessage.id}`);
                return null;
            } else {
                console.error("Error during interaction reply/followUp:", error);
                throw error;
            }
        }
    } else {
        return interactionOrMessage.reply({ ...options, fetchReply: true });
    }
}
export function getAuthorId(interactionOrMessage) {
    return interactionOrMessage.user?.id || interactionOrMessage.author?.id;
}
export function cleanChannelName(name) {
    if (!name) return 'unknown';
    const firstEmojiMatch = name.match(emoji);
    const firstEmoji = firstEmojiMatch ? firstEmojiMatch[0] : '';
    const cleanedText = name
        .replace(emoji, '')
        .replace(/[^\p{L}\p{N}\s\-#・]/gu, '')
        .trim();
    const finalName = (firstEmoji + ' ' + cleanedText).trim();
    return finalName || 'unknown';
}

// ==========================================================
// *** 🟢 (تعديل: getCustomization أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function getCustomization(db, command, guildId) {
    if (!guildId) {
        return { color: DEFAULT_EMBED_COLOR, image: null, thumbnail: null };
    }
    const custom = await db.get("SELECT color, image, thumbnail FROM customization WHERE command = ? AND guildId = ?", command, guildId);
    return {
        color: custom?.color ? parseInt(custom.color.slice(1), 16) : DEFAULT_EMBED_COLOR,
        image: custom?.image || null,
        thumbnail: custom?.thumbnail || null
    };
}

// (embedSimple - كما هي)
export function embedSimple(client, title, description, color) {
    const colorMap = { "Green": 0x3BA55D, "Red": 0xED4245, "Yellow": 0xFEE75C, "Blue": 0x3498DB };
    return new EmbedBuilder()
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(title)
        .setDescription(description)
        .setColor(typeof color === "number" ? color : (colorMap[color] || DEFAULT_EMBED_COLOR));
}

// (getStartDateForTimeframe - كما هي)
export function getStartDateForTimeframe(timeframe) {
    if (timeframe === 'all') return null;
    const now = new Date();
    let daysToSubtract = 0;
    switch (timeframe) {
        case '1d': daysToSubtract = 1; break;
        case '7d': daysToSubtract = 7; break;
        case '14d': daysToSubtract = 14; break;
        case '30d': daysToSubtract = 30; break;
        default: return null;
    }
    now.setDate(now.getDate() - daysToSubtract);
    return now.toISOString();
}

// ==========================================================
// *** 🟢 (تعديل: createStatsEmbedPage أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function createStatsEmbedPage(client, db, page = 1, command = 'stats_top', guildId) {
    const custom = await getCustomization(db, 'stats_top', guildId); // ⬅️
    const perPage = 10;
    const offset = (page - 1) * perPage;
    
    // ⬅️ (فلترة حسب السيرفر)
    const rows = await db.all(`
SELECT userId, SUM(points) as totalPoints
FROM stats
WHERE guildId = ? 
GROUP BY userId
ORDER BY totalPoints DESC
LIMIT ? OFFSET ?
`, guildId, perPage, offset);

    let totalPublishers = 0;
    try {
        // ⬅️ (فلترة حسب السيرفر)
        const totalRowsResult = await db.get("SELECT COUNT(DISTINCT userId) as count FROM stats WHERE points > 0 AND guildId = ?", guildId);
        totalPublishers = totalRowsResult?.count || 0;
    } catch (err) {
        console.warn("⚠️ خطأ في استعلام COUNT، استخدام استعلام بديل:", err.message);
        try {
            const fallbackResult = await db.get("SELECT COUNT(DISTINCT userId) as count FROM stats WHERE guildId = ?", guildId);
            totalPublishers = fallbackResult?.count || 0;
        } catch (fallbackErr) {
            console.warn("⚠️ فشل الاستعلام البديل أيضاً، استخدام الصفر:", fallbackErr.message);
            totalPublishers = 0;
        }
    }

    const totalPages = Math.ceil(totalPublishers / perPage) || 1;
    page = Math.max(1, Math.min(page, totalPages));
    const embed = new EmbedBuilder()
        .setTitle(LANG.ar.STATS_TOP_TITLE)
        .setColor(custom.color)
        .setFooter({ text: `Page ${page}/${totalPages}` });
    
    if (custom.thumbnail) embed.setThumbnail(custom.thumbnail);
    if (custom.image) embed.setImage(custom.image);

    if (rows.length === 0) {
        embed.setDescription(LANG.ar.ERROR_NO_PUBLISHERS);
    } else {
        const descriptions = await Promise.all(rows.map(async (row, index) => {
            const rank = offset + index + 1;
            const user = await client.users.fetch(row.userId).catch(() => ({ tag: `Unknown User (${row.userId})` }));
            return `**${rank}.** <@${row.userId}> (${user.tag})\n- **${LANG.ar.STATS_TOTAL_FIELD_NAME}:** ${row.totalPoints}`;
        }));
        embed.setDescription(descriptions.join('\n\n'));
    }
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`page_stats_top_${client.user.id}_${page - 1}`).setEmoji(LANG.ar.BUTTON_PREV).setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('page_info').setLabel(LANG.ar.BUTTON_PAGE.replace("{current}", page).replace("{total}", totalPages)).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId(`page_stats_top_${client.user.id}_${page + 1}`).setEmoji(LANG.ar.BUTTON_NEXT).setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages)
    );
    return { embed, row, totalPages };
}

// ==========================================================
// *** 🟢 (تعديل: createPaginatedStatsEmbed أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function createPaginatedStatsEmbed(client, db, targetUser, page = 1, authorId, timeframe = '30d', context = 'stats', guildId) {
    const guild = client.guilds.cache.get(guildId); // ⬅️ استخدام ID السيرفر المحدد
    if (!guild) return { embed: embedSimple(client, "❌ خطأ", "لا يمكن العثور على السيرفر.", "Red"), rows: [] };

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    const nickname = member?.displayName || targetUser.globalName || targetUser.username;

    const startDate = getStartDateForTimeframe(timeframe);
    const isTimeFiltered = (timeframe !== 'all' && startDate !== null);

    let allChannelsStats = [];
    let totalData = null;

    try {
        if (isTimeFiltered) {
            // ⬅️ (فلترة حسب السيرفر)
            allChannelsStats = await db.all(`
                SELECT 
                    c.channelId, 
                    c.name, 
                    IFNULL(SUM(pl.mediaCount), 0) as points
                FROM channels c
                LEFT JOIN post_log pl 
                    ON c.channelId = pl.channelId 
                    AND pl.userId = ? 
                    AND pl.timestamp >= ?
                WHERE c.guildId = ? 
                GROUP BY c.channelId, c.name
            `, targetUser.id, startDate, guildId);

            // ⬅️ (فلترة حسب السيرفر)
            totalData = await db.get(`
                SELECT 
                    p.joinDate,
                    (SELECT IFNULL(SUM(mediaCount), 0) 
                     FROM post_log 
                     WHERE userId = p.userId AND timestamp >= ? AND guildId = ?) as totalPoints,
                    (SELECT MAX(timestamp) 
                     FROM post_log 
                     WHERE userId = p.userId AND timestamp >= ? AND guildId = ?) as lastPostDate
                FROM publishers p
                WHERE p.userId = ? AND p.guildId = ?
            `, startDate, guildId, startDate, guildId, targetUser.id, guildId);

        } else {
            // ⬅️ (فلترة حسب السيرفر)
            allChannelsStats = await db.all(`
                SELECT 
                    c.channelId, 
                    c.name, 
                    IFNULL(s.points, 0) as points
                FROM channels c
                LEFT JOIN stats s 
                    ON c.channelId = s.channelId 
                    AND s.userId = ?
                WHERE c.guildId = ? 
            `, targetUser.id, guildId);

            // ⬅️ (فلترة حسب السيرفر)
            totalData = await db.get(`
                SELECT 
                    p.joinDate,
                    SUM(s.points) as totalPoints,
                    MAX(s.lastPostDate) as lastPostDate
                FROM publishers p
                LEFT JOIN stats s ON p.userId = s.userId AND p.guildId = s.guildId
                WHERE p.userId = ? AND p.guildId = ?
                GROUP BY p.userId
            `, targetUser.id, guildId);
        }
    } catch (err) {
        console.error("SQL Error in createPaginatedStatsEmbed:", err);
        throw err; 
    }

    // (باقي كود تنسيق الإيمبد... كما هو)
    allChannelsStats.forEach(channel => {
        channel.cleanedName = cleanChannelName(channel.name);
        channel.sortName = channel.cleanedName.replace(emoji, '').trim(); 
    });
    allChannelsStats.sort((a, b) => {
        const indexA = fixedChannelOrder.indexOf(a.sortName); 
        const indexB = fixedChannelOrder.indexOf(b.sortName);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.cleanedName.localeCompare(b.cleanedName, 'ar');
    });
    const channelFields = allChannelsStats.map(row => ({
        name: '\u200b',
        value: `${row.cleanedName}\n**${row.points || 0}**`,
        inline: true
    }));
    const totalPoints = totalData?.totalPoints || 0;
    const totalField = { name: '\u200b', value: `${LANG.ar.STATS_TOTAL_FIELD_NAME}\n**${totalPoints}**`, inline: true };
    const fieldsPerPage = 9;
    const fieldsForPage1 = 8;
    let totalPages = 1;
    let fieldsToShow = [];
    const activeChannelFields = channelFields.length > 0 ? channelFields : [{ name: '\u200b', value: LANG.ar.ERROR_NO_CHANNELS_SET, inline: false }];
    if (activeChannelFields.length > fieldsForPage1) {
        totalPages = 1 + Math.ceil((activeChannelFields.length - fieldsForPage1) / fieldsPerPage);
    }
    page = Math.max(1, Math.min(page, totalPages));
    if (page === 1) {
        fieldsToShow = [totalField, ...activeChannelFields.slice(0, fieldsForPage1)];
    } else {
        const startIndex = fieldsForPage1 + (page - 2) * fieldsPerPage;
        const endIndex = startIndex + fieldsPerPage;
        fieldsToShow = activeChannelFields.slice(startIndex, endIndex);
    }
    while (fieldsToShow.length % 3 !== 0 && fieldsToShow.length > 0) {
        fieldsToShow.push({ name: '\u200b', value: '\u200b', inline: true });
    }
    const formatDate = (isoString) => {
        if (!isoString) return LANG.ar.NON_ACTIVITY_FORMAT;
        try { return new Date(isoString).toLocaleDateString('en-GB'); } 
        catch (e) { return LANG.ar.NON_ACTIVITY_FORMAT; }
    };
    const joinDate = formatDate(totalData?.joinDate);
    const lastPostDate = formatDate(totalData?.lastPostDate);
    const footerText = 
        LANG.ar.JOIN_DATE_FORMAT.replace("{joinDate}", joinDate) + 
        LANG.ar.FOOTER_SEPARATOR +
        LANG.ar.LAST_POST_DATE_FORMAT.replace("{lastPostDate}", lastPostDate);
    const embed = new EmbedBuilder()
        .setAuthor({ name: LANG.ar.STATS_USER_TITLE.replace("{nickname}", nickname), iconURL: targetUser.displayAvatarURL() })
        .setThumbnail(targetUser.displayAvatarURL()) 
        .setImage(STATS_IMAGE_URL) 
        .setColor(DEFAULT_EMBED_COLOR)
        .setFooter({ text: footerText })
        .addFields(fieldsToShow);
    const timeframes = ['30d', '14d', '7d', '1d', 'all'];
    const timeframeLabels = { '30d': '30D', '14d': '14D', '7d': '7D', '1d': '1D', 'all': 'ALL' };
    const currentIndex = timeframes.indexOf(timeframe);
    const nextIndex = (currentIndex + 1) % timeframes.length;
    const nextTimeframe = timeframes[nextIndex];
    const buttonPrefix = context === 'pubad' ? 'pubad' : 'stats';
    const pageRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${buttonPrefix}_page_${authorId}_${targetUser.id}_${timeframe}_${page - 1}`)
            .setEmoji(LANG.ar.BUTTON_PREV)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
        new ButtonBuilder()
            .setCustomId(`${buttonPrefix}_time_${authorId}_${targetUser.id}_${nextTimeframe}`)
            .setLabel(timeframeLabels[timeframe])
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🗓️'),
        new ButtonBuilder()
            .setCustomId(`${buttonPrefix}_page_${authorId}_${targetUser.id}_${timeframe}_${page + 1}`)
            .setEmoji(LANG.ar.BUTTON_NEXT)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages)
    );
    return { embed, rows: [pageRow], totalPages, currentPage: page, timeframe };
}

// ==========================================================
// *** 🟢 (تعديل: createSummaryEmbed أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function createSummaryEmbed(client, db, timeframe = '30d', guildId) {
  try {
    const startDate = getStartDateForTimeframe(timeframe);
    const isTimeFiltered = (timeframe !== 'all' && startDate !== null);

    let topPublishers, topChannels, totalServerPointsResult;

    if (isTimeFiltered) {
        // ⬅️ (فلترة حسب السيرفر)
        [topPublishers, topChannels, totalServerPointsResult] = await Promise.all([
            db.all(`SELECT userId, SUM(mediaCount) AS totalPoints 
                    FROM post_log 
                    WHERE timestamp >= ? AND guildId = ?
                    GROUP BY userId 
                    ORDER BY totalPoints DESC 
                    LIMIT 3`, startDate, guildId),
            db.all(`SELECT c.channelId, c.name, SUM(pl.mediaCount) AS totalPoints 
                    FROM post_log pl 
                    JOIN channels c ON pl.channelId = c.channelId 
                    WHERE pl.timestamp >= ? AND pl.guildId = ?
                    GROUP BY pl.channelId 
                    ORDER BY totalPoints DESC 
                    LIMIT 3`, startDate, guildId),
            db.get(`SELECT SUM(mediaCount) AS total FROM post_log WHERE timestamp >= ? AND guildId = ?`, startDate, guildId)
        ]);
    } else {
        // ⬅️ (فلترة حسب السيرفر)
        [topPublishers, topChannels, totalServerPointsResult] = await Promise.all([
            db.all(`SELECT userId, SUM(points) AS totalPoints 
                    FROM stats 
                    WHERE guildId = ?
                    GROUP BY userId 
                    ORDER BY totalPoints DESC 
                    LIMIT 3`, guildId),
            db.all(`SELECT c.channelId, c.name, SUM(s.points) AS totalPoints 
                    FROM stats s 
                    JOIN channels c ON s.channelId = c.channelId 
                    WHERE s.guildId = ?
                    GROUP BY s.channelId 
                    ORDER BY totalPoints DESC 
                    LIMIT 3`, guildId),
            db.get(`SELECT SUM(points) AS total FROM stats WHERE guildId = ?`, guildId)
        ]);
    }

    const totalServerPoints = totalServerPointsResult?.total || 0;

    const topPublishersText = (topPublishers && topPublishers.length > 0)
      ? topPublishers.map((p, i) => `${i + 1}- <@${p.userId}> (${p.totalPoints || 0})`).join('\n')
      : 'لا يوجد ناشرون بعد.';

    const topChannelsText = (topChannels && topChannels.length > 0)
      ? topChannels.map((c, i) => `${i + 1}- <#${c.channelId}> (${c.totalPoints || 0})`).join('\n')
      : 'لا توجد قنوات بعد.';

    let topPublisherUser = null;
    if (topPublishers?.[0]) {
      topPublisherUser = await client.users.fetch(topPublishers[0].userId).catch(() => null);
    }

    const embed = new EmbedBuilder()
      .setTitle('✥ احـصـائيـات الـيوم')
      .setColor(DEFAULT_EMBED_COLOR)
      .setImage(SUMMARY_IMAGE_URL) // (استخدام الثابت)
      .addFields({ name: '✶ اعـلـى الـنـاشـريـن', value: topPublishersText, inline: false })
      .addFields({ name: '✶ اعـلـى القـنوات', value: topChannelsText, inline: false })
      .addFields({ name: `✶ مجـموع نقـاط السيرفر: (${totalServerPoints})`, value: '\u200b', inline: false });

    if (topPublisherUser) {
      embed.setThumbnail(topPublisherUser.displayAvatarURL());
    }

    return embed;
  } catch (error) {
    console.error('Error creating summary embed:', error);
    return null;
  }
}

// ==========================================================
// *** 🟢 (تعديل: createChannelStatsEmbed أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function createChannelStatsEmbed(client, db, channelId, channel, user, guildId) {
    // ⬅️ (فلترة حسب السيرفر)
    const stats = await db.get( "SELECT points FROM stats WHERE userId = ? AND channelId = ? AND guildId = ?", user.id, channelId, guildId );
    const totalStats = await db.get( "SELECT SUM(points) as total FROM stats WHERE userId = ? AND guildId = ?", user.id, guildId );
    
    const guild = client.guilds.cache.get(guildId);
    const member = await guild?.members.fetch(user.id).catch(() => null);
    const nickname = member?.displayName || user.globalName || user.username;
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setTitle(LANG.ar.STATS_USER_CHANNEL_TITLE.replace("{nickname}", nickname))
        .setColor(DEFAULT_EMBED_COLOR)
        .addFields(
            { name: LANG.ar.STATS_CHANNEL_NAME_FIELD, value: `<#${channelId}> (${cleanChannelName(channel.name)})` }, 
            { name: LANG.ar.STATS_CHANNEL_POINTS, value: `**${stats?.points || 0}**`, inline: true }, 
            { name: LANG.ar.STATS_CHANNEL_TOTAL, value: `**${totalStats?.total || 0}**`, inline: true } 
        );
    return embed;
}

// ==========================================================
// *** 🟢 (تعديل: createListEmbed أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function createListEmbed(client, db, page = 1, command, interactionOrMessage) {
    const guildId = interactionOrMessage.guildId;
    const custom = await getCustomization(db, command, guildId); // ⬅️
    const perPage = 15;
    let title, noDataMsg;
    let itemsToList = []; 
    let totalMonitoredEntriesInDB = 0; 

    switch (command) {
        case 'listpublishers':
            title = '✥ قائمة الناشرين المسجلين'; noDataMsg = LANG.ar.ERROR_NO_PUBLISHERS;
            // ⬅️ (فلترة حسب السيرفر)
            const publishers = await db.all(`SELECT userId FROM publishers WHERE guildId = ?`, guildId);
            totalMonitoredEntriesInDB = publishers.length;
            itemsToList = publishers.map(row => ({ id: row.userId, mention: `<@${row.userId}>` }));
            break;

        case 'listchannels':
            title = LANG.ar.SUCCESS_CHANNELS_LIST_TITLE; noDataMsg = LANG.ar.ERROR_NO_CHANNELS_SET;
            // ⬅️ (فلترة حسب السيرفر)
            const channelsInDB = await db.all(`SELECT channelId, name FROM channels WHERE guildId = ?`, guildId);
            totalMonitoredEntriesInDB = channelsInDB.length;

            const guild = interactionOrMessage.guild; 
            if (guild) {
                // (باقي الكود سليم لأنه يفلتر القنوات الموجودة فعلياً)
                const monitoredIds = channelsInDB.map(c => c.channelId);
                try { await guild.channels.fetch(); } catch (e) { console.error("Failed to fetch all channels for cache refresh:", e); }
                for (const id of monitoredIds) {
                    const channel = guild.channels.cache.get(id);
                    if (channel) {
                        // (أنواع القنوات المدعومة)
                        if (channel.type === ChannelType.GuildText || 
                            channel.type === ChannelType.GuildAnnouncement || 
                            channel.type === ChannelType.PublicThread ||
                            channel.type === ChannelType.PrivateThread ||
                            channel.type === ChannelType.AnnouncementThread) {
                            itemsToList.push({ id: channel.id, mention: `<#${channel.id}>` });
                        }
                    } else {
                        console.warn(`[listchannels] Could not find channel ID ${id} in cache even after fetch.,`);
                    }
                }
            } else if (interactionOrMessage) {
                console.error(`[listchannels] CRITICAL: Could not find guild from interactionOrMessage. Guild ID: ${interactionOrMessage.guildId}`);
            }
            break;

        case 'listadmins':
            title = '✥ قائمة المشرفين المعينين'; noDataMsg = 'لا يوجد مشرفين معينين بعد.';
            // ⬅️ (فلترة حسب السيرفر)
            const admins = await db.all(`SELECT userId FROM admins WHERE guildId = ?`, guildId);
            totalMonitoredEntriesInDB = admins.length;
            itemsToList = admins.map(row => ({ id: row.userId, mention: `<@${row.userId}>` }));
            break;
    }

    itemsToList.sort((a, b) => a.mention.localeCompare(b.mention, 'ar', { sensitivity: 'base' }));

    const totalItemsToDisplay = itemsToList.length; 
    const totalPages = Math.ceil(totalItemsToDisplay / perPage) || 1;
    page = Math.max(1, Math.min(page, totalPages)); 
    const offset = (page - 1) * perPage;
    const paginatedItems = itemsToList.slice(offset, offset + perPage);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(custom.color)
        .setFooter({ text: `Page ${page}/${totalPages} (Displaying: ${totalItemsToDisplay})` }); 

    if (custom.thumbnail) embed.setThumbnail(custom.thumbnail);
    if (custom.image) embed.setImage(custom.image);

    if (paginatedItems.length === 0) {
        if (command === 'listchannels' && totalMonitoredEntriesInDB > 0) {
            embed.setDescription("تم تعيين عناصر للمراقبة، ولكن لا يمكن الوصول إليها حالياً (قد تكون محذوفة أو لا يمتلك البوت صلاحية رؤيتها).");
        } else {
            embed.setDescription(noDataMsg); 
        }
    } else {
        const descriptions = paginatedItems.map((item, index) => {
            const number = offset + index + 1;
            return `**${number}.** ${item.mention}`; 
        });
        embed.setDescription(descriptions.join('\n'));
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`page_${command}_${client.user.id}_${page - 1}`).setEmoji(LANG.ar.BUTTON_PREV).setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('page_info_list').setLabel(LANG.ar.BUTTON_PAGE.replace("{current}", page).replace("{total}", totalPages)).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId(`page_${command}_${client.user.id}_${page + 1}`).setEmoji(LANG.ar.BUTTON_NEXT).setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages)
    );

    return { embed, row, totalPages };
}

// ==========================================================
// *** 🟢 (تعديل: processChannels أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function processChannels(interactionOrMessage, args, mode, db, client) {
    const guildId = interactionOrMessage.guildId; // ⬅️
    if (!(await checkAdmin(interactionOrMessage, db))) {
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, LANG.ar.ERROR_PERM, "", "Red")], flags: MessageFlags.Ephemeral });
    }
    let channelsInput;
    if (interactionOrMessage.user) {
        channelsInput = interactionOrMessage.options.getString('channels');
    } else {
        channelsInput = args.join(' ');
    }
    const ids = channelsInput.match(/\d{17,19}/g) || [];
    if (ids.length === 0) {
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "❌ خطأ", "لم يتم تحديد أي قنوات أو كاتاغوري أو منتديات صالحة.", "Red")] });
    }

    let processedMentions = []; 
    let skippedChannels = [];
    const guild = interactionOrMessage.guild;

    for (const id of ids) {
        const channel = await guild.channels.fetch(id).catch(() => null);
        if (!channel) {
            skippedChannels.push(`\`${id}\` (غير موجود)`);
            continue;
        }

        let channelsToAddOrRemove = [];
        // (منطق إضافة الكاتاغوري والمنتديات... كما هو)
        if (channel.type === ChannelType.GuildCategory) {
            const children = guild.channels.cache.filter(c => 
                c.parentId === id &&
                (c.type === ChannelType.GuildText || c.type === ChannelType.GuildForum || c.type === ChannelType.GuildAnnouncement)
            );
            for (const child of children.values()) {
                if (child.type === ChannelType.GuildForum) {
                    let fetchedThreads = new Collection();
                    try {
                        const active = await child.threads.fetchActive();
                        fetchedThreads = fetchedThreads.concat(active.threads);
                    } catch (e) { console.error(`Could not fetch threads for forum ${child.id}: ${e.message}`); }
                    channelsToAddOrRemove.push(...fetchedThreads.values());
                } else {
                    channelsToAddOrRemove.push(child);
                }
            }
        } else if (channel.type === ChannelType.GuildForum) {
            let fetchedThreads = new Collection();
            try {
                const active = await channel.threads.fetchActive();
                fetchedThreads = fetchedThreads.concat(active.threads);
            } catch (e) { console.error(`Could not fetch threads for forum ${channel.id}: ${e.message}`); }
            channelsToAddOrRemove.push(...fetchedThreads.values());
            if (channelsToAddOrRemove.length === 0 && mode === 'add') {
                skippedChannels.push(`<#${channel.id}> (منتدى فارغ حالياً من البوستات النشطة)`);
            }
        } else if (
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildAnnouncement ||
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread ||
            channel.type === ChannelType.AnnouncementThread
        ) {
            channelsToAddOrRemove.push(channel);
        } else {
            skippedChannels.push(`${channel.name} (نوع غير مدعوم)`);
        }

        for (const ch of channelsToAddOrRemove) {
            try {
                if (mode === 'add') {
                    // ⬅️ إضافة guildId
                    await db.run("INSERT OR IGNORE INTO channels (guildId, channelId, name) VALUES (?, ?, ?)", guildId, ch.id, ch.name);
                    processedMentions.push(`<#${ch.id}> (${cleanChannelName(ch.name)})`);
                } else if (mode === 'remove') {
                    // ⬅️ (الحذف لا يحتاج guildId لأن channelId فريد)
                    await db.run("DELETE FROM channels WHERE channelId = ?", ch.id); 
                    processedMentions.push(`<#${ch.id}> (${cleanChannelName(ch.name)})`);
                }
            } catch (err) {
                console.error(err);
                skippedChannels.push(`<#${ch.id}> (خطأ DB)`);
            }
        }
    }

    processedMentions = [...new Set(processedMentions)];
    if (processedMentions.length === 0 && skippedChannels.length === 0) {
        return replyOrFollowUp(interactionOrMessage, { embeds: [embedSimple(client, "🤔", "لم يتم العثور على أي عناصر صالحة للمعالجة.", "Yellow")] });
    }

    const title = (mode === 'add') ? LANG.ar.SUCCESS_CHANNELS_TITLE : LANG.ar.SUCCESS_CHANNEL_REMOVED_TITLE;
    const desc = (mode === 'add') ? LANG.ar.SUCCESS_CHANNELS_SET : LANG.ar.SUCCESS_CHANNEL_REMOVED;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor((mode === 'add') ? 0x3BA55D : 0xED4245);

    if (processedMentions.length > 0) {
        embed.setDescription(desc.replace("{channels}", processedMentions.join('\n')));
    } else {
        embed.setDescription("لم تتم معالجة أي عناصر بنجاح من المدخلات.");
    }

    if (skippedChannels.length > 0) {
        embed.addFields({ name: "عناصر تم تخطيها أو غير صالحة", value: skippedChannels.join('\n') });
    }
    return replyOrFollowUp(interactionOrMessage, { embeds: [embed] });
}

// ==========================================================
// *** 🟢 (تعديل: createChannelListStats أصبح يعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function createChannelListStats(db, page = 1, authorId, timeframe = '30d', guildId) {
    const perPage = 20; 
    const offset = (page - 1) * perPage;

    const startDate = getStartDateForTimeframe(timeframe);
    const isTimeFiltered = (timeframe !== 'all' && startDate !== null);

    let rows = [];
    let totalRowsResult = null;

    try {
        if (isTimeFiltered) {
            // ⬅️ (فلترة حسب السيرفر)
            rows = await db.all(`
                SELECT 
                    c.channelId, 
                    c.name, 
                    IFNULL(SUM(pl.mediaCount), 0) as totalPoints
                FROM channels c
                LEFT JOIN post_log pl ON c.channelId = pl.channelId AND pl.timestamp >= ?
                WHERE c.guildId = ? 
                GROUP BY c.channelId, c.name
                ORDER BY totalPoints DESC
                LIMIT ? OFFSET ?
            `, startDate, guildId, perPage, offset);

            // ⬅️ (فلترة حسب السيرفر)
            totalRowsResult = await db.get(`
                SELECT COUNT(DISTINCT channelId) as count 
                FROM post_log 
                WHERE timestamp >= ? AND guildId = ?
            `, startDate, guildId);

        } else {
            // ⬅️ (فلترة حسب السيرفر)
            rows = await db.all(`
                SELECT c.channelId, c.name, SUM(s.points) as totalPoints
                FROM stats s
                JOIN channels c ON s.channelId = c.channelId
                WHERE s.points > 0 AND s.guildId = ?
                GROUP BY s.channelId, c.name
                ORDER BY totalPoints DESC
                LIMIT ? OFFSET ?
            `, guildId, perPage, offset);

            // ⬅️ (فلترة حسب السيرفر)
            totalRowsResult = await db.get("SELECT COUNT(DISTINCT channelId) as count FROM stats WHERE points > 0 AND guildId = ?", guildId);
        }
    } catch (err) {
        console.error("SQL Error in createChannelListStats:", err);
        throw err;
    }

    const totalChannels = totalRowsResult?.count || 0;
    const totalPages = Math.ceil(totalChannels / perPage) || 1;
    page = Math.max(1, Math.min(page, totalPages)); 

    const embed = new EmbedBuilder()
        .setTitle(LANG.ar.STATS_CHANNEL_LIST_TITLE)
        .setColor(DEFAULT_EMBED_COLOR)
        .setFooter({ text: `Page ${page}/${totalPages} (Total Elements: ${totalChannels})` });

    if (rows.length === 0) {
        embed.setDescription(LANG.ar.ERROR_NO_CHANNELS_SET);
    } else {
        const descriptions = rows
            .filter(row => (row.totalPoints || 0) > 0)
            .map((row) => `<#${row.channelId}> \`#${row.totalPoints}\``);

        if (descriptions.length === 0) {
            embed.setDescription(LANG.ar.STATS_NO_POINTS); 
        } else {
            embed.setDescription(descriptions.join('\n'));
        }
    }

    const timeframes = ['30d', '14d', '7d', '1d', 'all'];
    const timeframeLabels = { '30d': '30D', '14d': '14D', '7d': '7D', '1d': '1D', 'all': 'ALL' };
    const currentIndex = timeframes.indexOf(timeframe);
    const nextIndex = (currentIndex + 1) % timeframes.length;
    const nextTimeframe = timeframes[nextIndex];

    const pageRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`channelstats_page_${authorId}_${timeframe}_${page - 1}`)
            .setEmoji(LANG.ar.BUTTON_PREV)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
        new ButtonBuilder()
            .setCustomId(`channelstats_time_${authorId}_${nextTimeframe}`)
            .setLabel(timeframeLabels[timeframe])
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🗓️'),
        new ButtonBuilder()
            .setCustomId(`channelstats_page_${authorId}_${timeframe}_${page + 1}`)
            .setEmoji(LANG.ar.BUTTON_NEXT)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages)
    );

    return { embed, rows: [pageRow], totalPages };
}

// (setPrefix - كما هي)
export function setPrefix(newPrefix) {
    البادئة = newPrefix;
    console.log(`Prefix updated in memory to: ${newPrefix}`);
}

// ==========================================================
// *** 🟢 (تعديل: getGuildAdChannelId أصبح يعتمد على السيرفر فقط) 🟢 ***
// ==========================================================
export async function getGuildAdChannelId(db, guildId) {
    if (!guildId) return null;
    // ⬅️ (البحث فقط عن الإعداد الخاص بالسيرفر)
    const scoped = await db.get("SELECT value FROM config WHERE key = ?", `adChannel:${guildId}`);
    if (scoped?.value) return scoped.value;
    // (تم حذف الإعداد العالمي القديم)
    return null;
}

// (buildSummaryComponents, buildPublisherAdComponents - كما هي)
export function buildSummaryComponents(guildId, timeframe = '30d') {
    const timeframes = ['30d', '14d', '7d', '1d', 'all'];
    const timeframeLabels = { '30d': '30D', '14d': '14D', '7d': '7D', '1d': '1D', 'all': 'ALL' };
    const currentIndex = timeframes.indexOf(timeframe);
    const nextIndex = (currentIndex + 1) % timeframes.length;
    const nextTimeframe = timeframes[nextIndex];

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`summary_refresh_${guildId}_${timeframe}`)
            .setLabel('تـحـديـث')
            .setEmoji('<a:6nekodance:1414942810359992391>')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`summary_time_${guildId}_${nextTimeframe}`)
            .setLabel(timeframeLabels[timeframe])
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🗓️')
    );
    return [row];
}
export function buildPublisherAdComponents(guildId, userId, timeframe = '30d') {
  const refreshId = `pubad_refresh_${guildId}_${userId}_${timeframe}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(refreshId)
      .setLabel('تـحـديـث')
      .setEmoji('<a:6nekodance:1414942810359992391>')
      .setStyle(ButtonStyle.Primary)
  );
  return [row];
}


// ==========================================================
// *** 🟢 (تعديل: الدوال التالية أصبحت تعتمد على السيرفر) 🟢 ***
// ==========================================================
export async function buildPublisherAdEmbed(client, db, userId, authorId = userId, timeframe = '30d', guildId) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return null;
    // ⬅️ (تمرير guildId)
    const pack = await createPaginatedStatsEmbed(client, db, user, 1, authorId, timeframe, 'pubad', guildId);
    return pack; 
}

export async function sendOrUpdatePublisherAd(client, db, guildId, userId, timeframe = '30d') {
    const adChannelId = await getGuildAdChannelId(db, guildId); // ⬅️ (هذه الدالة محدثة)
    if (!adChannelId) return null;
    const channel = await client.channels.fetch(adChannelId).catch(() => null);
    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) return null;

    // ⬅️ (تمرير guildId)
    const pack = await buildPublisherAdEmbed(client, db, userId, guildId, timeframe, guildId);
    if (!pack?.embed) return null;

    const allComponents = pack.rows; 

    // ⬅️ (الاستعلام أصبح يعتمد على السيرفر)
    let pubRow = await db.get("SELECT messageId FROM publisher_ad_messages WHERE guildId = ? AND userId = ?", guildId, userId);

    if (pubRow?.messageId) {
        const msg = await channel.messages.fetch(pubRow.messageId).catch(() => null);
        if (msg) {
            await msg.edit({ embeds: [pack.embed], components: allComponents });
            return msg.id;
        }
    }

    const sent = await channel.send({ embeds: [pack.embed], components: allComponents }).catch(() => null);
    if (sent?.id) {
        // ⬅️ (التخزين أصبح يعتمد على السيرفر)
        await db.run("INSERT OR REPLACE INTO publisher_ad_messages (guildId, userId, messageId) VALUES (?, ?, ?)", guildId, userId, sent.id);
        return sent.id;
    }
    return null;
}

export async function deletePublisherAdMessage(client, db, guildId, userId) {
    const adChannelId = await getGuildAdChannelId(db, guildId); // ⬅️ (هذه الدالة محدثة)
    if (!adChannelId) return;
    const channel = await client.channels.fetch(adChannelId).catch(() => null);
    if (!channel) return;

    // ⬅️ (الاستعلام أصبح يعتمد على السيرفر)
    const row = await db.get("SELECT messageId FROM publisher_ad_messages WHERE guildId = ? AND userId = ?", guildId, userId);
    if (!row?.messageId) return;

    const msg = await channel.messages.fetch(row.messageId).catch(() => null);
    if (msg) await msg.delete().catch(() => {});

    // ⬅️ (الحذف أصبح يعتمد على السيرفر)
    await db.run("DELETE FROM publisher_ad_messages WHERE guildId = ? AND userId = ?", guildId, userId);
}
