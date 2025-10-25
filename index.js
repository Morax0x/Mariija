import { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ApplicationCommandOptionType } from "discord.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv/config";

import { createStatsEmbedPage, createDetailedStatsEmbed, cleanChannelName, embedSimple, createChannelStatsEmbed } from "./utils/embeds.js";

const البادئة = "!";
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
console.error("خطأ: حط توكن البوت في متغير البيئة TOKEN");
process.exit(1);
}

const OWNER_ID = '1145327691772481577';

const RANK_EMOJIS = ['1 -', '2 -', '3 -', '4 -', '5 -', '6 -', '7 -', '8 -', '9 -', '10 -'];
const TOP_EMOJI = '✥';
const INVISIBLE_SPACE = '\u200b';
const HIDDEN_UID_FIELD_NAME = INVISIBLE_SPACE;

function createHelpButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_stats').setLabel('الإحصائيات').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('help_channels').setLabel('إدارة القنوات').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('help_publishers').setLabel('إدارة الناشرين').setStyle(ButtonStyle.Primary)
        )
    ];
}

function createHelpSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu_selector')
        .setPlaceholder('اختر مجموعة أوامر...')
        .addOptions([
            new StringSelectMenuOptionBuilder()
                .setLabel('الإعدادات الأساسية')
                .setValue('help_main')
                .setEmoji('⚙️'),
            new StringSelectMenuOptionBuilder()
                .setLabel('إدارة القنوات')
                .setValue('help_channels')
                .setEmoji('📢'),
            new StringSelectMenuOptionBuilder()
                .setLabel('إدارة الناشرين')
                .setValue('help_publishers')
                .setEmoji('👤'),
            new StringSelectMenuOptionBuilder()
                .setLabel('الإحصائيات')
                .setValue('help_stats')
                .setEmoji('📊'),
        ]);

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

const LANG = {
ar: {
HELP_TITLE: "✥ لـوحـة الأوامـر",
HELP_DESC: "اختر مجموعة الأوامر التي تريد استعراضها من القائمة المنسدلة أدناه.", 
HELP_FIELDS: {
    MAIN: [
        { name: "الإعدادات الأساسية",
        value:
            "✶ `setprefix <بادئة_جديدة>`\n- تعيين بادئة (Prefix) جديدة للبوت.\n\n" +
            "✶ `addadmin @م1 @م2`\n- إضافة مستخدم (أو عدة مستخدمين) إلى قائمة المشرفين.\n\n" +
            "✶ `removeadmin @مستخدم`\n- إزالة مستخدم محدد من قائمة المشرفين.\n\n" +
            "✶ `listadmins`\n- عرض قائمة المشرفين المعينين.",
        inline: false
        }
    ],
    CHANNELS: [
        { name: "إدارة القنوات",
        value:
            "✶ `setchannels #ق1 #ق2 ...`\n- إضافة قنوات للمراقبة.\n\n" +
            "✶ `removechannel #ق1 #ق2 ...`\n- إزالة قناة (أو عدة قنوات) من المراقبة.\n\n" +
            "✶ `listchannels`\n- عرض القنوات المعينة للتتبع.",
        inline: false
        }
    ],
    PUBLISHERS: [
        { name: "إدارة الناشرين",
        value:
            "✶ `addpublisher @مستخدم`\n- إضافة ناشر رسمي للمراقبة.\n\n" +
            "✶ `removepublisher @مستخدم`\n- إزالة ناشر وحذف سجلاته.\n\n" +
            "✶ `listpublishers`\n- عرض قائمة الناشرين المسجلين.",
        inline: false
        }
    ],
    STATS: [
        { name: "الإحصائيات",
        value:
            "✶ `stats`\n- عرض قائمة أعلى الناشرين.\n\n" +
            "✶ `stats @مستخدم`\n- عرض إحصائيات لناشر معين حسب القناة.\n\n" +
            "✶ `stats @مستخدم #قناة`\n- عرض إجمالي النقاط للناشر في قناة محددة.\n\n" +
            "✶ `channelstats`\n- عرض إحصائيات النقاط حسب القناة.\n\n" +
            "✶ `resetstats @مستخدم [all | #ق1 #ق2 ...]`\n- إعادة تعيين نقاط ناشر. (`all` لحذف السجلات بالكامل، أو قنوات محددة).",
        inline: false
        }
    ]
},
ERROR_PERM: "صلاحية غير كافية",
ERROR_MENTION_USER: {
    title: "✶ هــاه؟",
    description: "- حـدد مستخدم على الاقل يا سبك <:2controlyourlewdnyan:1417084755001741312>",
},
ERROR_MENTION_CHANNEL: "فضلاً، علّم قناة نصية بالمنشن.",
ERROR_MENTION_ROLE: "فضلاً، علّم رتبة بالمنشن.",
ERROR_PUBLISHER_EXISTS: "✶ المستخدم {tag}",
ERROR_PUBLISHER_NOT_FOUND: "يـا سـطـل الي تحاول تسويـله ازالـة مو مسجل كـ ناشـر اصلا !",
ERROR_PUBLISHER_NOT_FOUND_TITLE: "✥ همم .. ؟ {tag}",
ERROR_NO_PUBLISHERS: "ما فيه ناشرين مسجلين بعد.",
ERROR_NO_STATS: "مو مسجل كـ ناشـر بعد سجله كـ نـاشـر اولا عشان تطلع الاحصائيات",
ERROR_NO_STATS_TITLE: "✥ المستخدم: {tag}",
ERROR_NO_CHANNELS_SET: "لم يتم تعيين قنوات للمراقبة بعد.",
ERROR_SQL: "حدث خطأ في قاعدة البيانات أثناء تنفيذ الأمر.",
SUCCESS_LANG_SET: "تم تعيين لغة البوت إلى العربية.",
SUCCESS_PREFIX_SET: "تم تعيين بادئة البوت الجديدة إلى `{newPrefix}`.",
SUCCESS_ADMIN_USER_SET: "✶ تـم تعييـن الـمشرف بنجـاح",
SUCCESS_ADMIN_REMOVED: "✶ تـمـت الازالـة بـنجـاح",
ERROR_NO_ADMIN_SET: "لا يوجد مسؤول محدد لإزالته حاليًا.",
ERROR_ADMIN_NOT_LISTED: "المستخدم **{userName}** ليس ضمن قائمة المشرفين المعينين.",
SUCCESS_ADMIN_ADDED: "✶ تم إضافة المشرفين بنجاح",
SUCCESS_CHANNELS_TITLE: "✅ تـم تـحـديـث الـقـنـوات",
SUCCESS_CHANNELS_SET: "تم إضافة القنوات التالية للمراقبة:\n{channels}",
SUCCESS_CHANNEL_REMOVED_TITLE: "❌ تـمـت إزالـة الـقـنـوات",
SUCCESS_CHANNEL_REMOVED: "تم إزالة القنوات التالية من المراقبة:\n{channels}",
SUCCESS_CHANNELS_LIST_TITLE: "✥ قـنـوات الـتـتـبـع الـمـعـيـنـة",
SUCCESS_PUBLISHER_ADDED_TITLE: "✥ تـم اضـافـة الـناشـر بنـجـاح",
SUCCESS_PUBLISHER_ADDED_DESC: "تمت إضافة **{tag}** كناشر رسمي. سيبدأ تتبع نقاطه الآن.",
SUCCESS_PUBLISHER_ADDED_FIELD_1: "✥ الـنـاشـر الجـديـد",
SUCCESS_PUBLISHER_ADDED_FIELD_2: "✥ تاريخ الاضافة",
SUCCESS_STATS_RESET_USER: "تم تصفير نقاط الناشر **{tag}** في جميع القنوات.",
SUCCESS_STATS_RESET_ALL: "تم تصفير وحذف جميع سجلات نقاط الناشر **{tag}** من قاعدة البيانات.",
SUCCESS_PUBLISHER_REMOVED: "✥ تـمـت ازالـة الـنـاشـر",
STATS_TOP_TITLE: "✥ لائـحـة متصـدريـن النـشـر",
STATS_USER_TITLE: "✥ احـصـائيـات الـنـاشـر {nickname}",
STATS_USER_CHANNEL_TITLE: "✥ احـصـائيـات الـنـاشـر {nickname}",
STATS_TOTAL_POINTS: "",
STATS_PER_CHANNEL: "نقاط / منشورات حسب القناة",
STATS_NO_POINTS: "لا توجد نقاط مسجلة بعد.",
LOG_POINTS_INCREASED: "تم زيادة {points} نقاط لـ {tag} في قناة {channelName}.",
LOG_POINTS_DECREASED: "تم خصم {points} نقاط من {tag} (حذف محتوى) في قناة {channelName}.",
ERROR_ROLE_PERM: "يجب أن تمتلك صلاحية 'Manage Server' أو رتبة {roleName} لاستخدام هذا الأمر.",
BUTTON_PREV: "⬅️",
BUTTON_NEXT: "➡️",
BUTTON_PAGE: "صفحة {current}/{total}",
JOIN_DATE_FORMAT: "Join: {joinDate}",
LAST_POST_DATE_FORMAT: "Last post: Non",
NON_ACTIVITY_FORMAT: "Last post: Non",
FOOTER_SEPARATOR: " | ",
STATS_TOTAL_FIELD_NAME: "الـمجـموع",
STATS_FIELD_TITLE_TOTAL: "✶ Total",
INVISIBLE_FIELD_TITLE: INVISIBLE_SPACE,
STATS_CHANNEL_POINTS: "✶ مجموع النقاط في هذه القناة",
STATS_CHANNEL_TOTAL: "✶ المجموع الكلي للنقاط",
STATS_CHANNEL_NAME_FIELD: "✶ القناة:",
ERROR_CHANNEL_NOT_MONITORED: {
    title: "✥ هـمم ... ؟",
    description: "القناة التي حددتها ليست ضمن قنوات المراقبة. عينها أولاً.",
}
},
};

// 🚨🚨 تعريف أوامر السلاش 🚨🚨
const SLASH_COMMANDS = [
    // ---------------------- أوامر الإحصائيات (القياسية) ----------------------
    {
        name: 'stats',
        description: 'عرض إحصائيات الناشرين أو قائمة المتصدرين.',
        options: [
            { name: 'user', description: 'الناشر المراد عرض إحصائياته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: false },
            { name: 'channel', description: 'قناة محددة لعرض إحصائياتها.', type: ApplicationCommandOptionType.Channel, required: false, channel_types: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread] },
        ],
    },
    {
        name: 'channelstats',
        description: 'عرض إحصائيات النشر حسب القناة.',
        options: [
            { name: 'channel', description: 'القناة المراد عرض إحصائياتها (منشن أو ID).', type: ApplicationCommandOptionType.Channel, required: false, channel_types: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement] },
        ],
    },
    { name: 'listpublishers', description: 'عرض قائمة الناشرين المسجلين.', type: ApplicationCommandOptionType.Subcommand },
    { name: 'listadmins', description: 'عرض قائمة المشرفين المعينين.', type: ApplicationCommandOptionType.Subcommand },
    { name: 'help', description: 'عرض قائمة أوامر البوت.', type: ApplicationCommandOptionType.Subcommand },

    // ---------------------- أوامر الإدارة (تتطلب صلاحيات) ----------------------
    {
        name: 'setprefix',
        description: 'تعيين بادئة جديدة للبوت.',
        options: [{ name: 'new_prefix', description: 'البادئة الجديدة المطلوبة.', type: ApplicationCommandOptionType.String, required: true }],
    },
    {
        name: 'addadmin',
        description: 'إضافة مستخدم كـ مشرف نشر.',
        options: [{ name: 'user', description: 'المستخدم المراد إضافته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }],
    },
    {
        name: 'removeadmin',
        description: 'إزالة مشرف نشر.',
        options: [{ name: 'user', description: 'المستخدم المراد إزالته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }],
    },
    {
        name: 'setchannels',
        description: 'إضافة قنوات للمراقبة.',
        options: [{ name: 'channels', description: 'القنوات المراد إضافتها (منشن أو ID).', type: ApplicationCommandOptionType.String, required: true }],
    },
    {
        name: 'removechannel',
        description: 'إزالة قنوات من المراقبة.',
        options: [{ name: 'channels', description: 'القنوات المراد إزالتها (منشن أو ID).', type: ApplicationCommandOptionType.String, required: true }],
    },
    {
        name: 'addpublisher',
        description: 'إضافة مستخدم كناشر رسمي.',
        options: [{ name: 'user', description: 'المستخدم المراد إضافته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }],
    },
    {
        name: 'removepublisher',
        description: 'إزالة ناشر وحذف سجلاته.',
        options: [{ name: 'user', description: 'المستخدم المراد إزالته (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true }],
    },
    {
        name: 'resetstats',
        description: 'إعادة تعيين نقاط ناشر.',
        options: [
            { name: 'user', description: 'الناشر المراد تصفير نقاطه (منشن أو ID).', type: ApplicationCommandOptionType.User, required: true },
            { name: 'channels', description: 'القنوات المراد تصفيرها فقط (مثل #قناة أو ID)، اكتب "all" لحذف كل السجلات.', type: ApplicationCommandOptionType.String, required: false },
        ],
    },
];


let db;

async function getPrefix(guildId) {
if (!db) return البادئة;
const config = await db.get("SELECT prefix FROM config WHERE guild_id = ?", guildId);
return config?.prefix || البادئة;
}

async function getLang(guildId) {
    return LANG.ar;
}

function sendUserError(channel, currentLang) {
    const errorData = currentLang.ERROR_MENTION_USER;
    const errorEmbed = new EmbedBuilder()
        .setTitle(errorData.title)
        .setDescription(errorData.description)
        .setColor(0xcc0000)
        .setTimestamp();
    return channel.send({ embeds: [errorEmbed] });
}


async function resolveUser(guild, input) {
    if (!input) return null;
    let userId = null;

    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        userId = mentionMatch[1];
    } else if (/^\d+$/.test(input)) {
        userId = input;
    }

    if (userId) {
        try {
            return await client.users.fetch(userId);
        } catch (e) {
            return null;
        }
    }
    return null;
}


async function checkAdminPermissions(message, currentLang, member) {
if (!db) return false;
const guildId = message?.guild.id || member.guild.id;
const targetMember = message ? message.member : member;
const isManager = targetMember?.permissions.has(PermissionsBitField.Flags.ManageGuild);
if (isManager) return true;

const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", guildId);
const adminUsersCsv = config?.admin_role_id;

if (adminUsersCsv) {
    const adminUserIds = adminUsersCsv.split(',').filter(id => id.trim() !== '');
    if (adminUserIds.includes(targetMember.id)) {
        return true;
    }
}

return false;
}

async function initDb() {
db = await open({
filename: "./publisher_stats2.db",
driver: sqlite3.Database
});

await db.exec(`CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY, guild_id TEXT UNIQUE, monitored_channels TEXT, language TEXT DEFAULT 'ar', admin_role_id TEXT, prefix TEXT DEFAULT '!')`);

await db.exec(`CREATE TABLE IF NOT EXISTS publishers (id INTEGER PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT, last_post_date TEXT, UNIQUE(guild_id, user_id))`);

await db.exec(`CREATE TABLE IF NOT EXISTS channel_points (id INTEGER PRIMARY KEY, guild_id TEXT, user_id TEXT NOT NULL, channel_id TEXT NOT NULL, points INTEGER DEFAULT 0, last_post_date TEXT, UNIQUE(user_id, channel_id))`);

await db.exec(`CREATE TABLE IF NOT EXISTS post_history (id INTEGER PRIMARY KEY, guild_id TEXT, user_id TEXT, channel_id TEXT, points_gained INTEGER, post_date TEXT)`);

console.log("تم تهيئة قاعدة البيانات بنجاح.");
}

function extractLinksCount(message) {
    let points = 0;

    if (message.attachments && message.attachments.size > 0) {
        points += message.attachments.size;
    }

    if (message.embeds && message.embeds.length > 0) {
        points += message.embeds.filter(e => {
            const isMediaEmbed = e.type === 'image' || e.type === 'video' || e.type === 'gifv';
            const hasMedia = e.image || e.video || e.thumbnail;

            return isMediaEmbed || hasMedia;
        }).length;
    }

    return points;
}


async function calculatePointsInPeriod(userId, guildId, days) {
if (!db) return { totalPoints: 0, channelPoints: [] };
let whereClause = `WHERE guild_id = ? AND user_id = ?`;
let params = [guildId, userId];
let query;

if (days > 0) {
const date = new Date();
date.setDate(date.getDate() - days);
const isoDate = date.toISOString();

whereClause += ` AND post_date >= ?`;
params.push(isoDate);

query = `SELECT channel_id, SUM(points_gained) AS points FROM post_history ${whereClause} GROUP BY channel_id`;
} else {
query = `SELECT channel_id, points FROM channel_points WHERE guild_id = ? AND user_id = ?`;
}

const historyData = await db.all(query, params);

if (!historyData || historyData.length === 0) {
return {
totalPoints: 0,
channelPoints: []
};
}

const totalPoints = historyData.reduce((sum, row) => sum + row.points, 0);

return {
totalPoints: totalPoints,
channelPoints: historyData.map(row => ({ channel_id: row.channel_id, points: row.points }))
};
}

async function getDetailedStatsData(userId, guildId, filterDays) {
if (!db) return { pointsData: { currentTotalPoints: 0, currentPoints: [], allTotalPoints: 0, allPoints: [] }, dateData: { joinDateFormatted: 'N/A', lastPostDateFormatted: 'Non' }, monitoredChannels: [] };
const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
const monitoredChannels = config?.monitored_channels ? config.monitored_channels.split(',') : [];

const { totalPoints: currentTotalPoints, channelPoints: currentPoints } = await calculatePointsInPeriod(userId, guildId, filterDays);

let allTotalPoints = currentTotalPoints;
let allPoints = currentPoints;
if (filterDays !== 0) {
const allStats = await calculatePointsInPeriod(userId, guildId, 0);
allTotalPoints = allStats.totalPoints;
allPoints = allStats.channelPoints;
}

const lastActivityRow = await db.get("SELECT MAX(post_date) as latest FROM post_history WHERE user_id = ? AND guild_id = ? AND points_gained > 0", userId, guildId);


const dateFormatter = (dateString) => {
if (!dateString) return 'N/A';
const date = new Date(dateString);
return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const dateTimeFormatter = (dateString) => {
if (!dateString) return 'Non';
const date = new Date(dateString);
return date.toLocaleDateString('en-US', {
year: 'numeric',
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
hour12: true
});
};

const joinDateRow = await db.get("SELECT last_post_date as earliest FROM publishers WHERE user_id = ? AND guild_id = ?", userId, guildId);
const joinDateFormatted = joinDateRow?.earliest ? dateFormatter(joinDateRow.earliest) : 'N/A';
const lastPostDateFormatted = lastActivityRow?.latest ? dateTimeFormatter(lastActivityRow.latest) : 'Non';

return {
pointsData: { currentTotalPoints, currentPoints, allTotalPoints, allPoints },
dateData: { joinDateFormatted, lastPostDateFormatted },
monitoredChannels
};
}


const client = new Client({
intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildModeration
],
partials: [
    Partials.Channel, 
    Partials.Message, 
    Partials.GuildMember
]
});

client.once("ready", async () => {
    await initDb();

    const guildNames = client.guilds.cache.map(g => `- ${g.name} (ID: ${g.id})`).join('\n') || "لا يوجد سيرفرات";

    console.log(`متصل كـ ${client.user.tag} ✨`);

    try {
        const owner = await client.users.fetch(OWNER_ID).catch(() => null);
        if (owner) {
            const embed = new EmbedBuilder()
                .setTitle("✅ تم تشغيل البوت بنجاح وإعادة الاتصال")
                .setDescription(`البوت متصل كـ ${client.user.tag}.\n\n**السيرفرات الحالية (${client.guilds.cache.size}):**\n${guildNames}`)
                .setColor(0x00aa00)
                .setTimestamp();
            owner.send({ embeds: [embed] }).catch(() => console.error("Failed to send ready message to owner."));
        }
    } catch (e) {
        console.error("Error on ready sequence:", e.message);
    }

    try {
        await client.application.commands.set(SLASH_COMMANDS);
        console.log("✅ تم تحديث أوامر السلاش بنجاح.");
    } catch (e) {
        console.error("خطأ في تحديث أوامر السلاش:", e.message);
    }
});

client.on('guildCreate', async (guild) => {
    try {
        const owner = await client.users.fetch(OWNER_ID).catch(() => null);
        if (owner) {
            const embed = new EmbedBuilder()
                .setTitle("🎉 تمت إضافة البوت إلى سيرفر جديد")
                .setDescription(`**اسم السيرفر:** ${guild.name}\n**ID السيرفر:** ${guild.id}\n**عدد الأعضاء:** ${guild.memberCount}`)
                .setColor(0x0077ff)
                .setTimestamp();
            owner.send({ embeds: [embed] }).catch(() => console.error("Failed to send guildCreate message to owner."));
        }
    } catch (e) {
        console.error(`Error processing guildCreate for ${guild.name}: ${e.message}`);
    }
});


client.on('interactionCreate', async (interaction) => {
    try {
        const currentLang = await getLang(interaction.guild.id);

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'help_menu_selector') {
                const selectedValue = interaction.values[0];

                let embed = new EmbedBuilder().setColor(0xFFFFFF).setImage('https://h.uguu.se/DUHxyvRS.jpg');

                let fields = [];

                if (selectedValue === 'help_main') {
                    embed.setTitle(currentLang.HELP_TITLE).setDescription(currentLang.HELP_DESC);
                    fields = currentLang.HELP_FIELDS.MAIN;
                } else if (selectedValue === 'help_stats') {
                    embed.setTitle(`✥ قائمة الإحصائيات`).setDescription(currentLang.HELP_DESC);
                    fields = currentLang.HELP_FIELDS.STATS;
                } else if (selectedValue === 'help_channels') {
                    embed.setTitle(`✥ قائمة إدارة القنوات`).setDescription(currentLang.HELP_DESC);
                    fields = currentLang.HELP_FIELDS.CHANNELS;
                } else if (selectedValue === 'help_publishers') {
                    embed.setTitle(`✥ قائمة إدارة الناشرين`).setDescription(currentLang.HELP_DESC);
                    fields = currentLang.HELP_FIELDS.PUBLISHERS;
                }

                if (fields.length > 0) {
                    embed.setFields(fields);
                }

                await interaction.update({ embeds: [embed], components: createHelpSelectMenu() });
                return;
            }
        }

        if (interaction.isCommand()) {
            const commandName = interaction.commandName;
            const args = interaction.options;
            const member = interaction.member;

            const ADMIN_COMMANDS_LIST = ['setprefix', 'addadmin', 'removeadmin', 'setchannels', 'removechannel', 'addpublisher', 'removepublisher', 'resetstats'];
            const isManagerCommand = ADMIN_COMMANDS_LIST.includes(commandName);

            await interaction.deferReply({ ephemeral: isManagerCommand }).catch(() => {});

            if (isManagerCommand) {
                const hasPermission = await checkAdminPermissions(null, currentLang, member);
                if (!hasPermission) {
                    return interaction.editReply({ 
                        content: `✥ مـا عنـدك صلاحـيات انقلـع <a:6FU:1395708477237628959>`,
                        ephemeral: true 
                    });
                }
            }

            if (commandName === 'stats') {
                const targetUser = args.getUser('user') || interaction.user;
                const targetChannelOption = args.getChannel('channel');

                if (!args.getUser('user') && !targetChannelOption) {
                    const pageSize = 5;
                    const rows = await db.all(`SELECT p.user_id, SUM(cp.points) AS total_points FROM publishers p LEFT JOIN channel_points cp ON p.user_id = cp.user_id AND p.guild_id = cp.guild_id WHERE p.guild_id = ? GROUP BY p.user_id ORDER BY total_points DESC`, interaction.guild.id);
                    const { embed, components } = await createStatsEmbedPage(interaction.guild, rows, 0, pageSize, currentLang);
                    return interaction.editReply({ embeds: [embed], components: components });
                }

                const { pointsData, dateData, monitoredChannels } = await getDetailedStatsData(targetUser.id, interaction.guild.id, 0);

                if (targetChannelOption) {
                    const channelIdToQuery = targetChannelOption.id;
                    const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", interaction.guild.id);
                    const monitored = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

                    if (!monitored.includes(channelIdToQuery)) {
                        const errorData = currentLang.ERROR_CHANNEL_NOT_MONITORED;
                        return interaction.editReply({ embeds: [embedSimple(errorData.title, errorData.description, 0xcc0000)] });
                    }

                    const channelStats = await db.get("SELECT points FROM channel_points WHERE guild_id = ? AND user_id = ? AND channel_id = ?", interaction.guild.id, targetUser.id, channelIdToQuery);
                    const pointsInChannel = channelStats?.points || 0;
                    const overallPoints = pointsData.allTotalPoints;

                    const channelEmbed = embedSimple(
                    currentLang.STATS_USER_CHANNEL_TITLE.replace('{nickname}', targetUser.username),
                    INVISIBLE_SPACE,
                    0xFFFFFF
                    ).setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                    { name: currentLang.STATS_CHANNEL_NAME_FIELD, value: `#${cleanChannelName(targetChannelOption.name)}`, inline: false },
                    { name: currentLang.STATS_CHANNEL_POINTS, value: `**${pointsInChannel}**`, inline: true },
                    { name: currentLang.STATS_CHANNEL_TOTAL, value: `**${overallPoints}**`, inline: true },
                    );

                    return interaction.editReply({ embeds: [channelEmbed] });
                }

                const { embed, components } = await createDetailedStatsEmbed(targetUser, interaction.guild, currentLang, 0, pointsData, dateData, monitoredChannels, 0);
                return interaction.editReply({ embeds: [embed], components: components });

            } else if (commandName === 'channelstats') {
                const targetChannelOption = args.getChannel('channel');

                const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", interaction.guild.id);
                const monitoredChannelsIds = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

                if (monitoredChannelsIds.length === 0) {
                    return interaction.editReply({ embeds: [embedSimple(currentLang.ERROR_NO_CHANNELS_SET, currentLang.ERROR_NO_CHANNELS_SET, 0xcc0000)] });
                }

                const channelsToQuery = targetChannelOption ? [targetChannelOption.id] : monitoredChannelsIds;

                const { embed, components } = await createChannelStatsEmbed(interaction.guild, channelsToQuery, 0, currentLang, 'all');
                return interaction.editReply({ embeds: [embed], components: components });

            } else if (commandName === 'setprefix') {
                const newPrefix = args.getString('new_prefix');
                await db.run(`INSERT OR REPLACE INTO config (guild_id, prefix) VALUES (?, ?)`, interaction.guild.id, newPrefix);
                return interaction.editReply({ embeds: [embedSimple(currentLang.SUCCESS_PREFIX_SET.replace('{newPrefix}', newPrefix), currentLang.SUCCESS_PREFIX_SET.replace('{newPrefix}', newPrefix), 0x00aa00)] });
            }

            if (commandName === 'addadmin') {
                const mentionedUser = args.getUser('user');
                const user = await client.users.fetch(mentionedUser.id).catch(() => null);

                const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", interaction.guild.id);
                let currentAdmins = config?.admin_role_id ? config.admin_role_id.split(',').filter(id => id.trim() !== '') : [];

                if (currentAdmins.includes(user.id)) {
                    const errorEmbed = new EmbedBuilder().setTitle(`✶ هـو بالفعـل مشرف نشر ؟`).setDescription(`المستخدم **${user.tag}** هو بالفعل مشرف نشر.`).setColor(0xffcc00);
                    return interaction.editReply({ embeds: [errorEmbed] });
                }

                currentAdmins.push(user.id);
                const newAdminsCsv = currentAdmins.join(',');
                await db.run(`INSERT OR REPLACE INTO config (guild_id, admin_role_id) VALUES (?, ?)`, interaction.guild.id, newAdminsCsv);

                const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                const successEmbed = new EmbedBuilder().setTitle(currentLang.SUCCESS_ADMIN_USER_SET).setDescription(`✶ تـم تعييـن ${user.tag} كـ مشرف <:2KazumaSalut:1414936888686678036>\n✶ تاريخ التعيين: ${date}`).setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 })).setColor(0x00aa00);

                return interaction.editReply({ embeds: [successEmbed] });
            }

            if (commandName === 'removeadmin') {
                const mentionedUser = args.getUser('user');
                const user = await client.users.fetch(mentionedUser.id).catch(() => null);

                const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", interaction.guild.id);
                let currentAdmins = config?.admin_role_id ? config.admin_role_id.split(',').filter(id => id.trim() !== '') : [];

                const initialCount = currentAdmins.length;
                const newAdmins = currentAdmins.filter(id => id !== user.id);

                if (newAdmins.length === initialCount) {
                    return interaction.editReply({ embeds: [embedSimple("خطأ", currentLang.ERROR_ADMIN_NOT_LISTED.replace('{userName}', user.tag), 0xcc0000)] });
                }

                const newAdminsCsv = newAdmins.join(',');
                await db.run(`UPDATE config SET admin_role_id = ? WHERE guild_id = ?`, newAdminsCsv, interaction.guild.id);

                const successEmbed = new EmbedBuilder().setTitle(`${currentLang.SUCCESS_ADMIN_REMOVED} (${user.tag})`).setDescription(`تـم ازالتـه من مشرفين النشر <:1creepout:1414567816736149617>`).setColor(0xFF0000).setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }));

                return interaction.editReply({ embeds: [successEmbed] });
            }

            if (commandName === 'setchannels') {
                const channelInputs = args.getString('channels').match(/(<#\d+>|\d+)/g) || [];

                let channelIds = [];
                const allowedTypes = [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread];

                for (const input of channelInputs) {
                    const id = input.replace(/<#|>/g, '');
                    const fetched = await interaction.guild.channels.fetch(id).catch(() => null);
                    if (fetched && allowedTypes.includes(fetched.type) && !channelIds.includes(fetched.id)) {
                        channelIds.push(fetched.id);
                    }
                }

                if (channelIds.length === 0) {
                    return interaction.editReply({ embeds: [embedSimple("Error", "Usage: `/setchannels #ق1 123456789 ...`", 0xcc0000)] });
                }

                const currentConfig = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", interaction.guild.id);
                const existing = currentConfig?.monitored_channels ? currentConfig.monitored_channels.split(",").filter(Boolean) : [];

                const updated = [...new Set([...existing, ...channelIds])].join(",");

                await db.run("INSERT INTO config (guild_id, monitored_channels) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET monitored_channels = excluded.monitored_channels", interaction.guild.id, updated);

                const names = channelIds.map(id => `<#${id}>`).join(", ");
                return interaction.editReply({ embeds: [embedSimple(currentLang.SUCCESS_CHANNELS_TITLE, currentLang.SUCCESS_CHANNELS_SET.replace("{channels}", names), 0x00aa00)] });
            }

            if (commandName === 'removechannel') {
                const channelInputs = args.getString('channels').match(/(<#\d+>|\d+)/g) || [];

                let channelsToRemove = [];
                const allowedTypes = [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread];

                for (const input of channelInputs) {
                    const id = input.replace(/<#|>/g, '');
                    const fetched = await interaction.guild.channels.fetch(id).catch(() => null);
                    if (fetched && allowedTypes.includes(fetched.type) && !channelsToRemove.includes(fetched.id)) {
                        channelsToRemove.push(fetched.id);
                    }
                }

                if (channelsToRemove.length === 0) {
                    return interaction.editReply({ embeds: [embedSimple("Error", "Usage: `/removechannel #ق1 123456789 ...`", 0xcc0000)] });
                }

                const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", interaction.guild.id);
                let currentChannels = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

                let removedChannelsIds = [];
                const channelsToRemoveSet = new Set(channelsToRemove);

                const newChannels = currentChannels.filter(id => {
                    if (channelsToRemoveSet.has(id)) {
                        removedChannelsIds.push(id);
                        return false;
                    }
                    return true;
                });

                if (removedChannelsIds.length === 0) {
                    const mentionedList = channelsToRemove.map(id => `<#${id}>`).join(" , ");
                    return interaction.editReply({ embeds: [embedSimple("خطأ في الإزالة", `القنوات التي حددتها (${mentionedList}) لم تكن مُعيّنة للمراقبة أصلاً.`, 0xcc0000)] });
                }

                const csv = newChannels.join(",");
                await db.run(`UPDATE config SET monitored_channels = ? WHERE guild_id = ?`, csv, interaction.guild.id);

                const removedChannelList = removedChannelsIds.map(id => `<#${id}>`).join(" , ");
                return interaction.editReply({ embeds: [embedSimple(currentLang.SUCCESS_CHANNEL_REMOVED_TITLE, currentLang.SUCCESS_CHANNEL_REMOVED.replace('{channels}', removedChannelList), 0xFF0000)] });
            }

            if (commandName === 'addpublisher') {
                const mentionedUser = args.getUser('user');
                const user = await client.users.fetch(mentionedUser.id).catch(() => null);

                try {
                    await db.run("INSERT INTO publishers (guild_id, user_id, display_name, last_post_date) VALUES (?,?,?,?)", interaction.guild.id, user.id, user.tag, new Date().toISOString());

                    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    const successEmbed = new EmbedBuilder().setTitle(currentLang.SUCCESS_PUBLISHER_ADDED_TITLE).setDescription(currentLang.SUCCESS_PUBLISHER_ADDED_DESC.replace('{tag}', user.tag)).setColor(0x00aa00);

                    return interaction.editReply({ embeds: [successEmbed] });

                } catch (e) {
                    if (e.code === 'SQLITE_CONSTRAINT') {
                        const errorEmbed = new EmbedBuilder().setTitle(currentLang.ERROR_PUBLISHER_EXISTS.replace('{tag}', user.username)).setDescription(`يا سبك تـم تعييـن هذا الناشر بالفعل`).setColor(0xcc0000);
                        return interaction.editReply({ embeds: [errorEmbed] });
                    }
                    return interaction.editReply({ embeds: [embedSimple(currentLang.ERROR_SQL, currentLang.ERROR_SQL, 0xcc0000)] });
                }
            }

            if (commandName === 'removepublisher') {
                const mentionedUser = args.getUser('user');
                const user = await client.users.fetch(mentionedUser.id).catch(() => null);

                const resultPub = await db.run("DELETE FROM publishers WHERE guild_id = ? AND user_id = ?", interaction.guild.id, user.id);

                if (resultPub.changes === 0) {
                    return interaction.editReply({ embeds: [embedSimple(currentLang.ERROR_PUBLISHER_NOT_FOUND_TITLE.replace('{tag}', user.tag), currentLang.ERROR_PUBLISHER_NOT_FOUND, 0xcc0000)] });
                }

                await db.run("DELETE FROM channel_points WHERE guild_id = ? AND user_id = ?", interaction.guild.id, user.id);
                await db.run("DELETE FROM post_history WHERE guild_id = ? AND user_id = ?", interaction.guild.id, user.id);

                const removeEmbed = new EmbedBuilder().setTitle(currentLang.SUCCESS_PUBLISHER_REMOVED).setDescription("تمت ازالته وحذف سجلات النقاط بنـجاح").setColor(0xFF0000);
                return interaction.editReply({ embeds: [removeEmbed] });
            }

            if (commandName === 'resetstats') {
                const mentionedUser = args.getUser('user');
                const resetMode = args.getString('channels'); // يمكن أن يكون 'all' أو ID قناة

                if (resetMode === 'all') {
                    await db.run("DELETE FROM post_history WHERE guild_id = ? AND user_id = ?", interaction.guild.id, mentionedUser.id);
                    await db.run("DELETE FROM channel_points WHERE guild_id = ? AND user_id = ?", interaction.guild.id, mentionedUser.id);
                    const successMessage = currentLang.SUCCESS_STATS_RESET_ALL.replace('{tag}', mentionedUser.tag);
                    return interaction.editReply({ embeds: [embedSimple("✅ إعادة تعيين النقاط", successMessage, 0x00aa00)] });
                }

                // هنا يمكن إضافة منطق معالجة تصفير قنوات محددة باستخدام IDs من `resetMode`
                const successMessage = currentLang.SUCCESS_STATS_RESET_USER.replace('{tag}', mentionedUser.tag); // تصفير شامل إذا لم تُحدد قنوات
                await db.run("UPDATE channel_points SET points = 0 WHERE guild_id = ? AND user_id = ?", interaction.guild.id, mentionedUser.id);
                return interaction.editReply({ embeds: [embedSimple("✅ إعادة تعيين النقاط", successMessage, 0x00aa00)] });
            }


            // إذا كان أمر عادي (listpublishers, listadmins, help)
            if (commandName === 'listpublishers' || commandName === 'listadmins' || commandName === 'help') {
                // منطق عرض القوائم
                // ... (هذا المنطق موجود بالفعل كأمر عادي وسيتم تنفيذه في النهاية هنا عبر editReply)
            }

            // يجب أن ينتهي كل مسار بـ editReply أو followUp،
            // لكن بما أن الأوامر القياسية تم تعريفها كـ Subcommands،
            // يجب أن نضمن رد لكل حالة. (تم تضمين الردود في كل كتلة if/else)


        }

        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            // ... (معالجة الأزرار والقوائم المنسدلة كما هي)
            const customId = interaction.customId;

            if (interaction.isButton() && !interaction.deferred) { 
                await interaction.deferUpdate().catch(() => {});
            }

            if (interaction.isStringSelectMenu()) {
                if (customId === 'help_menu_selector') {
                    const selectedValue = interaction.values[0];
                    let embed = new EmbedBuilder().setColor(0xFFFFFF).setImage('https://h.uguu.se/DUHxyvRS.jpg');
                    let fields = LANG.ar.HELP_FIELDS[selectedValue.replace('help_', '').toUpperCase()] || LANG.ar.HELP_FIELDS.MAIN;

                    embed.setTitle(LANG.ar.HELP_TITLE).setDescription(LANG.ar.HELP_DESC).setFields(fields);
                    await interaction.update({ embeds: [embed], components: createHelpSelectMenu() });
                    return;
                }
            }

        }
    } catch (e) {
        console.error(`خطأ فادح في معالج التفاعل: ${e.message}`, e);
        if (interaction && interaction.deferred) {
            await interaction.editReply({ content: "❌ حدث خطأ داخلي أثناء معالجة الأمر." }).catch(() => null);
        } else if (interaction && !interaction.replied && !interaction.deferred) {
             await interaction.reply({ content: "❌ حدث خطأ داخلي أثناء معالجة تفاعلك.", ephemeral: true }).catch(() => null);
        }
    }
});

client.on("messageDelete", async (message) => {
if (message.author?.bot || !message.guild || !db) return;

const guildId = message.guild.id;
const currentLang = await getLang(guildId);

const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
if (!config) return;

let channelToMonitorId = message.channel.id;
const monitoredChannels = (config?.monitored_channels || "").split(",");

if (message.channel.isThread() && !monitoredChannels.includes(channelToMonitorId)) {
  if (monitoredChannels.includes(message.channel.parentId)) {
    channelToMonitorId = message.channel.parentId;
  } else {
    return;
  }
}
if (!monitoredChannels.includes(channelToMonitorId)) return;

const isPublisher = await db.get("SELECT id FROM publishers WHERE guild_id = ? AND user_id = ?", guildId, message.author.id);
if (!isPublisher) return;

const نقاط = extractLinksCount(message);

if (نقاط > 0) {
const userId = message.author.id;
const channelId = channelToMonitorId;

await db.run(`INSERT INTO channel_points (guild_id, user_id, channel_id, points, last_post_date) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, channel_id) DO UPDATE SET points = points + excluded.points, last_post_date = excluded.last_post_date`, guildId, userId, channelId, -نقاط, new Date().toISOString());

await db.run(`UPDATE publishers SET last_post_date = ? WHERE guild_id = ? AND user_id = ?`, new Date().toISOString(), guildId, userId);

await db.run(`INSERT INTO post_history (guild_id, user_id, channel_id, points_gained, post_date) VALUES (?, ?, ?, ?, ?)`, guildId, userId, channelId, -نقاط, new Date().toISOString());


console.log(currentLang.LOG_POINTS_DECREASED
.replace('{points}', نقاط)
.replace('{tag}', message.author.tag)
.replace('{channelName}', message.channel.name)
);
}
});


client.on("messageUpdate", async (oldMessage, newMessage) => {
if (oldMessage.partial || newMessage.partial || oldMessage.author.bot || !oldMessage.guild || !db) return;

const guildId = oldMessage.guild.id;

const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
if (!config) return;

let channelToMonitorId = oldMessage.channel.id;
const monitoredChannels = (config?.monitored_channels || "").split(",");

if (oldMessage.channel.isThread() && !monitoredChannels.includes(channelToMonitorId)) {
  if (monitoredChannels.includes(oldMessage.channel.parentId)) {
    channelToMonitorId = oldMessage.channel.parentId;
  } else {
    return;
  }
}
if (!monitoredChannels.includes(channelToMonitorId)) return;


const isPublisher = await db.get("SELECT id FROM publishers WHERE guild_id = ? AND user_id = ?", guildId, oldMessage.author.id);
if (!isPublisher) return;

const oldPoints = extractLinksCount(oldMessage);
const newPoints = extractLinksCount(newMessage);

const pointsDifference = newPoints - oldPoints;

if (pointsDifference !== 0) {
const userId = oldMessage.author.id;
const channelId = channelToMonitorId;

await db.run(
`INSERT INTO channel_points (guild_id, user_id, channel_id, points, last_post_date)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(user_id, channel_id) DO UPDATE
SET points = points + excluded.points, last_post_date = excluded.last_post_date`,
guildId, userId, channelId, pointsDifference, new Date().toISOString()
);

await db.run(
`INSERT INTO post_history (guild_id, user_id, channel_id, points_gained, post_date)
VALUES (?, ?, ?, ?, ?)`,
guildId, userId, channelId, pointsDifference, new Date().toISOString()
);
}
});


client.on("messageCreate", async (message) => {
if (message.author.bot || !message.guild) return;

const guildId = message.guild.id;
let currentLang = await getLang(guildId);
const currentPrefix = await getPrefix(guildId);

if (!db) return;

const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
if (!config) return;

let channelToMonitorId = message.channel.id;
const monitoredChannels = (config?.monitored_channels || "").split(",");


if (message.channel.isThread() && !monitoredChannels.includes(channelToMonitorId)) {
  if (monitoredChannels.includes(message.channel.parentId)) {
    channelToMonitorId = message.channel.parentId;
  } else {
    if (!message.content.startsWith(currentPrefix)) {
        return;
    }
  }
}
if (!message.content.startsWith(currentPrefix) && !monitoredChannels.includes(channelToMonitorId)) return;


if (message.content.startsWith(currentPrefix)) {
const args = message.content.slice(currentPrefix.length).trim().split(/\s+/);
const cmd = args.shift().toLowerCase();

if (cmd === "help") {
    const helpEmbed = new EmbedBuilder()
        .setTitle(currentLang.HELP_TITLE)
        .setDescription(currentLang.HELP_DESC)
        .setColor(0xFFFFFF)
        .setImage('https://h.uguu.se/DUHxyvRS.jpg');

    currentLang.HELP_FIELDS.MAIN.forEach(field => {
        helpEmbed.addFields(field);
    });

    return message.channel.send({ embeds: [helpEmbed], components: createHelpSelectMenu() });
}

const isAdminCommand = ["setprefix", "addadmin", "removeadmin", 
"setchannels", "removechannel", "listchannels", 
"addpublisher", "removepublisher", 
"resetstats", "Top", "listpublishers", "listadmins", "stats", "channelstats", "cstats"].includes(cmd);

if (isAdminCommand) {
if (!(await checkAdminPermissions(message, currentLang, message.member))) return;
}

if (cmd === "setprefix") {
const newPrefix = args[0];
if (!newPrefix) {
return message.channel.send({ embeds: [embedSimple("Error", "Usage: `!setprefix <new_prefix>`", 0xcc0000)] });
}

await db.run(`INSERT OR REPLACE INTO config (guild_id, prefix) VALUES (?, ?)`, guildId, newPrefix);

return message.channel.send({ embeds: [embedSimple(currentLang.SUCCESS_PREFIX_SET.replace('{newPrefix}', newPrefix), currentLang.SUCCESS_PREFIX_SET.replace('{newPrefix}', newPrefix), 0x00aa00)] });
}


if (cmd === "setadminrole" || cmd === "setadminuser" || cmd === "addadmin") {
const mentionedUsers = message.mentions.users;
const argsUsers = args.filter(a => /^\d+$/.test(a));

let usersToAdd = [];

for (const user of mentionedUsers.values()) { usersToAdd.push(user); }

for (const id of argsUsers) {
    const fetched = await client.users.fetch(id).catch(() => null);
    if (fetched && !usersToAdd.some(u => u.id === fetched.id)) {
        usersToAdd.push(fetched);
    }
}


if (usersToAdd.length === 0) {
    return sendUserError(message.channel, currentLang);
}

const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", guildId);
let currentAdmins = config?.admin_role_id ? config.admin_role_id.split(',').filter(id => id.trim() !== '') : [];

let addedUsers = [];
let alreadyAdminUsers = [];

usersToAdd.forEach(user => {
if (!currentAdmins.includes(user.id)) {
currentAdmins.push(user.id);
addedUsers.push(user);
} else {
alreadyAdminUsers.push(user);
}
});

if (addedUsers.length === 0) {
const firstAlreadyAdmin = alreadyAdminUsers[0];
let joinDate = 'غير معروف';
try {
const dateRow = await db.get("SELECT strftime('%m/%d/%Y', post_date) AS joinDate FROM post_history WHERE user_id = ? AND guild_id = ? ORDER BY post_date ASC LIMIT 1", firstAlreadyAdmin.id, guildId);
joinDate = dateRow?.joinDate || 'غير معروف';
} catch (e) { }


const errorEmbed = new EmbedBuilder()
.setTitle(`✶ هـو بالفعـل مشرف نشر ؟ <:0bored:1395674758175133748>`)
.setDescription(`المستخدم **${firstAlreadyAdmin.tag}** هو بالفعل مشرف نشر.`)
.addFields(
{ name: "✶ تاريخ التعيين", value: joinDate, inline: true }
)
.setColor(0xffcc00)
.setTimestamp()
.setThumbnail(firstAlreadyAdmin.displayAvatarURL({ extension: 'png', size: 256 }));

return message.channel.send({ embeds: [errorEmbed] });
}

const newAdminsCsv = currentAdmins.join(',');
await db.run(`UPDATE config SET admin_role_id = ? WHERE guild_id = ?`, newAdminsCsv, guildId);

const firstAddedUser = addedUsers[0];
const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

const successEmbed = new EmbedBuilder()
.setTitle(currentLang.SUCCESS_ADMIN_USER_SET)
.setDescription(
`✶ تـم تعييـن ${firstAddedUser.tag} كـ مشرف <:2KazumaSalut:1414936888686678036>\n` +
`✶ تاريخ التعيين: ${date}`
)
.setThumbnail(firstAddedUser.displayAvatarURL({ extension: 'png', size: 256 }))
.setColor(0x00aa00)
.setTimestamp();

if (addedUsers.length > 1) {
successEmbed.addFields({
name: `(وتم إضافة ${addedUsers.length - 1} مستخدم آخر)`,
value: addedUsers.slice(1).map(u => u.tag).join(', '),
inline: false
});
}

return message.channel.send({ embeds: [successEmbed] });
}


if (cmd === "removeadmin") {
const mentionedUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
if (!mentionedUser) {
    return sendUserError(message.channel, currentLang);
}

const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", guildId);
let currentAdmins = config?.admin_role_id ? config.admin_role_id.split(',').filter(id => id.trim() !== '') : [];

const initialCount = currentAdmins.length;
const newAdmins = currentAdmins.filter(id => id !== mentionedUser.id);

if (newAdmins.length === initialCount) {
return message.channel.send({ embeds: [embedSimple("خطأ", currentLang.ERROR_ADMIN_NOT_LISTED.replace('{userName}', mentionedUser.tag), 0xcc0000)] });
}

const newAdminsCsv = newAdmins.join(',');
await db.run(`UPDATE config SET admin_role_id = ? WHERE guild_id = ?`, newAdminsCsv, guildId);

const successEmbed = new EmbedBuilder()
.setTitle(`${currentLang.SUCCESS_ADMIN_REMOVED} (${mentionedUser.tag})`)
.setDescription(
`تـم ازالتـه من مشرفين النشر <:1creepout:1414567816736149617>`
)
.setColor(0xFF0000)
.setTimestamp()
.setThumbnail(mentionedUser.displayAvatarURL({ extension: 'png', size: 256 }));

return message.channel.send({ embeds: [successEmbed] });
}

if (cmd === "setchannels" || cmd === "Addch") {
    if (!(await checkAdminPermissions(message, currentLang, message.member))) return;

    const mentioned = message.mentions.channels;
    const argsIds = args.filter(a => /^\d+$/.test(a));

    let channelIds = [];
    const allowedTypes = [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread];


    for (const ch of mentioned.values()) {
        if (allowedTypes.includes(ch.type) && !channelIds.includes(ch.id)) {
            channelIds.push(ch.id);
        }
    }

    for (const id of argsIds) {
        const fetched = await message.guild.channels.fetch(id).catch(() => null);
        if (fetched && allowedTypes.includes(fetched.type) && !channelIds.includes(fetched.id)) {
            channelIds.push(fetched.id);
        }
    }

    channelIds = [...new Set(channelIds)];


    if (channelIds.length === 0) {
        return message.reply(currentLang.ERROR_MENTION_CHANNEL);
    }

    const currentConfig = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", message.guild.id);
    const existing = currentConfig?.monitored_channels ? currentConfig.monitored_channels.split(",").filter(Boolean) : [];

    const updated = [...new Set([...existing, ...channelIds])].join(",");

    await db.run("INSERT INTO config (guild_id, monitored_channels) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET monitored_channels = excluded.monitored_channels", message.guild.id, updated);

    const names = channelIds.map(id => `<#${id}>`).join(", ");
    message.reply({ embeds: [embedSimple(currentLang.SUCCESS_CHANNELS_TITLE, currentLang.SUCCESS_CHANNELS_SET.replace("{channels}", names), 0x00aa00)] });
}


if (cmd === "removechannel" || cmd === "ReCh") {
    const mentioned = message.mentions.channels;
    const argsIds = args.filter(a => /^\d+$/.test(a));

    let channelsToRemove = [];
    const allowedTypes = [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread];


    for (const ch of mentioned.values()) {
        if (allowedTypes.includes(ch.type) && !channelsToRemove.includes(ch.id)) {
            channelsToRemove.push(ch.id);
        }
    }

    for (const id of argsIds) {
        const fetched = await message.guild.channels.fetch(id).catch(() => null);
        if (fetched && allowedTypes.includes(fetched.type) && !channelsToRemove.includes(fetched.id)) {
            channelsToRemove.push(fetched.id);
        }
    }

    channelsToRemove = [...new Set(channelsToRemove)];

    if (channelsToRemove.length === 0) {
        return message.channel.send({ embeds: [embedSimple("Error", "Usage: `!removechannel #ق1 123456789 ...`", 0xcc0000)] });
    }

    const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
    let currentChannels = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

    let removedChannelsIds = [];
    const channelsToRemoveSet = new Set(channelsToRemove);

    const newChannels = currentChannels.filter(id => {
        if (channelsToRemoveSet.has(id)) {
            removedChannelsIds.push(id);
            return false;
        }
        return true;
    });

    if (removedChannelsIds.length === 0) {
        const mentionedList = channelsToRemove.map(id => `<#${id}>`).join(" , ");
        return message.channel.send({ embeds: [embedSimple("خطأ في الإزالة", `القنوات التي حددتها (${mentionedList}) لم تكن مُعيّنة للمراقبة أصلاً.`, 0xcc0000)] });
    }

    const csv = newChannels.join(",");

    await db.run(`UPDATE config SET monitored_channels = ? WHERE guild_id = ?`, csv, guildId);


    const removedChannelList = removedChannelsIds.map(id => `<#${id}>`).join(" , ");

    return message.channel.send({
        embeds: [embedSimple(
            currentLang.SUCCESS_CHANNEL_REMOVED_TITLE,
            currentLang.SUCCESS_CHANNEL_REMOVED.replace('{channels}', removedChannelList),
            0xFF0000
        )]
    });
}

if (cmd === "listchannels" || cmd === "Lch") {
    const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
    const monitoredChannelsIds = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

    let channelList = "";
    if (monitoredChannelsIds.length === 0) {
        channelList = currentLang.ERROR_NO_CHANNELS_SET;
    } else {
        channelList = monitoredChannelsIds.map((id, index) => {
            return `${index + 1} - <#${id}>`;
        }).join('\n');
    }

    const embed = new EmbedBuilder()
        .setTitle(currentLang.SUCCESS_CHANNELS_LIST_TITLE)
        .setDescription(channelList)
        .setColor(0x0077ff)
        .setTimestamp();

    return message.channel.send({ embeds: [embed] });
}


if (cmd === "listpublishers" || cmd === "LP") {
const rows = await db.all(`SELECT user_id, display_name FROM publishers WHERE guild_id = ? ORDER BY display_name ASC`, guildId);

let list = rows.map((row, index) => {
return `${index + 1} - <@${row.user_id}> (${row.display_name})`;
}).join('\n');

if (rows.length === 0) {
list = currentLang.ERROR_NO_PUBLISHERS;
}

const embed = new EmbedBuilder()
.setTitle("✥ قائمة الناشرين المسجلين")
.setDescription(list)
.setColor(0x0077ff)
.setTimestamp();

return message.channel.send({ embeds: [embed] });
}

if (cmd === "listadmins") {
const config = await db.get("SELECT admin_role_id FROM config WHERE guild_id = ?", guildId);
const adminUserIds = config?.admin_role_id ? config.admin_role_id.split(',').filter(id => id.trim() !== '') : [];

let list = adminUserIds.map((id, index) => {
const member = message.guild.members.cache.get(id);
const tag = member ? member.user.tag : `[${id}] (عضو غادر)`;
return `${index + 1} - ${tag}`;
}).join('\n');

if (adminUserIds.length === 0) {
list = "لا يوجد مشرفون معينون. فقط مستخدمو 'Manage Server' يمكنهم التحكم.";
}

const embed = new EmbedBuilder()
.setTitle(`✥ قائمة المشرفين <:2KazumaSalut:1414936888686678036>`)
.setDescription(list)
.setColor(0x00cc00)
.setTimestamp();

return message.channel.send({ embeds: [embed] });
}


if (cmd === "resetstats") {
const mentioned = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
if (!mentioned) {
    return sendUserError(message.channel, currentLang);
}

const isPublisher = await db.get("SELECT id FROM publishers WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
if (!isPublisher) {
const errorTitle = currentLang.ERROR_NO_STATS_TITLE.replace('{tag}', mentioned.tag);
const errorDesc = currentLang.ERROR_NO_STATS;

return message.channel.send({
embeds: [
new EmbedBuilder()
.setTitle(errorTitle)
.setDescription(errorDesc)
.setColor(0xcc0000)
.setTimestamp()
]
});
}


const resetMode = args[1]?.toLowerCase();
let successMessage;

if (resetMode === 'all') {
    await db.run("DELETE FROM post_history WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
    await db.run("DELETE FROM channel_points WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
    successMessage = currentLang.SUCCESS_STATS_RESET_ALL.replace('{tag}', mentioned.tag);
} else {
    const mentionedChannels = message.mentions.channels;
    const argsIds = args.slice(1).filter(a => a !== 'all' && a !== '30d' && /^\d+$/.test(a));

    let channelsToReset = [];
    const allowedTypes = [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread];


    for (const ch of mentionedChannels.values()) {
        if (allowedTypes.includes(ch.type)) {
            channelsToReset.push(ch.id);
        }
    }
    for (const id of argsIds) {
        const fetched = message.guild.channels.cache.get(id);
        if (fetched && allowedTypes.includes(fetched.type) && !channelsToReset.includes(fetched.id)) {
            channelsToReset.push(fetched.id);
        }
    }

    if (channelsToReset.length > 0) {
        const placeholders = channelsToReset.map(() => '?').join(',');

        await db.run(`UPDATE channel_points SET points = 0 WHERE guild_id = ? AND user_id = ? AND channel_id IN (${placeholders})`, guildId, mentioned.id, ...channelsToReset);

        await db.run(`DELETE FROM post_history WHERE guild_id = ? AND user_id = ? AND channel_id IN (${placeholders})`, guildId, mentioned.id, ...channelsToReset);

        const channelNames = channelsToReset.map(id => `<#${id}>`).join(', ');
        successMessage = `تم تصفير نقاط الناشر **${mentioned.tag}** في القنوات التالية: ${channelNames}.`;
    } else {
        await db.run("UPDATE channel_points SET points = 0 WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
        successMessage = currentLang.SUCCESS_STATS_RESET_USER.replace('{tag}', mentioned.tag);
    }
}

return message.channel.send({ embeds: [embedSimple("✅ إعادة تعيين النقاط", successMessage, 0x00aa00)] });
}

if (cmd === "addpublisher" || cmd === "AddP") {
const mentioned = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
if (!mentioned) {
    return sendUserError(message.channel, currentLang);
}

try {
await db.run("INSERT INTO publishers (guild_id, user_id, display_name, last_post_date) VALUES (?,?,?,?)", guildId, mentioned.id, mentioned.tag, new Date().toISOString());

const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

const successEmbed = new EmbedBuilder()
.setTitle(currentLang.SUCCESS_PUBLISHER_ADDED_TITLE)
.setDescription(currentLang.SUCCESS_PUBLISHER_ADDED_DESC.replace('{tag}', mentioned.tag))
.setColor(0x00aa00)
.setThumbnail(mentioned.displayAvatarURL({ extension: 'png', size: 256 }))
.addFields(
{ name: currentLang.SUCCESS_PUBLISHER_ADDED_FIELD_1, value: `${mentioned.tag}`, inline: true },
{ name: currentLang.SUCCESS_PUBLISHER_ADDED_FIELD_2, value: `${date}`, inline: true },
{ name: INVISIBLE_SPACE, value: INVISIBLE_SPACE, inline: true }
)
.setTimestamp();

return message.channel.send({ embeds: [successEmbed] });

} catch (e) {
if (e.code === 'SQLITE_CONSTRAINT') {
const existingStats = await db.get("SELECT SUM(cp.points) AS total_points, strftime('%Y-%m-%d', p.last_post_date) AS joinDate FROM publishers p LEFT JOIN channel_points cp ON p.user_id = cp.user_id AND p.guild_id = cp.guild_id WHERE p.guild_id = ? AND p.user_id = ?", guildId, mentioned.id);
const joinDate = existingStats?.joinDate || 'N/A';
const totalPoints = existingStats?.total_points || 0;

const errorEmbed = new EmbedBuilder()
.setTitle(currentLang.ERROR_PUBLISHER_EXISTS.replace('{tag}', mentioned.username))
.setDescription(`يا سبك تـم تعييـن هذا الناشر بالفعل <:2stop:1414593470081007698>`)
.setColor(0xcc0000)
.addFields(
{ name: "✶ تاريخ التعيين:", value: joinDate, inline: true },
{ name: "✶ مجموع النقاط:", value: totalPoints.toString(), inline: true }
)
.setTimestamp()
.setThumbnail(mentioned.displayAvatarURL({ extension: 'png', size: 256 }));

return message.channel.send({ embeds: [errorEmbed] });
}
console.error("خطأ في إضافة ناشر:", e);
return message.channel.send({ embeds: [embedSimple(currentLang.ERROR_SQL, currentLang.ERROR_SQL, 0xcc0000)] });
}
}

if (cmd === "removepublisher" || cmd === "ReP") {
const mentioned = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
if (!mentioned) {
    return sendUserError(message.channel, currentLang);
}

const stats = await db.get("SELECT SUM(points) AS total_points FROM channel_points WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
const totalPoints = stats?.total_points || 0;

const resultPub = await db.run("DELETE FROM publishers WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
await db.run("DELETE FROM channel_points WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);
await db.run("DELETE FROM post_history WHERE guild_id = ? AND user_id = ?", guildId, mentioned.id);


if (resultPub.changes === 0) {
const errorTitle = currentLang.ERROR_PUBLISHER_NOT_FOUND_TITLE.replace('{tag}', mentioned.tag);
const errorDesc = currentLang.ERROR_PUBLISHER_NOT_FOUND;

return message.channel.send({
embeds: [embedSimple(errorTitle, errorDesc, 0xcc0000)]
});
}

const removeEmbed = new EmbedBuilder()
.setTitle(currentLang.SUCCESS_PUBLISHER_REMOVED)
.setDescription("تمت ازالته وحذف سجلات النقاط بنـجاح")
.setColor(0xFF0000)
.setThumbnail(mentioned.displayAvatarURL({ extension: 'png', size: 256 }))
.setTimestamp()
.addFields(
{ name: "✶الـنـاشـر", value: `${mentioned}`, inline: true },
{ name: "✶النقاط", value: `**${totalPoints}**`, inline: true },
{ name: INVISIBLE_SPACE, value: INVISIBLE_SPACE, inline: true }
)
.setTimestamp();

return message.channel.send({ embeds: [removeEmbed] });
}

if (cmd === "channelstats" || cmd === "cstats") {
    let targetChannel = message.mentions.channels.first();
    const channelInput = args[0];

    if (!targetChannel && channelInput) {
        const mentionMatch = channelInput.match(/^<#(\d+)>$/);
        if (mentionMatch) {
            targetChannel = message.guild.channels.cache.get(mentionMatch[1]);
        } else if (/^\d+$/.test(channelInput)) {
            targetChannel = message.guild.channels.cache.get(channelInput);
        }
    }

    let filterKey = 'all';
    let filterDays = 0;
    const filterArg = targetChannel ? args[1] : args[0];

    if (filterArg && filterArg.toLowerCase() !== 'all') {
        const daysMatch = filterArg.toLowerCase().match(/^(\d+)d$/);
        if (daysMatch) {
            filterDays = parseInt(daysMatch[1]);
            filterKey = daysMatch[1] + 'd';
        } else if (filterArg.toLowerCase() === '7d') {
            filterDays = 7; filterKey = '7d';
        } else if (filterArg.toLowerCase() === '30d') {
            filterDays = 30; filterKey = '30d';
        } else if (filterArg.toLowerCase() === '1d') {
            filterDays = 1; filterKey = '1d';
        }
    }

    const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
    const monitoredChannelsIds = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

    if (monitoredChannelsIds.length === 0) {
        return message.reply({ embeds: [embedSimple(currentLang.ERROR_NO_CHANNELS_SET, currentLang.ERROR_NO_CHANNELS_SET, 0xcc0000)] });
    }

    const channelsToQuery = targetChannel ? [targetChannel.id] : monitoredChannelsIds;

    const { embed, components } = await createChannelStatsEmbed(message.guild, channelsToQuery, filterDays, currentLang, filterKey);
    return message.channel.send({ embeds: [embed], components: components });
}

if (cmd === "stats" || cmd === "Top") {
    let targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    let targetChannel = message.mentions.channels.first();

    if (!targetChannel) {
        const inputIndex = targetUser && targetUser.id === args[0] ? 1 : (targetUser ? 1 : 0);
        const channelInput = args[inputIndex];

        if (channelInput) {
            const mentionMatch = channelInput.match(/^<#(\d+)>$/);
            if (mentionMatch) {
                targetChannel = message.guild.channels.cache.get(mentionMatch[1]);
            } else if (/^\d+$/.test(channelInput)) {
                targetChannel = message.guild.channels.cache.get(channelInput);
            }
        }
    }


    if (!targetUser || cmd === "Top" || (cmd === "stats" && !targetUser && !targetChannel)) {
        const pageSize = 5;
        const rows = await db.all(`SELECT p.user_id, SUM(cp.points) AS total_points FROM publishers p LEFT JOIN channel_points cp ON p.user_id = cp.user_id AND p.guild_id = cp.guild_id WHERE p.guild_id = ? GROUP BY p.user_id ORDER BY total_points DESC`, guildId);
        const { embed, components } = await createStatsEmbedPage(message.guild, rows, 0, pageSize, currentLang);
        return message.channel.send({ embeds: [embed], components: components });
    }

    const isPublisher = await db.get("SELECT id FROM publishers WHERE guild_id = ? AND user_id = ?", guildId, targetUser.id);

    if (!isPublisher && targetUser.id !== message.author.id) {
    const targetMember = message.guild.members.cache.get(targetUser.id) || await message.guild.members.fetch(targetUser.id).catch(() => null);
    const nickname = targetMember ? targetMember.displayName : targetUser.username;
    const errorTitle = `✶ هـمم ... (${nickname})`;
    const errorDesc = `✶ المستخدم الي حددته مو معين كـ ناشر  <a:6bonk:1401906810973327430>`;

    return message.channel.send({
    embeds: [
    new EmbedBuilder()
    .setTitle(errorTitle)
    .setDescription(errorDesc)
    .setColor(0xcc0000)
    .setTimestamp()
    ]
    });
    }


    const { pointsData, dateData, monitoredChannels } = await getDetailedStatsData(targetUser.id, guildId, 0);

    if (targetChannel) {
        const channelIdToQuery = targetChannel.id;
        const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
        const monitored = config?.monitored_channels ? config.monitored_channels.split(",").filter(Boolean) : [];

        if (!monitored.includes(channelIdToQuery)) {
            const errorData = currentLang.ERROR_CHANNEL_NOT_MONITORED;
            return message.reply({
                embeds: [embedSimple(errorData.title, errorData.description, 0xcc0000)]
            });
        }

        const targetMember = message.guild.members.cache.get(targetUser.id) || await message.guild.members.fetch(targetUser.id).catch(() => null);
        const nickname = targetMember ? targetMember.displayName : targetUser.username;

        const channelStats = await db.get("SELECT points FROM channel_points WHERE guild_id = ? AND user_id = ? AND channel_id = ?", guildId, targetUser.id, channelIdToQuery);
        const pointsInChannel = channelStats?.points || 0;
        const overallPoints = pointsData.allTotalPoints;

        const channelEmbed = embedSimple(
        currentLang.STATS_USER_CHANNEL_TITLE.replace('{nickname}', nickname),
        INVISIBLE_SPACE,
        0xFFFFFF
        ).setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
        { name: currentLang.STATS_CHANNEL_NAME_FIELD, value: `#${cleanChannelName(targetChannel.name)}`, inline: false },
        { name: currentLang.STATS_CHANNEL_POINTS, value: `**${pointsInChannel}**`, inline: true },
        { name: currentLang.STATS_CHANNEL_TOTAL, value: `**${overallPoints}**`, inline: true },
        );

        return message.channel.send({ embeds: [channelEmbed] });
    }

    const { embed, components } = await createDetailedStatsEmbed(targetUser, message.guild, currentLang, 0, pointsData, dateData, monitoredChannels, 0);
    return message.channel.send({ embeds: [embed], components: components });
}
}

try {
if (!db) return;
const config = await db.get("SELECT monitored_channels FROM config WHERE guild_id = ?", guildId);
if (!config) return;

let channelToMonitorId = message.channel.id;
const monitoredChannels = (config?.monitored_channels || "").split(",");

if (message.channel.isThread() && !monitoredChannels.includes(channelToMonitorId)) {
  if (monitoredChannels.includes(message.channel.parentId)) {
    channelToMonitorId = message.channel.parentId;
  } else {
    if (!message.content.startsWith(currentPrefix)) {
        return;
    }
  }
}
if (!message.content.startsWith(currentPrefix) && !monitoredChannels.includes(channelToMonitorId)) return;

try {
const isPublisher = await db.get(
"SELECT id FROM publishers WHERE guild_id = ? AND user_id = ?",
guildId,
message.author.id
);
if (!isPublisher) return;

const نقاط = extractLinksCount(message);
if (نقاط > 0) {
const userId = message.author.id;
const channelId = channelToMonitorId;

await db.run(
`INSERT INTO channel_points (guild_id, user_id, channel_id, points, last_post_date)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(user_id, channel_id) DO UPDATE
SET points = points + excluded.points, last_post_date = excluded.last_post_date`,
guildId, userId, channelId, نقاط, new Date().toISOString()
);

await db.run(
`UPDATE publishers SET last_post_date = ? WHERE guild_id = ? AND user_id = ?`,
new Date().toISOString(), guildId, userId
);

await db.run(
`INSERT INTO post_history (guild_id, user_id, channel_id, points_gained, post_date)
VALUES (?, ?, ?, ?, ?)`,
guildId, userId, channelId, نقاط, new Date().toISOString()
);
console.log(
currentLang.LOG_POINTS_INCREASED
.replace('{points}', نقاط)
.replace('{tag}', message.author.tag)
);
}
} catch (e) {
console.error("خطأ في معالجة رسالة النشر:", e);
}
} catch (e) {
console.error("خطأ في منطق تسجيل الرسائل:", e);
}
});

client.login(TOKEN);