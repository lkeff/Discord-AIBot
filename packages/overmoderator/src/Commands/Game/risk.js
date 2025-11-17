const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('risk')
        .setDescription('Play the game of Risk!'),
    async execute(interaction) {
        await interaction.reply('Risk game is not yet implemented!');
    },
};
