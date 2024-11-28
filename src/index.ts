import {
  Channel,
  Client,
  GatewayIntentBits,
  GuildMember,
  TextChannel,
  VoiceState,
} from "discord.js";
import { config } from "dotenv";
config();

type ISession = {
  timeStamp: number;
  deafened: boolean;
  member: GuildMember;
};

const voiceSessions = new Map<string, ISession>();
const timeoutValue = Number.parseInt(process.env.TIMEOUT ?? "500000");

let notificationChannel: Channel | null = null;

const { Guilds, GuildMessages, GuildMembers, GuildVoiceStates } =
  GatewayIntentBits;
const client = new Client({
  intents: [Guilds, GuildMessages, GuildMembers, GuildVoiceStates],
});

client.on("ready", async (client) => {
  console.log(`Logged in as ${client.user.username}`);
  if (process.env.NOTIFICATION_CHANNEL_ID) {
    notificationChannel = await client.channels.fetch(
      process.env.NOTIFICATION_CHANNEL_ID
    );
  }
});

client.on("voiceStateUpdate", (oldState, newState) => {
  if (!newState.channel && newState.member) {
    voiceSessions.delete(newState.member.user.id);
  }

  if (
    newState.channel?.guildId != process.env.GUILD_ID ||
    newState.member?.user.bot ||
    !newState.member
  ) {
    return;
  }

  voiceSessions.set(newState.member.user.id, {
    timeStamp: Date.now(),
    deafened: newState.selfDeaf ?? false,
    member: newState.member,
  });
});

setInterval(() => {
  console.log(`Monitoring ${voiceSessions.size} voice sessions`);

  voiceSessions.forEach((session) => {
    if (session.deafened && timeoutValue < Date.now() - session.timeStamp) {
      session.member.voice.disconnect();
      voiceSessions.delete(session.member.user.id);
      if (notificationChannel?.isTextBased()) {
        notificationChannel.send({
          content: `<@${session.member.user.id}> has been kicked for AFK`,
          allowedMentions: { parse: [] },
        });
      }
      console.log(
        `Kicked ${session.member.user.displayName} the fuck outta voice chat`
      );
    }
  });
}, 5000);

client.login(process.env.DISCORD_TOKEN);
