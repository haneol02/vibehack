import Redis from 'ioredis';
import { EmbedBuilder } from 'discord.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = 'vibehack:events';

export const logListener = {
  start(client) {
    const redisSub = new Redis(REDIS_URL);

    redisSub.subscribe(CHANNEL, (err) => {
      if (err) return console.error('Log listener subscribe error:', err);
      console.log('Log listener subscribed to vibehack:events');
    });

    redisSub.on('message', async (ch, message) => {
      if (ch !== CHANNEL) return;

      try {
        const event = JSON.parse(message);
        await handleEvent(client, event);
      } catch (err) {
        console.error('Log listener error:', err);
      }
    });
  }
};

async function handleEvent(client, event) {
  const { type, data, projectId } = event;

  // Get discord channel for this project
  let channelId = null;
  if (projectId) {
    try {
      const res = await fetch(`http://dashboard:3001/api/projects`);
      const projects = await res.json();
      const project = projects.find(p => p.id === projectId);
      channelId = project?.discord_channel_id;
    } catch {}
  }

  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    const embed = buildEmbed(type, data);
    if (embed) await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send to Discord:', err.message);
  }
}

function buildEmbed(type, data) {
  switch (type) {
    case 'session.created':
      return new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🚀 새 세션 시작')
        .setDescription(`프로젝트 \`${data.projectSlug}\` 세션이 시작되었습니다`);

    case 'app.started':
      return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('▶ 앱 실행됨')
        .addFields({ name: 'URL', value: data.url });

    case 'app.stopped':
      return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⏹ 앱 중단됨')
        .setDescription(`\`${data.projectSlug}\``);

    case 'session.stopped':
      return new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle('⏹ 세션 중단됨')
        .setDescription(`\`${data.projectSlug}\``);

    default:
      return null;
  }
}
