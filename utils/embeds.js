import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;
async function getDb() {
    if (!db) {
        db = await open({
            filename: "./publisher_stats2.db",
            driver: sqlite3.Database
        });
    }
    return db;
}


const INVISIBLE_SPACE = '\u200b';
const CHANNEL_PAGE_SIZE = 8;

export function embedSimple(title, description, color = 0xcc0000) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

export function cleanChannelName(name) {
    if (!name) return 'N/A';
    let cleaned = name.replace(/[^\p{L}\p{N}\s・\p{Emoji}〢]/gu, ' ');
    cleaned = cleaned.replace(/(\p{Emoji})/gu, '$1 ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

async function getChannelStatsData(guildId, channelIds, days) {
    const database = await getDb();
    let query;
    let params = [guildId];

    if (days === 0) {
        let placeholders = channelIds.map(() => '?').join(',');
        query = `SELECT channel_id, SUM(points) AS total_points FROM channel_points WHERE guild_id = ? AND channel_id IN (${placeholders}) GROUP BY channel_id`;
        params.push(...channelIds);
    } else {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const isoDate = date.toISOString();

        let placeholders = channelIds.map(() => '?').join(',');
        query = `SELECT channel_id, SUM(points_gained) AS total_points FROM post_history WHERE guild_id = ? AND post_date >= ? AND channel_id IN (${placeholders}) GROUP BY channel_id`;
        params.push(isoDate, ...channelIds);
    }

    const rows = await database.all(query, params);
    return rows;
}


export async function createChannelStatsEmbed(guild, monitoredChannelIds, filterDays, currentLang, filterKey, currentPage = 0) {

    const statsRows = await getChannelStatsData(guild.id, monitoredChannelIds, filterDays);

    const channelStatsMap = new Map(statsRows.map(row => [row.channel_id, row.total_points]));

    let displayStats = monitoredChannelIds.map(id => ({
        id: id,
        points: channelStatsMap.get(id) || 0
    })).sort((a, b) => b.points - a.points);

    const totalPoints = displayStats.reduce((sum, stat) => sum + stat.points, 0);

    const totalElements = displayStats.length;
    const pageSize = 10;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;

    currentPage = Math.min(currentPage, totalPages > 0 ? totalPages - 1 : 0);

    const start = currentPage * pageSize;
    const end = start + pageSize;
    const elementsToDisplay = displayStats.slice(start, end);

    let description = `**مجموع النقاط الكلي في هذه الفترة:** **${totalPoints}**\n\n`;

    const embedFields = [];

    elementsToDisplay.forEach((stat) => {
        const channel = guild.channels.cache.get(stat.id);
        const channelName = channel ? `#${cleanChannelName(channel.name)}` : `[قناة محذوفة ID: ${stat.id}]`;

        embedFields.push({
            name: `✶ ${channelName}`,
            value: `**${stat.points}**`,
            inline: true
        });
    });

    const remainder = embedFields.length % 3;
    if (remainder !== 0) {
        for (let i = 0; i < 3 - remainder; i++) {
            embedFields.push({ name: INVISIBLE_SPACE, value: INVISIBLE_SPACE, inline: true });
        }
    }

    const filterLabel = filterKey === 'all' ? '' : `(${filterKey.toUpperCase()})`; 
    const title = `✥ إحصائيات القنوات ${filterLabel}`.trim();


    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x0077ff)
        .setTimestamp()
        .addFields(embedFields)
        .setFooter({ text: `صفحة ${currentPage + 1}/${totalPages}` });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`cstats_filter:1d:${currentPage}`)
                .setLabel('24H')
                .setStyle(filterKey === '1d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cstats_filter:7d:${currentPage}`)
                .setLabel('7D')
                .setStyle(filterKey === '7d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cstats_filter:30d:${currentPage}`)
                .setLabel('30D')
                .setStyle(filterKey === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cstats_filter:all:${currentPage}`)
                .setLabel('ALL')
                .setStyle(filterKey === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

    const navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`cstats_page_prev:${filterKey}:${currentPage}`)
                .setLabel(currentLang.BUTTON_PREV || '⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId(`cstats_page_next:${filterKey}:${currentPage}`)
                .setLabel(currentLang.BUTTON_NEXT || '➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
        );

    return { embed, components: [row, navRow] };
}


export async function createStatsEmbedPage(guild, rows, page, pageSize, currentLang) {
    const totalRealItems = rows.length;

    const totalDisplayItems = totalRealItems;
    const totalPages = Math.ceil(totalDisplayItems / pageSize) || 1;
    const start = page * pageSize;
    const end = start + pageSize;

    let description = '';

    for(let i = start; i < end; i++) {
        if (i >= totalRealItems) break;

        const rank = i + 1;
        let rankDisplay;
        if (rank === 1) rankDisplay = '🥇';
        else if (rank === 2) rankDisplay = '🥈';
        else if (rank === 3) rankDisplay = '🥉';
        else rankDisplay = `${rank} -`;

        const userId = rows[i].user_id;
        const totalPoints = rows[i].total_points || 0;
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);

        const userMention = member ? `<@${userId}>` : `[عضو غادر / غير موجود]`;

        description += `${rankDisplay} ${userMention}\n \`# ( ${totalPoints} )\``;

        description += '\n';
    }

    if (description.trim() === '') {
        description = currentLang.ERROR_NO_PUBLISHERS || 'No publishers registered.';
    }

    const safeTitle = currentLang.STATS_TOP_TITLE || "Top Publishers List";
    const safeDescription = description || 'Could not load stats description.';

    const pageText = currentLang.BUTTON_PAGE || 'Page {current}/{total}';

    const embed = new EmbedBuilder()
        .setTitle(safeTitle)
        .setDescription(safeDescription)
        .setTimestamp()
        .setColor(0x990000)
        .setImage('https://d.uguu.se/QSSebnMB.jpg')
        .setFooter({ text: pageText.replace('{current}', page + 1).replace('{total}', totalPages) });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`top_prev:${page - 1}:${pageSize}`)
                .setLabel(currentLang.BUTTON_PREV || '⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0 || totalPages <= 1),
            new ButtonBuilder()
                .setCustomId('stats_page_indicator')
                .setLabel(pageText.replace('{current}', page + 1).replace('{total}', totalPages))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`top_next:${page + 1}:${pageSize}`)
                .setLabel(currentLang.BUTTON_NEXT || '➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages - 1 || totalPages <= 1)
        );

    return { embed, components: [row] };
}

/**
 * دالة بناء الإحصائيات التفصيلية (!stats @user)
 */
export async function createDetailedStatsEmbed(targetUser, guild, currentLang, filterDays, pointsData, dateData, monitoredChannels, channelPage = 0) {
    const targetMember = guild.members.cache.get(targetUser.id) || await guild.members.fetch(targetUser.id).catch(() => null);
    const nickname = targetMember ? targetMember.displayName : targetUser.username;
    const uid = targetUser.id;

    let currentPage = channelPage;

    let pointsToDisplay = pointsData.currentPoints;
    let totalPoints = pointsData.currentTotalPoints;

    const isFallback = (filterDays !== 0 && pointsData.currentTotalPoints === 0 && pointsData.allTotalPoints > 0);

    if (filterDays !== 0) {
        if (isFallback) {
            pointsToDisplay = pointsData.allPoints;
            totalPoints = pointsData.allTotalPoints;
        }
    } else {
        pointsToDisplay = pointsData.allPoints;
        totalPoints = pointsData.allTotalPoints;
    }

    const pointsMap = new Map(pointsToDisplay.map(row => [row.channel_id, row.points]));

    const finalChannelStats = monitoredChannels.map(channelId => {
        return {
            id: channelId,
            points: pointsMap.get(channelId) || 0
        };
    }).filter(stat => stat.id).sort((a, b) => b.points - a.points);

    const combinedStats = [{
        id: 'total',
        points: totalPoints,
        name: currentLang.STATS_TOTAL_FIELD_NAME
    }, ...finalChannelStats];

    const totalElements = combinedStats.length;
    const totalPages = Math.ceil(totalElements / CHANNEL_PAGE_SIZE) || 1;

    currentPage = Math.min(currentPage, totalPages > 0 ? totalPages - 1 : 0);

    const start = currentPage * CHANNEL_PAGE_SIZE;
    const end = start + CHANNEL_PAGE_SIZE;
    const elementsToDisplay = combinedStats.slice(start, end);


    const newEmbed = new EmbedBuilder()
        .setTitle(currentLang.STATS_USER_TITLE.replace('{nickname}', nickname))
        .setColor(0xFFFFFF)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage('https://i.postimg.cc/vZSPbZkT/pr1q3F6.webp')
        .setDescription(INVISIBLE_SPACE);

    const statFields = [];

    elementsToDisplay.forEach(stat => {
        const fieldName = stat.id === 'total' ? `**${stat.name}**` : `✶ #${cleanChannelName(guild.channels.cache.get(stat.id)?.name || `[ID: ${stat.id}]`)}`;

        const fieldValue = `**${stat.points}**`;

        statFields.push({
            name: fieldName,
            value: fieldValue.trim(),
            inline: true,
        });
    });

    const remainder = statFields.length % 3;
    if (remainder !== 0) {
        const fieldsToAdd = 3 - remainder;
        for (let i = 0; i < fieldsToAdd; i++) {
            statFields.push({ name: INVISIBLE_SPACE, value: INVISIBLE_SPACE, inline: true });
        }
    }

    newEmbed.addFields(statFields);

    let lastPostText;
    if (dateData.lastPostDateFormatted === 'Non') {
        lastPostText = currentLang.NON_ACTIVITY_FORMAT || 'Last post: Non';
    } else {
        lastPostText = (currentLang.LAST_POST_DATE_FORMAT || 'Last post: {formattedDate}').replace('{formattedDate}', dateData.lastPostDateFormatted);
    }

    const joinDateText = (currentLang.JOIN_DATE_FORMAT || 'Join: {joinDate}').replace('{joinDate}', dateData.joinDateFormatted);
    let newFooterText = `${lastPostText} ${currentLang.FOOTER_SEPARATOR || ' | '} ${joinDateText}`;

    const pageTextFooter = currentLang.BUTTON_PAGE || 'Page {current}/{total}';
    if (totalPages > 1) {
        newFooterText += ` ${currentLang.FOOTER_SEPARATOR || ' | '} ${pageTextFooter.replace('{current}', currentPage + 1).replace('{total}', totalPages)}`;
    }

    const currentFilterKey = filterDays === 0 ? 'all' : `${filterDays}d`;
    const currentFilterLabel = filterDays === 0 ? 'ALL' : `${filterDays}D`;

    const combinedRow = new ActionRowBuilder();

    if (totalPages > 1) {
        combinedRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`stats_page_prev:${uid}:${currentFilterKey}:${currentPage}`)
                .setLabel(currentLang.BUTTON_PREV || '⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0)
        );
    }

    combinedRow.addComponents(
        new ButtonBuilder().setCustomId(`stats_filter_30d:${uid}:${currentPage}`).setLabel('30D').setStyle(currentFilterLabel === '30D' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stats_filter_all:${uid}:${currentPage}`).setLabel('ALL').setStyle(currentFilterLabel === 'ALL' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );

    if (totalPages > 1) {
        combinedRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`stats_page_next:${uid}:${currentFilterKey}:${currentPage}`)
                .setLabel(currentLang.BUTTON_NEXT || '➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
        );
    }

    const components = [combinedRow];

    newEmbed.setFooter({
        text: newFooterText,
        iconURL: targetUser.displayAvatarURL({ extension: 'png', size: 64 })
    });

    return { embed: newEmbed, components: components };
}