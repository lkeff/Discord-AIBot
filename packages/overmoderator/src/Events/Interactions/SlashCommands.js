/**
 * @file SlashCommands.js
 * @description SlashCommands event
 * @author Javis
 * @license MIT
 * @copyright Copyright (c) 2025
 */
const { ChatInputCommandInteraction, Collection, MessageFlags } = require('discord.js');
const { getText, getLanguageSafe } = require('../../Functions/i18n');
const UserSettings = require('../../Models/UserSettings');

const cooldowns = new Collection();

module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction, client) {
        if(!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        
        try {
            const userSettings = await UserSettings.findOne({ userId: interaction.user.id });
            if (userSettings && userSettings.language) {
                interaction.userLang = userSettings.language;
            } else {
                interaction.userLang = process.env.BOT_LANG || 'zh-TW';
            }
        } catch (error) {
            console.error(`獲取用戶語言設置時出錯: ${error.message}`);
            interaction.userLang = process.env.BOT_LANG || 'zh-TW';
        }

        const contextObj = {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            userLang: interaction.userLang
        };
        
        if(!command) 
        return interaction.reply({
            content: getText('errors.commandNotFound', contextObj, { command: interaction.commandName }),
            flags: MessageFlags.Ephemeral
        });

        if(command.developer && interaction.user.id !== process.env.DEVELOPER_ID)
        return interaction.reply({
            content: getText('errors.userMissingPermissions', contextObj, { permissions: getText('permissions.administrator', contextObj) }),
            flags: MessageFlags.Ephemeral
        });

        // guildOnly: true/false
        if ((command.guildOnly !== false) && !interaction.inGuild()) {
            return interaction.reply({ 
                content: getText('errors.guildOnly', contextObj),
                flags: MessageFlags.Ephemeral 
            });
        }

        // cooldown: seconds
        if (command.cooldown) {
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({ 
                        content: getText('errors.cooldown', contextObj, { time: timeLeft.toFixed(1) }),
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        }

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: getText('errors.commandError', contextObj, { 
                    command: interaction.commandName,
                    error: error.message 
                }),
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});
        }
    }
}

