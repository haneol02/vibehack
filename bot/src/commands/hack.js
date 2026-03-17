import fetch from 'node-fetch';
import { EmbedBuilder } from 'discord.js';

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

export const hackCommand = {
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: sub === 'join' });

    try {
      switch (sub) {
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

          // Start session
          const session = await api(`/api/sessions/${project.slug}/start`, 'POST');
          const sessionUrl = `https://${DOMAIN}/proxy/session/${project.slug}/`;

          const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`🚀 ${project.name}`)
            .setDescription(`프로젝트가 생성되었습니다!`)
            .addFields(
              { name: '슬러그', value: `\`${project.slug}\``, inline: true },
              { name: '세션 URL', value: sessionUrl },
            );

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'join': {
          const slug = interaction.options.getString('slug');
          const sessionUrl = `https://${DOMAIN}/proxy/session/${slug}/`;
          await interaction.editReply({ content: `🔗 세션 URL: ${sessionUrl}`, ephemeral: true });
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
              { name: '앱 URL', value: result.url },
              { name: '시작 명령어', value: `\`${command}\`` },
            );

          await interaction.editReply({ embeds: [embed] });
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
            .setDescription(projects.map(p => `**${p.name}** (\`${p.slug}\`) - ${p.session_status === 'running' ? '🟢 실행 중' : '⚫ 중단됨'}`).join('\n'));

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'stop': {
          const slug = interaction.options.getString('slug');
          await api(`/api/sessions/${slug}/stop`, 'POST');
          await interaction.editReply(`⏹ \`${slug}\` 세션이 중단되었습니다.`);
          break;
        }

        case 'log': {
          const slug = interaction.options.getString('slug');
          const { log } = await api(`/api/sessions/${slug}/log`);
          const truncated = log?.slice(-1800) || '(로그 없음)';
          await interaction.editReply(`\`\`\`\n${truncated}\n\`\`\``);
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
