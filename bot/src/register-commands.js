import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('hack')
    .setDescription('VibHack 해커톤 관리 명령어')
    .addSubcommand(sub => sub
      .setName('new')
      .setDescription('새 프로젝트 생성')
      .addStringOption(opt => opt.setName('name').setDescription('프로젝트 이름').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('join')
      .setDescription('세션 URL 받기 (DM)')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('preview')
      .setDescription('앱 실행 및 서브도메인 URL')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
      .addStringOption(opt => opt.setName('command').setDescription('시작 명령어 (기본: npm start)'))
    )
    .addSubcommand(sub => sub
      .setName('stop-app')
      .setDescription('앱 컨테이너 중단')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('활성 세션/앱 목록')
    )
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Claude 세션 시작 (재활성화)')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('stop')
      .setDescription('Claude 세션 중단')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('log')
      .setDescription('최근 tmux 스크롤백')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('프로젝트 완전 삭제 (컨테이너 + 데이터 모두 제거)')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .toJSON()
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
