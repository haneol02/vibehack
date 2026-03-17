import { Client, GatewayIntentBits, Events } from 'discord.js';
import { hackCommand } from './commands/hack.js';
import { logListener } from './log-listener.js';

const API_URL = process.env.DASHBOARD_API_URL || 'http://dashboard:3001';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.on(Events.ClientReady, () => {
  console.log(`Bot ready as ${client.user.tag}`);
  logListener.start(client);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // 이 채널에 연결된 프로젝트 찾기
  const res = await fetch(`${API_URL}/api/projects`).catch(() => null);
  if (!res) return;
  const projects = await res.json().catch(() => []);
  const project = projects.find(p => p.discord_channel_id === message.channelId);
  if (!project) return;

  const username = message.member?.displayName || message.author.username;
  const reply = await message.reply({ content: '⏳ Claude가 처리 중...' });

  // 세션 시작 보장
  await fetch(`${API_URL}/api/sessions/${project.slug}/start`, { method: 'POST' }).catch(() => {});

  // Claude에 메시지 전달
  const chatRes = await fetch(`${API_URL}/api/sessions/${project.slug}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message.content, username, source: 'discord' }),
  }).catch(() => null);

  if (!chatRes?.ok) {
    const errBody = chatRes ? await chatRes.json().catch(() => ({})) : {};
    await reply.edit(`❌ 오류: ${errBody.error || '알 수 없는 오류'}`);
    return;
  }

  // Claude가 완료될 때까지 폴링 (최대 5분)
  let attempts = 0;
  const maxAttempts = 60;

  const poll = async () => {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;

    const statusRes = await fetch(`${API_URL}/api/sessions/${project.slug}`).catch(() => null);
    const status = statusRes ? await statusRes.json().catch(() => ({})) : {};

    if (!status.claudeRunning || attempts >= maxAttempts) {
      const msgRes = await fetch(`${API_URL}/api/sessions/${project.slug}/messages`).catch(() => null);
      const msgs = msgRes ? await msgRes.json().catch(() => []) : [];
      const last = [...msgs].reverse().find(m => m.role === 'assistant');
      const text = last?.content?.text || last?.content || '완료됐습니다.';
      const truncated = String(text).slice(0, 1900);
      await reply.edit(`**Claude:** ${truncated}`);
      return;
    }

    await poll();
  };

  await poll();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'hack') {
    await hackCommand.execute(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
