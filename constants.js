// constants.js
import dotenv from "dotenv";
dotenv.config();

// ✅ استخدم التوكن من السيكرت
export const TOKEN = process.env.TOKEN;

export const INVISIBLE_SPACE = "\u200B";

const HELP_FIELDS_AR = {
    MAIN: [
        { name: "أوامر الإعدادات الأساسية", value: "`!setprefix <رمز>`\n`!lang <ar|en>`", inline: false },
        { name: "أوامر الإدارة", value: "`!AddAdmin @User`\n`!ReAdmin @User`\n`!ListAdmins`", inline: false },
        { name: "أوامر القنوات", value: "`!Addch #ق1 #ق2`\n`!ReCh #ق1`\n`!Lch`", inline: false },
    ],
};

const HELP_FIELDS_EN = {
    MAIN: [
        { name: "Basic Setup Commands", value: "`!setprefix <symbol>`\n`!lang <ar|en>`", inline: false },
        { name: "Admin Commands", value: "`!AddAdmin @User`\n`!ReAdmin @User`\n`!ListAdmins`", inline: false },
        { name: "Channel Commands", value: "`!Addch #c1 #c2`\n`!ReCh #c1`\n`!Lch`", inline: false },
    ],
};

export const LANG = {
    ar: {
        CODE: 'ar',
        HELP_TITLE: "✶ قـائمة الأوامر الأساسية",
        HELP_DESC: "هنا تجد الأوامر الأساسية للبوت.\n استخدم الأزرار للتنقل بين الفئات.",
        HELP_FIELDS: HELP_FIELDS_AR,
        SUCCESS_PREFIX_SET: "✅ تـم تحديد البادئة الجديدة: {newPrefix}",
        SUCCESS_LANG_SET: "✅ تـم تغيير اللغة إلى العربية.",
        ERROR_MENTION_USER: "✶ حـدد مستخدم على الاقل !!",
        ERROR_NO_PUBLISHERS: "لا يوجد ناشرون مسجلون حتى الآن.",
        SUCCESS_ADMIN_USER_SET: "✅ تـم تعييـن المشرف بنجاح",
        SUCCESS_ADMIN_REMOVED: "✅ تـم ازالة المشرف",
        ERROR_ADMIN_NOT_LISTED: "المستخدم {userName} ليس من المشرفين المعينين.",
        SUCCESS_CHANNELS_TITLE: "✅ تـم تعييـن القنوات للمراقبة",
        SUCCESS_CHANNELS_SET: "تـم إضافة القنوات: {channels}",
        SUCCESS_CHANNEL_REMOVED_TITLE: "❌ تـم إزالة القنوات من المراقبة",
        SUCCESS_CHANNEL_REMOVED: "تـم إزالة القنوات: {channels}",
        ERROR_NO_CHANNELS_SET: "لا توجد قنوات مُعيّنة للمراقبة.",
        SUCCESS_STATS_RESET_ALL: "تـم تصفير سجل النقاط بالكامل للمستخدم {tag}.",
        SUCCESS_STATS_RESET_USER: "تـم تصفير النقاط الحالية للمستخدم {tag}.",
        ERROR_NO_STATS_TITLE: "✶ هـمم ... ({tag})",
        ERROR_NO_STATS: "✶ المستخدم الي حددته مو معين كـ ناشر",
        SUCCESS_PUBLISHER_ADDED_TITLE: "✅ تـم تعييـن ناشر جديـد",
        SUCCESS_PUBLISHER_ADDED_FIELD_1: "✶ الـنـاشـر",
        SUCCESS_PUBLISHER_ADDED_FIELD_2: "✶ تاريخ التعيين",
        ERROR_PUBLISHER_EXISTS: "✶ الناشر موجود بالفعل ({tag})",
        ERROR_PUBLISHER_NOT_FOUND_TITLE: "❌ الناشر غير موجود ({tag})",
        ERROR_PUBLISHER_NOT_FOUND: "المستخدم المحدد ليس ناشراً.",
        LOG_POINTS_INCREASED: "تمت زيادة نقاط {tag} بـ {points} نقطة.",
    },
    en: {
        CODE: 'en',
        HELP_TITLE: "✶ Basic Command List",
        HELP_DESC: "Find the bot's basic commands here.\nUse the buttons to navigate categories.",
        HELP_FIELDS: HELP_FIELDS_EN,
        SUCCESS_PREFIX_SET: "✅ Prefix set to: {newPrefix}",
        SUCCESS_LANG_SET: "✅ Language changed to English.",
        ERROR_MENTION_USER: "✶ You must mention at least one user !!",
        ERROR_NO_PUBLISHERS: "No publishers registered yet.",
        SUCCESS_ADMIN_USER_SET: "✅ Admin assigned successfully",
        SUCCESS_ADMIN_REMOVED: "✅ Admin removed successfully",
        ERROR_ADMIN_NOT_LISTED: "User {userName} is not a designated admin.",
        SUCCESS_CHANNELS_TITLE: "✅ Channels designated for monitoring",
        SUCCESS_CHANNELS_SET: "Channels added: {channels}",
        SUCCESS_CHANNEL_REMOVED_TITLE: "❌ Channels removed from monitoring",
        SUCCESS_CHANNEL_REMOVED: "Channels removed: {channels}",
        ERROR_NO_CHANNELS_SET: "No channels are currently set for monitoring.",
        SUCCESS_STATS_RESET_ALL: "All post history and channel points for {tag} have been reset.",
        SUCCESS_STATS_RESET_USER: "Current channel points for {tag} have been set to zero.",
        ERROR_NO_STATS_TITLE: "✶ Hmm... ({tag})",
        ERROR_NO_STATS: "✶ The mentioned user is not a designated publisher",
        SUCCESS_PUBLISHER_ADDED_TITLE: "✅ New Publisher Assigned",
        SUCCESS_PUBLISHER_ADDED_FIELD_1: "✶ Publisher",
        SUCCESS_PUBLISHER_ADDED_FIELD_2: "✶ Assignment Date",
        ERROR_PUBLISHER_EXISTS: "✶ Publisher already exists ({tag})",
        ERROR_PUBLISHER_NOT_FOUND_TITLE: "❌ Publisher Not Found ({tag})",
        ERROR_PUBLISHER_NOT_FOUND: "The specified user is not a publisher.",
        LOG_POINTS_INCREASED: "{points} points added to {tag}.",
    }
};