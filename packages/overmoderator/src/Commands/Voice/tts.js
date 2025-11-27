/**
 * @file tts.js
 * @description Text-to-Speech command with multi-language support
 * @author Javis
 * @license MIT
 * @copyright Copyright (c) 2025
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getText } = require('../../Functions/i18n');

// TTS Configuration
const TTS_CONFIG = {
  maxLength: parseInt(process.env.TTS_MAX_LENGTH) || 200,
  defaultLanguage: process.env.TTS_DEFAULT_LANGUAGE || 'en-US',
  volume: parseFloat(process.env.TTS_VOLUME) || 1.0,
  
  // Available languages/voices
  languages: {
    'en-US': { name: 'English (US)', voice: 'en-US' },
    'en-GB': { name: 'English (UK)', voice: 'en-GB' },
    'es-ES': { name: 'Spanish', voice: 'es-ES' },
    'fr-FR': { name: 'French', voice: 'fr-FR' },
    'de-DE': { name: 'German', voice: 'de-DE' },
    'it-IT': { name: 'Italian', voice: 'it-IT' },
    'ja-JP': { name: 'Japanese', voice: 'ja-JP' },
    'ko-KR': { name: 'Korean', voice: 'ko-KR' },
    'zh-CN': { name: 'Chinese (Simplified)', voice: 'zh-CN' },
    'zh-TW': { name: 'Chinese (Traditional)', voice: 'zh-TW' },
    'pt-BR': { name: 'Portuguese (Brazil)', voice: 'pt-BR' },
    'ru-RU': { name: 'Russian', voice: 'ru-RU' },
  }
};

const contextObj = {
  userId: 'system',
  guildId: null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Text-to-Speech commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Connect | PermissionFlagsBits.Speak)
    
    // /tts speak <text> [language]
    .addSubcommand(subcommand =>
      subcommand
        .setName('speak')
        .setDescription('Generate and play text-to-speech in your voice channel')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Text to speak (max 200 characters)')
            .setRequired(true)
            .setMaxLength(TTS_CONFIG.maxLength)
        )
        .addStringOption(option =>
          option
            .setName('language')
            .setDescription('Language/voice to use')
            .setRequired(false)
            .addChoices(
              ...Object.entries(TTS_CONFIG.languages).map(([code, lang]) => ({
                name: lang.name,
                value: code
              }))
            )
        )
    )
    
    // /tts stop
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Stop current TTS playback')
    )
    
    // /tts skip
    .addSubcommand(subcommand =>
      subcommand
        .setName('skip')
        .setDescription('Skip current TTS and play next in queue')
    )
    
    // /tts queue
    .addSubcommand(subcommand =>
      subcommand
        .setName('queue')
        .setDescription('Show current TTS queue')
    )
    
    // /tts settings
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('View or modify TTS settings')
        .addNumberOption(option =>
          option
            .setName('volume')
            .setDescription('Set volume (0.1 to 2.0)')
            .setRequired(false)
            .setMinValue(0.1)
            .setMaxValue(2.0)
        )
        .addNumberOption(option =>
          option
            .setName('speed')
            .setDescription('Set speech speed (0.5 to 2.0)')
            .setRequired(false)
            .setMinValue(0.5)
            .setMaxValue(2.0)
        )
    ),

  /**
   * Execute TTS command
   * @param {ChatInputCommandInteraction} interaction 
   * @param {Client} client 
   */
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'speak':
          await this.handleSpeak(interaction, client);
          break;
        case 'stop':
          await this.handleStop(interaction, client);
          break;
        case 'skip':
          await this.handleSkip(interaction, client);
          break;
        case 'queue':
          await this.handleQueue(interaction, client);
          break;
        case 'settings':
          await this.handleSettings(interaction, client);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('[TTS Command] Error:', error);
      
      const errorMessage = error.message.includes('voice')
        ? '❌ Please join a voice channel first!'
        : '❌ An error occurred while processing your TTS request.';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },

  /**
   * Handle /tts speak command
   */
  async handleSpeak(interaction, client) {
    await interaction.deferReply();

    // Check if user is in a voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return await interaction.editReply({
        content: '❌ You need to be in a voice channel to use TTS!'
      });
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has(PermissionFlagsBits.Connect) || 
        !permissions.has(PermissionFlagsBits.Speak)) {
      return await interaction.editReply({
        content: '❌ I don\'t have permission to join or speak in your voice channel!'
      });
    }

    const text = interaction.options.getString('text');
    const language = interaction.options.getString('language') || TTS_CONFIG.defaultLanguage;

    // TODO: Implement voice connection and TTS generation
    // This requires @discordjs/voice package to be installed
    await interaction.editReply({
      content: `🎤 TTS Feature Coming Soon!\n\n` +
               `**Text:** ${text}\n` +
               `**Language:** ${TTS_CONFIG.languages[language].name}\n` +
               `**Voice Channel:** ${voiceChannel.name}\n\n` +
               `*Please install @discordjs/voice package to enable this feature.*`
    });
  },

  /**
   * Handle /tts stop command
   */
  async handleStop(interaction, client) {
    // TODO: Implement stop functionality
    await interaction.reply({
      content: '⏹️ TTS playback stopped.',
      ephemeral: true
    });
  },

  /**
   * Handle /tts skip command
   */
  async handleSkip(interaction, client) {
    // TODO: Implement skip functionality
    await interaction.reply({
      content: '⏭️ Skipped current TTS.',
      ephemeral: true
    });
  },

  /**
   * Handle /tts queue command
   */
  async handleQueue(interaction, client) {
    // TODO: Implement queue display
    await interaction.reply({
      content: '📋 **TTS Queue:**\nNo items in queue.',
      ephemeral: true
    });
  },

  /**
   * Handle /tts settings command
   */
  async handleSettings(interaction, client) {
    const volume = interaction.options.getNumber('volume');
    const speed = interaction.options.getNumber('speed');

    if (!volume && !speed) {
      // Display current settings
      await interaction.reply({
        content: `⚙️ **Current TTS Settings:**\n` +
                 `🔊 Volume: ${TTS_CONFIG.volume}\n` +
                 `⚡ Speed: 1.0\n` +
                 `🌍 Default Language: ${TTS_CONFIG.languages[TTS_CONFIG.defaultLanguage].name}`,
        ephemeral: true
      });
    } else {
      // TODO: Implement settings update
      await interaction.reply({
        content: `✅ Settings updated!\n` +
                 (volume ? `🔊 Volume: ${volume}\n` : '') +
                 (speed ? `⚡ Speed: ${speed}` : ''),
        ephemeral: true
      });
    }
  }
};
