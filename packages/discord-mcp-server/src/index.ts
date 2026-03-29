import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ChannelType,
} from 'discord.js';
import * as http from 'http';

let discordClient: Client | null = null;

function getToken(): string {
  const token = (process.env.DISCORD_TOKEN || '').trim();
  if (!token) throw new Error('Missing DISCORD_TOKEN environment variable.');
  return token;
}

async function getClient(): Promise<Client> {
  if (discordClient?.isReady()) return discordClient;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
  });
  await client.login(getToken());
  await new Promise<void>((resolve) => client.once('ready', () => resolve()));
  discordClient = client;
  return client;
}

async function main(): Promise<void> {
  const server = new McpServer({ name: 'discord-mcp', version: '1.0.0' });
  const tool: any = (server as any).tool?.bind(server);

  // HTTP health endpoint
  const port = parseInt(process.env.MCP_PORT || '4000', 10);
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      const ready = discordClient?.isReady() ?? false;
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: ready ? 'ok' : 'starting', bot: discordClient?.user?.tag ?? null }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  httpServer.listen(port, () => console.log(`discord-mcp HTTP health on :${port}`));

  tool(
    'discord_list_guilds',
    { description: 'List all Discord guilds the bot is in', inputSchema: { type: 'object', properties: {}, required: [] } },
    async () => {
      try {
        const client = await getClient();
        const guilds = client.guilds.cache.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount }));
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, guilds }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_send_message',
    {
      description: 'Send a message to a Discord text channel',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Discord channel ID' },
          content: { type: 'string', description: 'Message text' },
        },
        required: ['channelId', 'content'],
      },
    },
    async ({ channelId, content }: { channelId: string; content: string }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) throw new Error('Not a text channel');
        const msg = await (channel as TextChannel).send(content);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, messageId: msg.id, channelId }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_read_channel',
    {
      description: 'Read recent messages from a Discord channel',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          limit: { type: 'number', description: 'Max messages to return (1-50)', default: 10 },
        },
        required: ['channelId'],
      },
    },
    async ({ channelId, limit = 10 }: { channelId: string; limit?: number }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) throw new Error('Not a text channel');
        const msgs = await (channel as TextChannel).messages.fetch({ limit: Math.min(limit, 50) });
        const messages = msgs.map((m) => ({
          id: m.id,
          author: m.author.tag,
          content: m.content,
          timestamp: m.createdAt.toISOString(),
        }));
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, channelId, messages }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_get_member',
    {
      description: 'Get info about a guild member',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string' },
          userId: { type: 'string' },
        },
        required: ['guildId', 'userId'],
      },
    },
    async ({ guildId, userId }: { guildId: string; userId: string }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              member: {
                id: member.id,
                tag: member.user.tag,
                nickname: member.nickname,
                roles: member.roles.cache.map((r) => ({ id: r.id, name: r.name })),
                joinedAt: member.joinedAt?.toISOString(),
              },
            }, null, 2),
          }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_create_channel',
    {
      description: 'Create a text channel in a guild',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string' },
          name: { type: 'string' },
          topic: { type: 'string', description: 'Channel topic (optional)' },
        },
        required: ['guildId', 'name'],
      },
    },
    async ({ guildId, name, topic }: { guildId: string; name: string; topic?: string }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.create({ name, topic, type: ChannelType.GuildText });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, channelId: channel.id, name: channel.name }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_add_role',
    {
      description: 'Add a role to a guild member',
      inputSchema: { type: 'object', properties: { guildId: { type: 'string' }, userId: { type: 'string' }, roleId: { type: 'string' } }, required: ['guildId', 'userId', 'roleId'] },
    },
    async ({ guildId, userId, roleId }: { guildId: string; userId: string; roleId: string }) => {
      try {
        const client = await getClient();
        const member = await (await client.guilds.fetch(guildId)).members.fetch(userId);
        await member.roles.add(roleId);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, userId, roleId }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_remove_role',
    {
      description: 'Remove a role from a guild member',
      inputSchema: { type: 'object', properties: { guildId: { type: 'string' }, userId: { type: 'string' }, roleId: { type: 'string' } }, required: ['guildId', 'userId', 'roleId'] },
    },
    async ({ guildId, userId, roleId }: { guildId: string; userId: string; roleId: string }) => {
      try {
        const client = await getClient();
        const member = await (await client.guilds.fetch(guildId)).members.fetch(userId);
        await member.roles.remove(roleId);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, userId, roleId }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_kick_member',
    {
      description: 'Kick a member from a guild',
      inputSchema: { type: 'object', properties: { guildId: { type: 'string' }, userId: { type: 'string' }, reason: { type: 'string' } }, required: ['guildId', 'userId'] },
    },
    async ({ guildId, userId, reason }: { guildId: string; userId: string; reason?: string }) => {
      try {
        const client = await getClient();
        const member = await (await client.guilds.fetch(guildId)).members.fetch(userId);
        await member.kick(reason);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, kicked: userId, reason }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  tool(
    'discord_ban_member',
    {
      description: 'Ban a member from a guild',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string' },
          userId: { type: 'string' },
          reason: { type: 'string' },
          deleteMessageDays: { type: 'number', description: 'Days of messages to delete (0-7)', default: 0 },
        },
        required: ['guildId', 'userId'],
      },
    },
    async ({ guildId, userId, reason, deleteMessageDays = 0 }: { guildId: string; userId: string; reason?: string; deleteMessageDays?: number }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        await guild.members.ban(userId, { reason, deleteMessageSeconds: Math.min(deleteMessageDays, 7) * 86400 });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, banned: userId, reason }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    try { await server.close(); } finally {
      httpServer.close();
      discordClient?.destroy();
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => { console.error(err); process.exit(1); });
