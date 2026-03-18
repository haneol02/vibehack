import fetch from 'node-fetch';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const API_URL = process.env.DASHBOARD_API_URL || 'http://dashboard:3001';
const DOMAIN = process.env.DOMAIN || 'localhost';

async function api(path, method = 'GET', body = null) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

function projectButtons(slug) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('대시보드')
      .setStyle(ButtonStyle.Link)
      .setURL(`${proto}://${DOMAIN}/session/${slug}`),
    new ButtonBuilder()
      .setLabel('VS Code')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://vscode-vibehack.haneol.kr/?folder=/home/coder/projects/${slug}`),
  );
}

function appButtons(slug) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('앱 열기')
      .setStyle(ButtonStyle.Link)
      .setURL(`${proto}://${slug}.${DOMAIN}`),
    new ButtonBuilder()
      .setLabel('대시보드')
      .setStyle(ButtonStyle.Link)
      .setURL(`${proto}://${DOMAIN}/session/${slug}`),
    new ButtonBuilder()
      .setLabel('VS Code')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://vscode-vibehack.haneol.kr/?folder=/home/coder/projects/${slug}`),
  );
}

export const hackCommand = {
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    try {
      switch (sub) {
        case 'help': {
          const embed = new EmbedBuilder()
            .setColor(0x5b8af5)
            .setTitle('🛠 VibHack 명령어 도움말')
            .addFields(
              { name: '/hack new <name>', value: '새 프로젝트 생성' },
              { name: '/hack ask <slug> <message>', value: 'Claude에게 작업 요청' },
              { name: '/hack preview <slug> [command]', value: '앱 실행 및 URL 확인' },
              { name: '/hack stop-app <slug>', value: '앱 컨테이너 중단' },
              { name: '/hack list', value: '프로젝트 목록 보기' },
              { name: '/hack delete <slug>', value: '프로젝트 완전 삭제' },
            );
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'new': {
          const name = interaction.options.getString('name');
          const project = await api('/api/projects', 'POST', {
            name,
            discordChannelId: interaction.channelId,
            createdBy: interaction.user.tag,
          });

          if (project.error) {
            return interaction.editReply(`❌ ${project.error}`);
          }

          await api(`/api/sessions/${project.slug}/start`, 'POST');

          const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`🚀 ${project.name}`)
            .setDescription('프로젝트가 생성되었습니다!')
            .addFields(
              { name: '슬러그', value: `\`${project.slug}\``, inline: true },
            );

          await interaction.editReply({ embeds: [embed], components: [projectButtons(project.slug)] });
          break;
        }

        case 'ask': {
          const slug = interaction.options.getString('slug');
          const message = interaction.options.getString('message');

          const result = await api(`/api/sessions/${slug}/chat/sync`, 'POST', { message, username: interaction.user.tag });

          if (result.error) {
            return interaction.editReply(`❌ ${result.error}`);
          }

          const reply = result.reply || '(응답 없음)';
          const truncated = reply.length > 1800 ? reply.slice(0, 1800) + '…' : reply;

          const embed = new EmbedBuilder()
            .setColor(0x5b8af5)
            .setTitle(`💬 Claude @ ${slug}`)
            .setDescription(truncated);

          await interaction.editReply({ embeds: [embed], components: [projectButtons(slug)] });
          break;
        }

        case 'preview': {
          const slug = interaction.options.getString('slug');
          const command = interaction.options.getString('command') || 'npm start';

          const result = await api(`/api/apps/${slug}/start`, 'POST', { startCommand: command });

          if (result.error) {
            return interaction.editReply(`❌ ${result.error}`);
          }

          const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`▶ 앱 실행됨: ${slug}`)
            .addFields(
              { name: '시작 명령어', value: `\`${command}\`` },
            );

          await interaction.editReply({ embeds: [embed], components: [appButtons(slug)] });
          break;
        }

        case 'stop-app': {
          const slug = interaction.options.getString('slug');
          await api(`/api/apps/${slug}/stop`, 'POST');
          await interaction.editReply(`⏹ \`${slug}\` 앱이 중단되었습니다.`);
          break;
        }

        case 'list': {
          const projects = await api('/api/projects');
          if (!projects.length) {
            return interaction.editReply('활성 프로젝트가 없습니다.');
          }

          const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('📋 VibHack 프로젝트 목록')
            .setDescription(projects.map(p =>
              `**${p.name}** (\`${p.slug}\`)`
            ).join('\n'));

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'delete': {
          const slug = interaction.options.getString('slug');
          const result = await api(`/api/projects/${slug}`, 'DELETE');
          if (result.error) {
            return interaction.editReply(`❌ ${result.error}`);
          }
          await interaction.editReply(`🗑 \`${slug}\` 프로젝트가 삭제되었습니다.`);
          break;
        }
      }
    } catch (err) {
      console.error('Command error:', err);
      await interaction.editReply(`❌ 오류: ${err.message}`);
    }
  }
};
