import fetch from 'node-fetch';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const API_URL = process.env.DASHBOARD_API_URL || 'http://dashboard:3001';
const DOMAIN = process.env.DOMAIN || 'localhost';
const proto = 'https';

async function api(path, method = 'GET', body = null) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.API_KEY || '',
    },
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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
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
              { name: '/hack list', value: '프로젝트 목록 (상태, URL 포함)' },
              { name: '/hack status <slug>', value: '프로젝트 상세 상태' },
              { name: '/hack ask <slug> <message>', value: 'Claude에게 작업 요청' },
              { name: '/hack chat <slug>', value: '최근 대화 내역 보기' },
              { name: '/hack preview <slug> [command]', value: '앱 실행 및 URL 확인' },
              { name: '/hack stop-app <slug>', value: '앱 중단' },
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

        case 'list': {
          const projects = await api('/api/projects');
          if (!Array.isArray(projects) || !projects.length) {
            return interaction.editReply('활성 프로젝트가 없습니다.');
          }

          // Fetch app status for each project in parallel
          const statuses = await Promise.all(
            projects.map(p => api(`/api/apps/${p.slug}`).catch(() => ({})))
          );

          const embed = new EmbedBuilder()
            .setColor(0x5b8af5)
            .setTitle('📋 VibHack 프로젝트 목록')
            .setDescription(`총 ${projects.length}개 프로젝트`);

          projects.forEach((p, i) => {
            const app = statuses[i];
            const appRunning = app?.status === 'running';
            const statusIcon = appRunning ? '🟢' : '⚫';
            const appUrl = appRunning ? `[${p.slug}.${DOMAIN}](${proto}://${p.slug}.${DOMAIN})` : '미실행';
            embed.addFields({
              name: `${statusIcon} ${p.name} \`${p.slug}\``,
              value: `앱: ${appUrl}\n[대시보드](${proto}://${DOMAIN}/session/${p.slug})`,
              inline: true,
            });
          });

          // Add buttons for up to 5 projects
          const components = projects.slice(0, 5).map(p => {
            const app = statuses[projects.indexOf(p)];
            const appRunning = app?.status === 'running';
            const row = new ActionRowBuilder();
            if (appRunning) {
              row.addComponents(
                new ButtonBuilder().setLabel(`앱: ${p.slug}`).setStyle(ButtonStyle.Link).setURL(`${proto}://${p.slug}.${DOMAIN}`),
                new ButtonBuilder().setLabel('대시보드').setStyle(ButtonStyle.Link).setURL(`${proto}://${DOMAIN}/session/${p.slug}`),
              );
            } else {
              row.addComponents(
                new ButtonBuilder().setLabel(`대시보드: ${p.slug}`).setStyle(ButtonStyle.Link).setURL(`${proto}://${DOMAIN}/session/${p.slug}`),
              );
            }
            return row;
          });

          await interaction.editReply({ embeds: [embed], components });
          break;
        }

        case 'status': {
          const slug = interaction.options.getString('slug');
          const [session, app, msgs] = await Promise.all([
            api(`/api/sessions/${slug}`),
            api(`/api/apps/${slug}`).catch(() => ({})),
            api(`/api/sessions/${slug}/messages`).catch(() => []),
          ]);

          if (session.error) {
            return interaction.editReply(`❌ 프로젝트 \`${slug}\`를 찾을 수 없습니다.`);
          }

          const appRunning = app?.status === 'running';
          const claudeRunning = !!session.claudeRunning;
          const lastMsg = Array.isArray(msgs) ? [...msgs].reverse().find(m => m.role === 'assistant') : null;
          const lastActive = lastMsg?.created_at ? timeAgo(lastMsg.created_at) : '기록 없음';

          const embed = new EmbedBuilder()
            .setColor(appRunning ? 0x00AE86 : 0x484d5a)
            .setTitle(`📊 ${slug} 상태`)
            .addFields(
              { name: '앱', value: appRunning ? `🟢 실행 중` : '⚫ 중단', inline: true },
              { name: 'Claude', value: claudeRunning ? '🔵 작업 중' : '⚪ 대기', inline: true },
              { name: '마지막 활동', value: lastActive, inline: true },
            );

          if (appRunning) {
            embed.addFields({ name: 'URL', value: `[${slug}.${DOMAIN}](${proto}://${slug}.${DOMAIN})` });
          }

          const components = [appRunning ? appButtons(slug) : projectButtons(slug)];
          await interaction.editReply({ embeds: [embed], components });
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

        case 'chat': {
          const slug = interaction.options.getString('slug');
          const msgs = await api(`/api/sessions/${slug}/messages`);

          if (!Array.isArray(msgs) || msgs.length === 0) {
            return interaction.editReply(`\`${slug}\` 프로젝트에 대화 내역이 없습니다.`);
          }

          const recent = msgs.slice(-10); // last 10 messages
          const lines = recent.map(m => {
            const isUser = m.role === 'user';
            const name = isUser ? (m.username || '사용자') : 'Claude';
            const content = isUser
              ? String(m.content || '')
              : String(m.content?.text || m.content || '');
            const truncated = content.length > 200 ? content.slice(0, 200) + '…' : content;
            const icon = isUser ? '👤' : '🤖';
            return `${icon} **${name}**: ${truncated}`;
          }).join('\n\n');

          const embed = new EmbedBuilder()
            .setColor(0x5b8af5)
            .setTitle(`💬 ${slug} 최근 대화`)
            .setDescription(lines.slice(0, 4000) || '(없음)');

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
              { name: 'URL', value: `[${slug}.${DOMAIN}](${proto}://${slug}.${DOMAIN})` },
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
