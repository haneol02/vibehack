import { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

  // Claude에 메시지 전달
  const sendRes = await fetch(`${API_URL}/api/sessions/${project.slug}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message.content }),
  }).catch(() => null);

  if (!sendRes?.ok) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`log:${project.slug}`)
      .setLabel('📋 응답 확인')
      .setStyle(ButtonStyle.Secondary)
  );

  await message.reply({ content: `✅ Claude에게 전달됨`, components: [row] });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId.startsWith('log:')) {
    const slug = interaction.customId.split(':')[1];
    await interaction.deferReply({ ephemeral: true });
    const res = await fetch(`${API_URL}/api/sessions/${slug}/log`).catch(() => null);
    const { log } = res ? await res.json() : { log: '(로그 없음)' };
    const truncated = log?.slice(-1800) || '(로그 없음)';
    await interaction.editReply(`\`\`\`\n${truncated}\n\`\`\``);
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'hack') {
    await hackCommand.execute(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
