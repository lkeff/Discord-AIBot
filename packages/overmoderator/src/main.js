/**
 * @file main.js
 * @description A multi-functional AI assistant designed for Discord
 * @author Javis
 * @see https://github.com/Javis603/Discord-AIBot
 * @license MIT
 * @copyright Copyright (c) 2025
 */

require('dotenv/config');

const { Client, GatewayIntentBits, Partials, Collection, TextInputStyle, AttachmentBuilder, EmbedBuilder, WebhookClient, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { Guilds, GuildMembers, GuildMessages, MessageContent, GuildPresences } = GatewayIntentBits;
const { User, Message, GuildMember, ThreadMember } = Partials;

const client = new Client({ 
    intents: [Guilds, GuildMembers, GuildMessages, MessageContent, GuildPresences], 
    partials: [User, Message, GuildMember, ThreadMember]
});

require('events').EventEmitter.setMaxListeners(Infinity);
client.ws.setMaxListeners(Infinity);

const { loadEvents } = require("./Handlers/eventHandlers");
const { loadUserLanguagePreferences } = require('shared');

client.events = new Collection();
client.commands = new Collection();

// Connect MangoDB
const mongoose = require('mongoose');
// Optional verbose logging of Mongo operations
if (process.env.MONGOOSE_DEBUG === 'true') {
    mongoose.set('debug', true);
}

// Connection state diagnostics
mongoose.connection.on('connecting', () => console.log('[MongoDB] connecting...'));
mongoose.connection.on('connected', () => console.log('[MongoDB] connected'));
mongoose.connection.on('open', () => console.log('[MongoDB] connection open'));
mongoose.connection.on('reconnected', () => console.log('[MongoDB] reconnected'));
mongoose.connection.on('disconnected', () => console.warn('[MongoDB] disconnected'));
mongoose.connection.on('close', () => console.warn('[MongoDB] connection closed'));
mongoose.connection.on('error', (err) => console.error('[MongoDB] error:', err && err.message ? err.message : err));

const UserSettings = require('./Models/UserSettings');
const Conversation = require('./Models/Conversation');

// snipe
client.snipes = new Collection();

// AI chat
const yaml = require('js-yaml');
const fs = require('fs');
const roles = yaml.load(fs.readFileSync('./roles.yaml', 'utf8'));

client.globalModel = 'default';
client.userModels = {};
client.userConversations = {};
client.userNetSearchEnabled = new Map();
client.userDeepThinkingEnabled = new Map();

const {specialUsers} = require('./Events/AICore/models');

async function initializeUserSettings() {
    try {
        // 載入所有用戶設置
        const settings = await UserSettings.find({});
        settings.forEach(setting => {
            client.userModels[setting.userId] = setting.model;
            client.userNetSearchEnabled.set(setting.userId, setting.netSearchEnabled);
            client.userDeepThinkingEnabled.set(setting.userId, setting.deepThinkingEnabled);
        });

        // 載入所有對話記錄
        const conversations = await Conversation.find({});
        conversations.forEach(conv => {
            if (conv.conversations && conv.conversations.length > 0) {
                client.userConversations[conv.userId] = conv.conversations;
            }
        });

        // 初始化特定用戶設置
        for (const [userId, config] of Object.entries(specialUsers)) {
            // 檢查是否已有對話記錄
            if (!client.userConversations[userId]) {
                const webSearchStatus = client.userNetSearchEnabled.get(userId) 
    ? "開啟" 
    : "關閉，需要用戶在多功能選單裏面打開";
    
const deepThinkingStatus = client.userDeepThinkingEnabled.get(userId) 
    ? "開啟" 
    : "關閉，需要用戶在多功能選單裏面打開";

                const systemPrompt = {
                    role: 'system',
                    content: roles[config.role]
                        .replace(/{username}/g, config.username)
                        .replace(/{relation}/g, config.relation)
                        .replace(/{WebSerach}/g, webSearchStatus)
                        .replace(/{DeepThinking}/g, deepThinkingStatus)
                };

                // 只在沒有現有對話記錄時創建新的
                await Conversation.findOneAndUpdate(
                    { userId },
                    {
                        $setOnInsert: {
                            conversations: [systemPrompt],
                            lastUpdated: new Date()
                        }
                    },
                    { upsert: true, new: true }
                );

                client.userConversations[userId] = [systemPrompt];
            }
        }
        
        // 載入用戶語言偏好設置
        await loadUserLanguagePreferences();
        console.log('已載入用戶語言偏好設置');
    } catch (error) {
        console.error('Error initializing user settings:', error);
    }
}

// 定期清理超過3天的對話記錄
async function cleanupOldConversations() {
    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        await Conversation.deleteMany({
            lastUpdated: { $lt: threeDaysAgo }
        });
        console.log('已清理超過3天的對話記錄');
    } catch (error) {
        console.error('Error cleaning up conversations:', error);
    }
}

// 連接數據庫並初始化
if (process.env.OFFLINE_MODE === 'true') {
    console.log('Running in offline mode. Skipping database connection and Discord login.');
} else {
    // use mongoose.connect here (single, consistent connection)
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('Missing MONGODB_URI environment variable');
        process.exit(1);
    }

    mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(async () => {
            console.log("成功連接到數據庫");
            setInterval(cleanupOldConversations, 3 * 24 * 60 * 60 * 1000);
            
            // 先加載用戶語言偏好設置，然後再啟動機器人
            console.time("加載用戶設置");
            await initializeUserSettings();
            console.timeEnd("加載用戶設置");
            
            // 啟動機器人
            console.log('\x1b[35m%s\x1b[0m', `
                ███╗   ██╗██╗██████╗  █████╗      █████╗ ██╗
                ████╗  ██║██║██╔══██╗██╔══██╗    ██╔══██╗██║
                ██╔██╗ ██║██║██████╔╝███████║    ███████║██║
                ██║╚██╗██║██║██╔══██╗██╔══██║    ██╔══██║██║
                ██║ ╚████║██║██████╔╝██║  ██║    ██║  ██║██║
                ╚═╝  ╚═══╝╚═╝╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
                `);
            console.log('\x1b[36m%s\x1b[0m', '歡迎使用 你爸NIBA AI Discord 機器人 v1.0');
            console.log('\x1b[33m%s\x1b[0m', '正在啟動中...\n');
            const token = (process.env.DISCORD_BOT_TOKEN || '').trim();
            if (!token) {
                console.error('缺少 DISCORD_BOT_TOKEN：請在 .env 中設置機器人 Token（不要使用 Client ID/Secret，也不要加引號或前綴）。');
                process.exit(1);
            }

            client.login(token)
                .then(() => {
                    // 登錄成功後加載事件
                    loadEvents(client);
                })
                .catch(error => {
                    console.error('機器人登錄錯誤:', error);
                });
        })
        .catch(error => {
            console.error('數據庫連接錯誤:', error);
            process.exit(1);
        });
}
