/**
 * @file ttsModeration.js
 * @description Enhanced TTS Message Moderation with rate limiting and improved error handling
 * @author Javis
 * @license MIT
 * @copyright Copyright (c) 2025
 */

const { Events, EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

// Initialize OpenAI client
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } else {
    console.warn('[TTS Moderation] OPENAI_API_KEY not set - TTS moderation disabled');
  }
} catch (error) {
  console.error('[TTS Moderation] Failed to initialize OpenAI client:', error.message);
}

// Rate limiting configuration
const TTS_COOLDOWN = parseInt(process.env.TTS_RATE_LIMIT) || 3000; // 3 seconds default
const userTTSTimestamps = new Map();
const moderationCache = new Map();
const CACHE_DURATION = 60000; // 1 minute cache

// Statistics tracking
const stats = {
  totalProcessed: 0,
  totalFlagged: 0,
  totalDeleted: 0,
  errors: 0,
  rateLimited: 0
};

/**
 * Check if user is rate limited
 * @param {string} userId - User ID to check
 * @returns {boolean} True if rate limited
 */
function isRateLimited(userId) {
  const now = Date.now();
  const userTimestamp = userTTSTimestamps.get(userId);
  
  if (userTimestamp && (now - userTimestamp) < TTS_COOLDOWN) {
    return true;
  }
  
  userTTSTimestamps.set(userId, now);
  return false;
}

/**
 * Check moderation cache
 * @param {string} content - Message content
 * @returns {object|null} Cached result or null
 */
function getCachedModeration(content) {
  const cached = moderationCache.get(content);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.result;
  }
  return null;
}

/**
 * Log moderation action to designated channel
 * @param {Message} message - Original message
 * @param {object} results - Moderation results
 */
async function logModerationAction(message, results) {
  const logChannelId = process.env.TTS_LOG_CHANNEL_ID || process.env.LOG_CHANNEL;
  if (!logChannelId) return;

  try {
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const flaggedCategories = Object.entries(results.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    const categoryScores = Object.entries(results.category_scores)
      .filter(([category]) => flaggedCategories.includes(category))
      .map(([category, score]) => `${category}: ${(score * 100).toFixed(2)}%`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔇 TTS Message Moderated')
      .setDescription('A TTS message was flagged by content moderation')
      .addFields([
        {
          name: '👤 User',
          value: `${message.author.tag} (${message.author.id})`,
          inline: true
        },
        {
          name: '📢 Channel',
          value: `${message.channel.name} (${message.channel.id})`,
          inline: true
        },
        {
          name: '⚠️ Flagged Categories',
          value: flaggedCategories.join(', ') || 'Unknown',
          inline: false
        },
        {
          name: '📊 Confidence Scores',
          value: categoryScores || 'N/A',
          inline: false
        },
        {
          name: '💬 Content Preview',
          value: message.content.length > 100 
            ? `${message.content.substring(0, 100)}...` 
            : message.content,
          inline: false
        }
      ])
      .setTimestamp()
      .setFooter({ text: 'TTS Moderation System' });

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[TTS Moderation] Error logging to channel:', error.message);
  }
}

module.exports = {
  name: Events.MessageCreate,
  
  /**
   * Execute TTS moderation
   * @param {Message} message - Discord message object
   */
  async execute(message) {
    // Skip bot messages and non-TTS messages
    if (message.author.bot || !message.tts) {
      return;
    }

    stats.totalProcessed++;

    // Check if OpenAI is configured
    if (!openai) {
      console.warn('[TTS Moderation] OpenAI not configured, skipping moderation');
      return;
    }

    // Rate limiting check
    if (isRateLimited(message.author.id)) {
      stats.rateLimited++;
      console.log(`[TTS Moderation] Rate limited user: ${message.author.tag}`);
      
      try {
        await message.delete();
        const warning = await message.channel.send(
          `⏱️ ${message.author}, please wait ${TTS_COOLDOWN / 1000} seconds between TTS messages.`
        );
        
        // Auto-delete warning after 5 seconds
        setTimeout(() => warning.delete().catch(() => {}), 5000);
      } catch (error) {
        console.error('[TTS Moderation] Error handling rate limit:', error.message);
      }
      return;
    }

    // Check cache first
    const cachedResult = getCachedModeration(message.content);
    if (cachedResult) {
      if (cachedResult.flagged) {
        try {
          await message.delete();
          stats.totalDeleted++;
          await logModerationAction(message, cachedResult);
        } catch (error) {
          console.error('[TTS Moderation] Error deleting cached flagged message:', error.message);
        }
      }
      return;
    }

    // Perform moderation check
    try {
      const moderation = await openai.moderations.create({
        input: message.content,
      });

      const [results] = moderation.results;

      // Cache the result
      moderationCache.set(message.content, {
        result: results,
        timestamp: Date.now()
      });

      if (results.flagged) {
        stats.totalFlagged++;
        
        try {
          await message.delete();
          stats.totalDeleted++;
          
          console.log(
            `[TTS Moderation] Deleted TTS message from ${message.author.tag} ` +
            `(${message.author.id}) for violating content policy`
          );

          await logModerationAction(message, results);

          // Send ephemeral warning to user
          const warningMsg = await message.channel.send(
            `⚠️ ${message.author}, your TTS message was removed for violating content policy.`
          );
          
          // Auto-delete warning after 10 seconds
          setTimeout(() => warningMsg.delete().catch(() => {}), 10000);

        } catch (error) {
          console.error('[TTS Moderation] Error handling flagged message:', error.message);
          stats.errors++;
        }
      }

    } catch (error) {
      stats.errors++;
      
      if (error.status === 429) {
        console.error('[TTS Moderation] Rate limited by OpenAI API');
      } else if (error.status === 401) {
        console.error('[TTS Moderation] Invalid OpenAI API key');
      } else {
        console.error('[TTS Moderation] Error moderating TTS message:', error.message);
      }
      
      // Don't delete message if moderation fails - fail open for safety
    }
  },

  // Export statistics getter for admin commands
  getStats: () => ({ ...stats }),

  // Reset statistics
  resetStats: () => {
    stats.totalProcessed = 0;
    stats.totalFlagged = 0;
    stats.totalDeleted = 0;
    stats.errors = 0;
    stats.rateLimited = 0;
  }
};
