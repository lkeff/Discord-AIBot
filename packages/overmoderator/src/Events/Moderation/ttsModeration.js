const { Events } = require('discord.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.tts) {
      return;
    }

    try {
      const moderation = await openai.moderations.create({
        input: message.content,
      });

      const [results] = moderation.results;

      if (results.flagged) {
        await message.delete();
        console.log(`Deleted TTS message from ${message.author.tag} for violating content policy.`);
        // Optionally, send a message to a log channel
        // const logChannel = message.guild.channels.cache.get('YOUR_LOG_CHANNEL_ID');
        // if (logChannel) {
        //   logChannel.send(`Deleted TTS message from ${message.author.tag} for violating content policy.
        //   Content: "${message.content}"`);
        // }
      }
    } catch (error) {
      console.error('Error moderating TTS message:', error);
    }
  },
};
