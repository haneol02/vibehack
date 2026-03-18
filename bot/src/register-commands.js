import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('hack')
    .setDescription('VibHack 해커톤 관리 명령어')
    .addSubcommand(sub => sub
      .setName('help')
      .setDescription('명령어 도움말')
    )
    .addSubcommand(sub => sub
      .setName('new')
      .setDescription('새 프로젝트 생성')
      .addStringOption(opt => opt.setName('name').setDescription('프로젝트 이름').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('ask')
      .setDescription('Claude에게 작업 요청')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('요청 내용').setRequired(true))
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
      .setDescription('프로젝트 목록 (상태, URL 포함)')
    )
    .addSubcommand(sub => sub
      .setName('status')
      .setDescription('프로젝트 상세 상태')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('chat')
      .setDescription('최근 대화 내역 보기')
      .addStringOption(opt => opt.setName('slug').setDescription('프로젝트 슬러그').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('프로젝트 완전 삭제')
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
