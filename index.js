import {
    Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ChannelType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, ApplicationCommandType, ApplicationCommandOptionType, AttachmentBuilder
} from "discord.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv/config";
import { writeFile } from 'fs/promises';
import fetch from 'node-fetch';

import { createStatsEmbedPage, createDetailedStatsEmbed, cleanChannelName, embedSimple, createChannelStatsEmbed } from "./utils/embeds.js";
import { startScheduledTasks } from "./extensions.js";
import { handleInteraction } from "./interactionHandler.js";
import { handleMessageCreate, handleMessageDelete, handleMessageUpdate } from "./messageHandler.js";

export const البادئة = "!";
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error("خطأ: حط توكن البوت في متغير البيئة TOKEN");
    process.exit(1);
}

export const OWNER_ID = '1145327691772481577';
export const DB_PATH = "./publisher_stats2.db";

export const HELP_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1394261509537927258/1431777976697098461/Help.png?ex=68fea6a6&is=68fd5526&hm=eb7266f5cc1dd0acb4e716c8fcd35f34dd52fc10cc73b787b8af227f12ca359e&';
export const DEFAULT_EMBED_COLOR = 0xFFFFFF;
export const CUSTOMIZABLE_COMMANDS = ['listadmins', 'listchannels', 'listpublishers', 'stats_top'];

export const LANG = {
    ar: {
        HELP_TITLE: "✥ لـوحـة الأوامـر",
        HELP_DESC: '\u200b',
        HELP_FIELDS: {
            MAIN: [{ name: "الإعدادات الأسـاسيـة", value: "✶ `setprefix <بادئة_جديدة>`\n- تعيين بادئـة (Prefix) جديدة للبوت.\n\n✶ `addadmin @م1 @م2`\n- إضافة مستخدم (أو عدة مستخدمين) إلى قائمة المشرفين.\n\n✶ `removeadmin @مستخدم`\n- إزالة مستخدم محدد من قائمة المشرفين.\n\n✶ `listadmins`\n- عرض قائمة المشرفين المعينين.\n\n✶ `setadchannel #قناة`\n- تعيين قناة لإعلانات وتحديثات الناشرين.\n\n✶ `customize`\n- تخصيص ألوان وصور بعض إيمبدات الأوامر.", inline: false }],
            CHANNELS: [{ name: "إدارة القنوات", value: "✶ `setchannels #ق1 #ثريد1 ...`\n- إضافة قناة نصية أو ثريد/بوست للمراقبة (يدعم الكاتاغوري للقنوات النصية وإضافة بوستات ).\n\n✶ `removechannel #ق1 #ثريد1 ...`\n- إزالة قناة نصية أو ثريد/بوست من المراقبة (يدعم الكاتاغوري ).\n\n✶ `listchannels`\n- عرض العناصر (القنوات/الثريدات/البوستات) المعينة للتتبع.", inline: false }],
            PUBLISHERS: [{ name: "إدارة الناشرين", value: "✶ `addpublisher @م1 @م2 ...`\n- إضافة ناشر رسمي (أو عدة ناشرين) للمراقبة.\n\n✶ `removepublisher @مستخدم`\n- إزالة ناشر وحذف سجلاته.\n\n✶ `listpublishers`\n- عرض قائمة الناشرين المسجلين.", inline: false }],
            STATS: [{ name: "الإحصائيات", value: "✶ `stats`\n- عرض قائمة أعلى الناشرين.\n\n✶ `stats @مستخدم`\n- عرض إحصائيات لناشر معين حسب القناة.\n\n✶ `stats @مستخدم #قناة`\n- عرض إجمالي النقاط للناشر في قناة/عنصر محدد.\n\n✶ `channelstats`\n- عرض إحصائيات النقاط حسب القناة.\n\n✶ `resetstats @مستخدم [all | #ق1 #ق2 ...]`\n- إعادة تعيين نقاط ناشر. (`all` لحذف السجلات بالكامل، أو قنوات/عناصر محددة).", inline: false }]
        },
        ERROR_PERM: "صلاحية غير كافية",
        ERROR_MENTION_USER: { title: "✶ هــاه؟", description: "- حـدد مستخدم على الاقل يا حلو <:0Kkiss:1413810014979887144>" },
        ERROR_MENTION_CHANNEL: "فضلاً، علّم قناة نصية بالمنشن.",
        ERROR_MENTION_ROLE: "فضلاً، علّم رتبة بالمنشن.",
        ERROR_PUBLISHER_EXISTS: "✶ المستخدم {tag}",
        ERROR_PUBLISHER_NOT_FOUND: "يـا سـطـل الي تحاول تسويـله ازالـة مو مسجل كـ ناشـر اصلا !",
        ERROR_PUBLISHER_NOT_FOUND_TITLE: "✥ همم .. ؟ {tag}",
        ERROR_NO_PUBLISHERS: "ما فيه ناشرين مسجلين بعد.",
        ERROR_NO_STATS: "مو مسجل كـ ناشـر بعد سجله كـ نـاشـر اولا عشان تطلع الاحصائيات",
        ERROR_NO_STATS_TITLE: "✥ المستخدم: {tag}",
        ERROR_NO_CHANNELS_SET: "لم يتم تعيين قنوات/عناصر للمراقبة بعد.",
        ERROR_SQL: "حدث خطأ في قاعدة البيانات أثناء تنفيذ الأمر.",
        SUCCESS_LANG_SET: "تم تعيين لغة البوت إلى العربية.",
        SUCCESS_PREFIX_SET: "تم تعيين بادئة البوت الجديدة إلى `{newPrefix}`.",
        SUCCESS_ADMIN_USER_SET: "✶ تـم تعييـن الـمشرف بنجـاح",
        SUCCESS_ADMIN_REMOVED: "✶ تـمـت الازالـة بـنجـاح",
        ERROR_NO_ADMIN_SET: "لا يوجد مسؤول محدد لإزالته حاليًا.",
        ERROR_ADMIN_NOT_LISTED: "المستخدم **{userName}** ليس ضمن قائمة المشرفين المعينين.",
        SUCCESS_ADMIN_ADDED: "✶ تم إضافة المشرفين بنجاح",
        SUCCESS_CHANNELS_TITLE: "✅ تـم تـحـديـث الـقـنـوات",
        SUCCESS_CHANNELS_SET: "تم إضافة العناصر التالية للمراقبة:\n{channels}",
        SUCCESS_CHANNEL_REMOVED_TITLE: "❌ تـمـت إزالـة الـعـنـاصـر",
        SUCCESS_CHANNEL_REMOVED: "تم إزالة العناصر التالية من المراقبة:\n{channels}",
        SUCCESS_CHANNELS_LIST_TITLE: "✥ الـعـنـاصـر الـمـراقـبـة",
        SUCCESS_AD_CHANNEL_SET_TITLE: "✅ قناة الإعلانات",
        SUCCESS_AD_CHANNEL_SET_DESC: "تم تعيين قناة {channel} لاستقبال تحديثات الناشرين اليومية والإعلانات.",
        SUCCESS_BACKUP_SENT: "✅ تم إرسال نسخة احتياطية من قاعدة البيانات إلى خاصك.",
        ERROR_OWNER_ONLY: "✥ هـذا الأمـر لـصاحـب الـبـوت فـقـط",
        SUCCESS_DB_DOWNLOADED: "✅ تم إرسال ملف قاعدة البيانات الحالي إلى خاصك.",
        ERROR_DB_UPLOAD_NO_FILE: "❌ الرجاء إرفاق ملف `.db` واحد فقط مع الأمر.",
        ERROR_DB_UPLOAD_FAIL: "❌ فشل تحديث قاعدة البيانات: {error}",
        SUCCESS_DB_UPLOADED: "✅ تم استلام الملف. جارٍ محاولة تحديث قاعدة البيانات...",
        SUCCESS_DB_REPLACED: "🎉 تم تحديث قاعدة البيانات بنجاح! قد يستغرق البوت لحظات لإعادة الاتصال بالملف الجديد.",
        SUCCESS_PUBLISHER_ADDED_TITLE: "✥ تـم اضـافـة الـناشـر بنجـاح",
        SUCCESS_PUBLISHER_ADDED_DESC: "تمت إضافة **{tag}** كناشر رسمي. سيبدأ تتبع نقاطه الآن.",
        SUCCESS_PUBLISHER_ADDED_FIELD_1: "✥ الـنـاشـر الجـديـد",
        SUCCESS_PUBLISHER_ADDED_FIELD_2: "✥ تاريخ الاضافة",
        SUCCESS_PUBLISHERS_ADDED_TITLE: "✅ تمت إضافة الناشرين",
        SUCCESS_PUBLISHERS_ADDED_DESC: "تمت إضافة الناشرين التاليين بنجاح:",
        ERROR_PUBLISHERS_ADD_FAIL_TITLE: "⚠️ فشل إضافة بعض الناشرين",
        ERROR_PUBLISHERS_ADD_FAIL_DESC: "تمت إضافة البعض بنجاح، لكن فشلت إضافة التاليين:",
        ERROR_PUBLISHERS_ADD_NONE: { title: "❌ لم يتم العثور على مستخدمين صالحين", description: "لم يتم تحديد أي مستخدمين صالحين للإضافة. تأكد من استخدام منشن أو ID صحيح." },
        PUBLISHER_ADD_FAIL_ALREADY: "(مضاف بالفعل)",
        PUBLISHER_ADD_FAIL_DB: "(خطأ قاعدة بيانات)",
        PUBLISHER_ADD_FAIL_FETCH: "(لم يتم العثور على المستخدم)",
        SUCCESS_STATS_RESET_USER: "تم تصفير نقاط الناشر **{tag}** في جميع العناصر.",
        SUCCESS_STATS_RESET_ALL: "تم تصفير وحذف جميع سجلات نقاط الناشر **{tag}** من قاعدة البيانات.",
        SUCCESS_PUBLISHER_REMOVED: "✥ تـمـت ازالـة الـنـاشـر",
        STATS_TOP_TITLE: "✥ لائـحـة متصـدريـن النـشـر",
        STATS_USER_TITLE: "✥ احـصـائيـات الـنـاشـر {nickname}",
        STATS_USER_CHANNEL_TITLE: "✥ احـصـائيـات الـنـاشـر {nickname}",
        STATS_TOTAL_POINTS: "",
        STATS_PER_CHANNEL: "نقاط / منشورات حسب العنصر",
        STATS_NO_POINTS: "لا توجد نقاط مسجلة بعد.",
        LOG_POINTS_INCREASED: "تم زيادة {points} نقاط لـ {tag} في {channelName}.",
        LOG_POINTS_DECREASED: "تم خصم {points} نقاط من {tag} (حذف محتوى) في {channelName}.",
        ERROR_ROLE_PERM: "يجب أن تمتلك صلاحية 'Manage Server' أو رتبة {roleName} لاستخدام هذا الأمر.",
        BUTTON_PREV: "⬅️",
        BUTTON_NEXT: "➡️",
        BUTTON_PAGE: "{current}/{total}",
        JOIN_DATE_FORMAT: "Join: {joinDate}",
        LAST_POST_DATE_FORMAT: "Last post: لا يوجد",
        NON_ACTIVITY_FORMAT: "Last post: لا يوجد",
        FOOTER_SEPARATOR: " | ",
        STATS_TOTAL_FIELD_NAME: "الـمجـموع",
        STATS_FIELD_TITLE_TOTAL: "✶ Total",
        INVISIBLE_FIELD_TITLE: '\u200b',
        STATS_CHANNEL_POINTS: "✶ مجموع النقاط في هذا العنصر",
        STATS_CHANNEL_TOTAL: "✶ المجموع الكلي للنقاط",
        STATS_CHANNEL_NAME_FIELD: "✶ العنصر:",
        ERROR_CHANNEL_NOT_MONITORED: { title: "✥ هـمم ... ؟", description: "العنصر الذي حددته ليس ضمن العناصر المراقبة. عينه أولاً." },
        CUSTOMIZE_INVALID_COLOR: "❌ كود اللون غير صالح. يجب أن يكون بصيغة Hex (مثال: #FF0000).",
        CUSTOMIZE_INVALID_URL: "❌ رابط الصورة غير صالح. تأكد من أنه يبدأ بـ http أو https.",
        CUSTOMIZE_SUCCESS: "✅ تم حفظ تخصيص الإيمبد للأمر `{command}`.",
        CUSTOMIZE_RESET_SUCCESS: "✅ تم إعادة تعيين تخصيص الإيمبد للأمر `{command}`."
    }
};

const SLASH_COMMANDS = [
    { name: 'stats', description: 'عرض إحصائيات الناشرين أو قائمة المتصدرين.', options: [{ name: 'user', description: 'الناشر المراد عرض إحصائياته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: false }, { name: 'channel', description: 'العنصر المحدد (قناة/ثريد/بوست) لعرض إحصائياته.', type: ApplicationCommandOptionType.Channel, required: false, channel_types: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread] }] },
    { name: 'channelstats', description: 'عرض إحصائيات النشر حسب القناة/العنصر.', options: [{ name: 'channel', description: 'العنصر المراد عرض إحصائياته (منشن أو ID).', type: ApplicationCommandOptionType.Channel, required: false, channel_types: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread] }] },
    { name: 'listpublishers', description: 'عرض قائمة الناشرين المسجلين.' },
    { name: 'listadmins', description: 'عرض قائمة المشرفين المعينين.' },
    { name: 'listchannels', description: 'عرض العناصر (القنوات/الثريدات/البوستات) المعينة للتتبع.' },
    { name: 'help', description: 'عرض قائمة أوامر البوت.' },
    { name: 'setprefix', description: 'تعيين بادئة جديدة للبوت.', options: [{ name: 'new_prefix', description: 'البادئة الجديدة المطلوبة.', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'addadmin', description: 'إضافة مستخدم كـ مشرف نشر.', options: [{ name: 'user', description: 'المستخدم المراد إضافته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }] },
    { name: 'removeadmin', description: 'إزالة مشرف نشر.', options: [{ name: 'user', description: 'المستخدم المراد إزالته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }] },
    { name: 'setchannels', description: 'إضافة قنوات نصية أو ثريدات/بوستات للمراقبة (يدعم الكاتاغوري للقنوات).', options: [{ name: 'channels', description: 'العناصر أو الكاتاغوري (منشن أو ID).', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'removechannel', description: 'إزالة قنوات نصية أو ثريدات/بوستات من المراقبة (يدعم الكاتاغوري للقنوات).', options: [{ name: 'channels', description: 'العناصر أو الكاتاغوري المراد إزالتها (منشن أو ID).', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'addpublisher', description: 'إضافة ناشر رسمي (أو عدة ناشرين).', options: [{ name: 'users', description: 'المستخدمون المراد إضافتهم (منشن أو ID، يمكن وضع أكثر من واحد).', type: ApplicationCommandOptionType.String, required: true }] },
    { name: 'removepublisher', description: 'إزالة ناشر وحذف سجلاته.', options: [{ name: 'user', description: 'المستخدم المراد إزالته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }] },
    { name: 'resetstats', description: 'إعادة تعيين نقاط ناشر.', options: [{ name: 'user', description: 'الناشر المراد تصفير نقاطه (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }, { name: 'channels', description: 'العناصر المراد تصفيرها فقط (مثل #قناة أو ID)، اكتب "all" لحذف كل السجلات.', type: ApplicationCommandOptionType.String, required: false }] },
    { name: 'setadchannel', description: '[إدارة] تعيين قناة إعلانات الناشرين.', options: [{ name: 'channel', description: 'القناة التي ستستقبل التحديثات.', type: ApplicationCommandOptionType.Channel, required: true, channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
    { name: 'customize', description: '[إدارة] تخصيص لون وصورة بعض إيمبدات الأوامر.', options: [{ name: 'command', description: 'الأمر المراد تخصيص إيمبده.', type: ApplicationCommandOptionType.String, required: true, choices: CUSTOMIZABLE_COMMANDS.map(cmd => ({ name: cmd, value: cmd })) }, { name: 'image', description: 'رابط الصورة الجديدة (URL)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false }, { name: 'color', description: 'كود اللون الجديد (Hex)، أو اكتب "reset" للحذف.', type: ApplicationCommandOptionType.String, required: false }] }
];

let db;

export async function getPrefix(guildId) {
    if (!db || !guildId) return البادئة;
    try { const config = await db.get("SELECT prefix FROM config WHERE guild_id = ?", guildId); return config?.prefix || البادئة; }
    catch (e) { console.error("Error getting prefix:", e); return البادئة; }
}

export async function getLang(guildId) {
    return LANG.ar;
}

export function sendUserError(channel, currentLang) {
    const errorData = currentLang.ERROR_MENTION_USER;
    const errorEmbed = new EmbedBuilder().setTitle(errorData.title).setDescription(errorData.description).setColor(0xcc0000).setTimestamp();
    return channel.send({ embeds: [errorEmbed] });
}

// [تعديل] تبسيط الدالة لتجنب أي تأخير في بداية المعالج
export async function checkAdminPermissions(message, currentLang, member) {
    if (!db || !member) return false;
    if (member.id === OWNER_ID) return true;

    // Check ManageGuild permission (always available via Discord API)
    if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;

    // Check custom admin list (requires DB access, done via get/db.get below)
    const guildId = message?.guild.id || member?.guild.id;
    if (!guildId) return false;

    try {
        const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", guildId);
        const adminUsersCsv = config?.admin_role_id;
        if (adminUsersCsv) {
            const adminUserIds = adminUsersCsv.split(',').filter(id => id.trim() !== '');
            if (adminUserIds.includes(member.id)) return true;
        }
    } catch (e) { console.error("Error checking admin permissions (DB lookup):", e); }
    return false;
}


export function extractLinksCount(message) {
    let points = 0;
    if (message.attachments?.size > 0) points += message.attachments.size;
    if (message.embeds?.length > 0) {
        points += message.embeds.filter(e =>
            (e.type === 'image' || e.type === 'video' || e.type === 'gifv') || e.image || e.video || e.thumbnail
        ).length;
    }
    return points;
}

export async function calculatePointsInPeriod(userId, guildId, days) {
    if (!db) return { totalPoints: 0, channelPoints: [] };
    let query;
    let params = [guildId, userId];
    if (days > 0) {
        const date = new Date(); date.setDate(date.getDate() - days); const isoDate = date.toISOString();
        query = `SELECT channel_id, SUM(points_gained) AS points FROM post_history WHERE guild_id = ? AND user_id = ? AND post_date >= ? GROUP BY channel_id`;
        params.push(isoDate);
    } else {
        query = `SELECT channel_id, points FROM channel_points WHERE guild_id = ? AND user_id = ?`;
    }
    try {
        const historyData = await db.all(query, params);
        const totalPoints = historyData.reduce((sum, row) => sum + row.points, 0);
        return { totalPoints: totalPoints, channelPoints: historyData.map(row => ({ channel_id: row.channel_id, points: row.points })) };
    } catch (e) { console.error(`Error calculating points for user ${userId} in period ${days}d:`, e); return { totalPoints: 0, channelPoints: [] }; }
}

export async function getDetailedStatsData(userId, guildId, filterDays) {
    if (!db) return { pointsData: { currentTotalPoints: 0, currentPoints: [], allTotalPoints: 0, allPoints: [] }, dateData: { joinDateFormatted: 'N/A', lastPostDateFormatted: 'لا يوجد' }, monitoredChannels: [] };
    let monitoredChannels = [];
    try {
        const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
        monitoredChannels = config?.monitored_channels ? config.monitored_channels.split(',').filter(Boolean) : [];
        const { totalPoints: currentTotalPoints, channelPoints: currentPoints } = await calculatePointsInPeriod(userId, guildId, filterDays);
        let allTotalPoints = currentTotalPoints, allPoints = currentPoints;
        if (filterDays !== 0) { const allStats = await calculatePointsInPeriod(userId, guildId, 0); allTotalPoints = allStats.totalPoints; allPoints = allStats.channelPoints; }
        const lastActivityRow = await db.get("SELECT MAX(post_date) as latest FROM post_history WHERE user_id = ? AND guild_id = ? AND points_gained > 0", userId, guildId);
        const joinDateRow = await db.get("SELECT last_post_date as earliest FROM publishers WHERE user_id = ? AND guild_id = ?", userId, guildId);
        const dateFormatter = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A';
        const dateTimeFormatter = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'لا يوجد';
        const joinDateFormatted = dateFormatter(joinDateRow?.earliest);
        const lastPostDateFormatted = dateTimeFormatter(lastActivityRow?.latest);
        return { pointsData: { currentTotalPoints, currentPoints, allTotalPoints, allPoints }, dateData: { joinDateFormatted, lastPostDateFormatted }, monitoredChannels };
    } catch(e) { console.error(`Error getting detailed stats data for user ${userId}:`, e); return { pointsData: { currentTotalPoints: 0, currentPoints: [], allTotalPoints: 0, allPoints: [] }, dateData: { joinDateFormatted: 'N/A', lastPostDateFormatted: 'لا يوجد' }, monitoredChannels }; }
}

export async function initDb(reconnect = false) {
    if (db && !reconnect) return true;
    if (db && reconnect) { try { await db.close(); db = null; } catch (e) { console.error("DB Close Error:", e); db = null; } }
    try {
        db = await open({ filename: DB_PATH, driver: sqlite3.Database });
        await db.exec(`PRAGMA journal_mode = WAL;`);
        await db.exec(`CREATE TABLE IF NOT EXISTS publishers (id INTEGER PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT, last_post_date TEXT, ad_message_id TEXT, UNIQUE(guild_id, user_id))`);
        await db.exec(`CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY, guild_id TEXT UNIQUE, monitored_channels TEXT, language TEXT DEFAULT 'ar', admin_role_id TEXT, prefix TEXT DEFAULT '!', ad_channel_id TEXT, top_list_message_id TEXT)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS channel_points (id INTEGER PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, channel_id TEXT NOT NULL, points INTEGER DEFAULT 0, last_post_date TEXT, UNIQUE(guild_id, user_id, channel_id))`);
        await db.exec(`CREATE TABLE IF NOT EXISTS post_history (id INTEGER PRIMARY KEY, guild_id TEXT, user_id TEXT, channel_id TEXT, points_gained INTEGER, post_date TEXT)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_post_history_guild_user_date ON post_history(guild_id, user_id, post_date);`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_channel_points_guild_user ON channel_points(guild_id, user_id);`);
        await db.exec(`CREATE TABLE IF NOT EXISTS customizations (id INTEGER PRIMARY KEY, guild_id TEXT NOT NULL, command_name TEXT NOT NULL, embed_image TEXT, embed_color TEXT, UNIQUE(guild_id, command_name))`);
        const tryAddColumn = async (table, column, type) => { try { await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`); } catch (e) { if (!e.message.includes("duplicate column name")) console.error(`DB Alter Error (${table}.${column}):`, e); } };
        if (!reconnect) {
            await tryAddColumn('config', 'ad_channel_id', 'TEXT');
            await tryAddColumn('config', 'top_list_message_id', 'TEXT');
            await tryAddColumn('publishers', 'ad_message_id', 'TEXT');
        }
        console.log("Database connection established/re-established.");
        return true;
    } catch (err) { console.error("FATAL DB Init/Reconnect Error:", err); db = null; return false; }
}

export async function getCustomization(db, guildId, commandName) {
    if (!db || !guildId || !commandName) return null;
    try { const custom = await db.get("SELECT embed_image, embed_color FROM customizations WHERE guild_id = ? AND command_name = ?", guildId, commandName); return custom || null; }
    catch (e) { console.error(`Error getting customization for ${commandName} in guild ${guildId}:`, e); return null; }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [ Partials.Channel, Partials.Message, Partials.GuildMember ]
});

client.once("ready", async (c) => {
    if (!await initDb()) { console.error("DB Init Failed. Exiting."); process.exit(1); }
    const guildNames = c.guilds.cache.map(g => `- ${g.name} (${g.id})`).join('\n') || "None";
    console.log(`Logged in as ${c.user.tag} ✨`);
    try {
        const owner = await c.users.fetch(OWNER_ID).catch(() => null);
        if (owner) {
            const embed = new EmbedBuilder().setTitle("✅ Bot Started").setDescription(`Logged in as ${c.user.tag}.\n\n**Guilds (${c.guilds.cache.size}):**\n${guildNames}`).setColor(0x00aa00).setTimestamp();
            await owner.send({ embeds: [embed] }).catch(e => console.error("Failed sending ready DM:", e.message));
        }
    } catch (e) { console.error(`Owner DM Error: ${e.message}`); }
    try { await c.application.commands.set(SLASH_COMMANDS); console.log(`✅ ${SLASH_COMMANDS.length} slash commands registered.`); }
    catch (e) { console.error(`Slash Command Error: ${e.message}`, e); }
    const currentLang = await getLang(null);
    startScheduledTasks(c, () => db, currentLang, DB_PATH, OWNER_ID);
});

client.on('guildCreate', async (guild) => {
    console.log(`Joined: ${guild.name} (${guild.id})`);
    try {
        const owner = await client.users.fetch(OWNER_ID).catch(() => null);
        if (owner) {
            const embed = new EmbedBuilder().setTitle("🎉 New Guild").setDescription(`**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Members:** ${guild.memberCount}`).setColor(0x0077ff).setTimestamp();
            await owner.send({ embeds: [embed] }).catch(e => console.error("Failed guildCreate DM:", e.message));
        }
    } catch (e) { console.error(`guildCreate Error: ${e.message}`); }
});

client.on('interactionCreate', async (interaction) => {
    await handleInteraction(interaction, client, db).catch(err => { console.error("Unhandled interactionCreate Error:", err); });
});

client.on("messageCreate", async (message) => {
    await handleMessageCreate(message, client, () => db).catch(err => { console.error("Unhandled messageCreate Error:", err); });
});

client.on("messageDelete", async (message) => {
    if (message.partial) { try { await message.fetch(); } catch { return; } }
    if (message.author?.bot) return;
    await handleMessageDelete(message, client, db).catch(err => { console.error("Unhandled messageDelete Error:", err); });
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
    if (oldMessage.partial) { try { oldMessage = await oldMessage.fetch(); } catch { return; } }
    if (newMessage.partial) { try { newMessage = await newMessage.fetch(); } catch { return; } }
    if (newMessage.author?.bot) return;
    await handleMessageUpdate(oldMessage, newMessage, client, db).catch(err => { console.error("Unhandled messageUpdate Error:", err); });
});

client.on('error', error => console.error('Client Error:', error));
client.on('warn', warning => console.warn('Client Warning:', warning));
process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => { console.error('Uncaught Exception:', error); });

client.login(TOKEN);