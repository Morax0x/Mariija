import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { DEFAULT_EMBED_COLOR } from "../index.js";

const INVISIBLE_SPACE = '\u200b';
const CHANNEL_PAGE_SIZE = 9;
const NEW_TOP_LIST_IMAGE = 'https://media.discordapp.net/attachments/1394280285289320550/1432411843086778369/12.jpg?ex=6900f4fc&is=68ffa37c&hm=9277ed32a483ec839dd15bf4eaf5e0f864fae3567621fb25cb8e292d3dc9d429&=&format=webp&width=1872&height=309';

export function embedSimple(title, description, color) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || INVISIBLE_SPACE) // ضمان عدم وجود وصف فارغ
        .setColor(color ?? DEFAULT_EMBED_COLOR)
        .setTimestamp();
}

export function cleanChannelName(name) {
    if (!name) return 'N/A';
    let cleaned = name.replace(/[^\p{L}\p{N}\s\-_\.\p{Emoji}#]/gu, ' ').trim();
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned || 'Unnamed';
}

async function getChannelStatsData(db, guildId, channelIds, days) {
    if (!db) return []; let query; let params = [guildId];
    let placeholders = channelIds.map(() => '?').join(',');
    if (!placeholders) return [];
    if (days === 0) { query = `SELECT channel_id, SUM(points) AS total_points FROM channel_points WHERE guild_id = ? AND channel_id IN (${placeholders}) GROUP BY channel_id`; params.push(...channelIds); }
    else { const date = new Date(); date.setDate(date.getDate() - days); const isoDate = date.toISOString(); query = `SELECT channel_id, SUM(points_gained) AS total_points FROM post_history WHERE guild_id = ? AND post_date >= ? AND channel_id IN (${placeholders}) GROUP BY channel_id`; params.push(isoDate, ...channelIds); }
    try { const rows = await db.all(query, params); return rows; } catch (e) { console.error("Error fetching channel stats data:", e); return []; }
}

export async function createChannelStatsEmbed(guild, monitoredItemIds, filterDays, currentLang, filterKey, currentPage = 0, db) {
    const statsRows = await getChannelStatsData(db, guild.id, monitoredItemIds, filterDays);
    const itemStatsMap = new Map(statsRows.map(row => [row.channel_id, row.total_points]));
    let displayStats = monitoredItemIds.map(id => ({ id: id, points: itemStatsMap.get(id) || 0 })) .sort((a, b) => b.points - a.points);
    const totalPoints = displayStats.reduce((sum, stat) => sum + stat.points, 0);
    const totalElements = displayStats.length; const pageSize = 10; const totalPages = Math.ceil(totalElements / pageSize) || 1; currentPage = Math.max(0, Math.min(currentPage, totalPages > 0 ? totalPages - 1 : 0)); const start = currentPage * pageSize; const end = start + pageSize; const elementsToDisplay = displayStats.slice(start, end);
    let description = `**مجموع النقاط الكلي في هذه الفترة:** **${totalPoints}**\n\n`; const embedFields = [];
    for (const stat of elementsToDisplay) { const item = await guild.channels.fetch(stat.id).catch(() => null); const prefix = item?.isThread() ? '💬 ' : '#'; const itemName = item ? cleanChannelName(item.name) : `[عنصر محذوف ID: ${stat.id}]`; embedFields.push({ name: `✶ ${prefix}${itemName}`, value: `**${stat.points}**`, inline: true }); }
    const remainder = embedFields.length % 3; if (remainder !== 0) { for (let i = 0; i < 3 - remainder; i++) { embedFields.push({ name: INVISIBLE_SPACE, value: INVISIBLE_SPACE, inline: true }); } }
    const filterLabel = filterKey === 'all' ? '' : `(${filterKey.toUpperCase()})`; const title = `✥ إحصائيات القنوات ${filterLabel}`.trim(); const embed = new EmbedBuilder().setTitle(title).setDescription(description || INVISIBLE_SPACE).setColor(0x0077ff).setTimestamp().addFields(embedFields).setFooter({ text: `${currentPage + 1}/${totalPages}` });
    const filterButtons = new ActionRowBuilder().addComponents( new ButtonBuilder().setCustomId(`cstats_filter:1d:${currentPage}`).setLabel('24H').setStyle(filterKey === '1d' ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`cstats_filter:7d:${currentPage}`).setLabel('7D').setStyle(filterKey === '7d' ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`cstats_filter:30d:${currentPage}`).setLabel('30D').setStyle(filterKey === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`cstats_filter:all:${currentPage}`).setLabel('ALL').setStyle(filterKey === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary) );
    const navButtons = new ActionRowBuilder().addComponents( new ButtonBuilder().setCustomId(`cstats_page_prev:${filterKey}:${currentPage}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0 || totalPages <= 1), new ButtonBuilder().setCustomId('cstats_page_indicator').setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true), new ButtonBuilder().setCustomId(`cstats_page_next:${filterKey}:${currentPage}`).setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= totalPages - 1 || totalPages <= 1) );
    return { embed, components: totalPages > 1 ? [filterButtons, navButtons] : [filterButtons] };
}

export async function createStatsEmbedPage(guild, rows, page, pageSize, currentLang, custom) {
    const totalRealItems = rows.length; const totalDisplayItems = totalRealItems; const totalPages = Math.ceil(totalDisplayItems / pageSize) || 1; page = Math.max(0, Math.min(page, totalPages > 0 ? totalPages - 1 : 0)); const start = page * pageSize; const end = start + pageSize; let description = ''; for (let i = start; i < end; i++) { if (i >= totalRealItems) break; const rank = i + 1; let rankDisplay; if (rank === 1) rankDisplay = '🥇'; else if (rank === 2) rankDisplay = '🥈'; else if (rank === 3) rankDisplay = '🥉'; else rankDisplay = `${rank} -`; const userId = rows[i].user_id; const totalPoints = rows[i].total_points || 0; const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null); const userMention = member ? `<@${userId}>` : `[عضو غادر / غير موجود]`; description += `${rankDisplay} ${userMention}\n \`# ( ${totalPoints} )\``; description += '\n'; } if (!description || description.trim() === '') description = currentLang.ERROR_NO_PUBLISHERS || 'No publishers registered.'; if (!description || description.trim() === '') description = INVISIBLE_SPACE;
    const safeTitle = currentLang.STATS_TOP_TITLE || "Top Publishers List";
    const embed = new EmbedBuilder() .setTitle(safeTitle) .setDescription(description) .setTimestamp() .setColor(custom?.embed_color || 0x990000) .setImage(custom?.embed_image || NEW_TOP_LIST_IMAGE) .setFooter({ text: `${page + 1}/${totalPages}` });
    const components = []; if (totalPages > 1) { const row = new ActionRowBuilder().addComponents( new ButtonBuilder().setCustomId(`top_prev:${page - 1}:${pageSize}`).setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page === 0), new ButtonBuilder().setCustomId('top_page_indicator').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true), new ButtonBuilder().setCustomId(`top_next:${page + 1}:${pageSize}`).setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1) ); components.push(row); } return { embed, components };
}

export async function createDetailedStatsEmbed(targetUser, guild, currentLang, filterDays, pointsData, dateData, monitoredChannels, channelPage = 0) {
    const targetMember = guild.members.cache.get(targetUser.id) || await guild.members.fetch(targetUser.id).catch(() => null); const nickname = targetMember ? targetMember.displayName : targetUser.username; const uid = targetUser.id; let currentPage = channelPage; let pointsToDisplay = pointsData.currentPoints; let totalPoints = pointsData.currentTotalPoints;
    const pointsMap = new Map(pointsToDisplay.map(row => [row.channel_id, row.points]));
    const finalItemStats = monitoredChannels .map(itemId => ({ id: itemId, points: pointsMap.get(itemId) || 0 })) .filter(stat => stat.id) .sort((a, b) => b.points - a.points);
    const combinedStats = [{ id: 'total', points: totalPoints, name: currentLang.STATS_TOTAL_FIELD_NAME }, ...finalItemStats]; const totalElements = combinedStats.length; const totalPages = Math.ceil(totalElements / CHANNEL_PAGE_SIZE) || 1; currentPage = Math.max(0, Math.min(currentPage, totalPages > 0 ? totalPages - 1 : 0)); const start = currentPage * CHANNEL_PAGE_SIZE; const end = start + CHANNEL_PAGE_SIZE; const elementsToDisplay = combinedStats.slice(start, end);
    const newEmbed = new EmbedBuilder().setTitle(currentLang.STATS_USER_TITLE.replace('{nickname}', nickname)).setColor(DEFAULT_EMBED_COLOR).setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 })).setImage('https://i.postimg.cc/vZSPbZkT/pr1q3F6.webp').setDescription(INVISIBLE_SPACE); const statFields = [];
    for (const stat of elementsToDisplay) { let fieldName = `**${stat.name}**`; let prefix = '📊 '; if (stat.id !== 'total') { const item = await guild.channels.fetch(stat.id).catch(() => null); const itemName = item ? cleanChannelName(item.name) : `[عنصر محذوف ID: ${stat.id}]`; if (item) { if (item.isThread()) prefix = '💬 '; else prefix = '#'; } else { prefix = '❓ '; } fieldName = `${prefix}${itemName}`; } const fieldValue = `**${stat.points}**`; statFields.push({ name: fieldName, value: fieldValue.trim(), inline: true }); }
    const remainder = statFields.length % 3; if (remainder !== 0) { const fieldsToAdd = 3 - remainder; for (let i = 0; i < fieldsToAdd; i++) { statFields.push({ name: INVISIBLE_SPACE, value: INVISIBLE_SPACE, inline: true }); } } newEmbed.addFields(statFields);
    let lastPostText; if (dateData.lastPostDateFormatted === 'لا يوجد') { lastPostText = currentLang.NON_ACTIVITY_FORMAT || 'Last post: لا يوجد'; } else { lastPostText = (currentLang.LAST_POST_DATE_FORMAT || 'Last post: {formattedDate}').replace('{formattedDate}', dateData.lastPostDateFormatted); } const joinDateText = (currentLang.JOIN_DATE_FORMAT || 'Join: {joinDate}').replace('{joinDate}', dateData.joinDateFormatted); let newFooterText = `${lastPostText}${currentLang.FOOTER_SEPARATOR || ' | '}${joinDateText}`; if (totalPages > 1) { newFooterText += `${currentLang.FOOTER_SEPARATOR || ' | '}${currentLang.BUTTON_PAGE.replace('{current}', currentPage + 1).replace('{total}', totalPages)}`; } newEmbed.setFooter({ text: newFooterText, iconURL: targetUser.displayAvatarURL({ extension: 'png', size: 64 }) }); const currentFilterKey = filterDays === 0 ? 'all' : '30d'; const combinedRow = new ActionRowBuilder(); if (totalPages > 1) combinedRow.addComponents( new ButtonBuilder().setCustomId(`stats_page_prev:${uid}:${currentFilterKey}:${currentPage}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0) ); combinedRow.addComponents( new ButtonBuilder().setCustomId(`stats_filter_30d:${uid}:${currentPage}`).setLabel('30D').setStyle(currentFilterKey === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`stats_filter_all:${uid}:${currentPage}`).setLabel('ALL').setStyle(currentFilterKey === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary), ); if (totalPages > 1) combinedRow.addComponents( new ButtonBuilder().setCustomId(`stats_page_next:${uid}:${currentFilterKey}:${currentPage}`).setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= totalPages - 1) ); const components = [combinedRow];
    return { embed: newEmbed, components: components };
}