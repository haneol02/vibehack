import { Client, GatewayIntentBits, Events } from 'discord.js';
import { hackCommand } from './commands/hack.js';
import { logListener } from './log-listener.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

client.on(Events.ClientReady, () => {
  console.log(`Bot ready as ${client.user.tag}`);
  logListener.start(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'hack') {
    await hackCommand.execute(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
