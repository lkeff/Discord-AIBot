/**
 * @file bluetooth.js
 * @description Bluetooth device management via Windows Agent
 */

const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

function agentHeaders(apiKey) {
    return { headers: { Authorization: `Bearer ${apiKey}` } };
}

function getAgentConfig(interaction) {
    const agentUrl = process.env.WINDOWS_AGENT_URL;
    const apiKey = process.env.WINDOWS_AGENT_API_KEY;
    if (!agentUrl || !apiKey) {
        interaction.reply({
            content: 'WINDOWS_AGENT_URL and/or WINDOWS_AGENT_API_KEY are not configured.',
            ephemeral: true,
        });
        return null;
    }
    return { agentUrl, apiKey };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bluetooth')
        .setDescription('Manage Bluetooth devices on the Windows host via the agent')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

        .addSubcommand(sub =>
            sub.setName('status').setDescription('Show Bluetooth service status')
        )
        .addSubcommand(sub =>
            sub.setName('list').setDescription('List Bluetooth devices from the Windows agent')
        )
        .addSubcommand(sub =>
            sub
                .setName('connect')
                .setDescription('Enable a Bluetooth device by InstanceId')
                .addStringOption(opt =>
                    opt
                        .setName('instance-id')
                        .setDescription('The PnP InstanceId of the device (from /bluetooth list)')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('disconnect')
                .setDescription('Disable a Bluetooth device by InstanceId')
                .addStringOption(opt =>
                    opt
                        .setName('instance-id')
                        .setDescription('The PnP InstanceId of the device (from /bluetooth list)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const cfg = getAgentConfig(interaction);
        if (!cfg) return;
        const { agentUrl, apiKey } = cfg;

        const sub = interaction.options.getSubcommand();
        await interaction.deferReply();

        try {
            if (sub === 'status') {
                const resp = await axios.get(`${agentUrl}/bluetooth-status`, agentHeaders(apiKey));
                const data = resp.data;
                const embed = new EmbedBuilder()
                    .setTitle('Bluetooth Service Status')
                    .setColor(data.Status === 'Running' ? 0x00ff00 : 0x808080)
                    .addFields(
                        { name: 'Service', value: data.Name ?? 'bthserv', inline: true },
                        { name: 'Status', value: data.Status ?? 'Unknown', inline: true }
                    )
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });

            } else if (sub === 'list') {
                const resp = await axios.get(`${agentUrl}/bluetooth-devices`, agentHeaders(apiKey));
                const { devices } = resp.data;
                const embed = new EmbedBuilder()
                    .setTitle('Bluetooth Devices')
                    .setColor(0x0099ff)
                    .setTimestamp();

                if (!devices || devices.length === 0) {
                    embed.setDescription('No Bluetooth devices found.');
                } else {
                    embed.setDescription(
                        devices
                            .map(d => `${d.Status === 'OK' ? '🟢' : '⚫'} **${d.FriendlyName ?? 'Unknown'}**\n\`${d.InstanceId}\``)
                            .join('\n\n')
                    );
                }
                await interaction.editReply({ embeds: [embed] });

            } else if (sub === 'connect') {
                const instanceId = interaction.options.getString('instance-id');
                const resp = await axios.post(
                    `${agentUrl}/bluetooth-connect`,
                    { instanceId },
                    agentHeaders(apiKey)
                );
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setDescription(`✅ Enable command sent for \`${instanceId}\``)
                            .addFields({ name: 'Output', value: resp.data.stdout || '(none)' })
                            .setTimestamp(),
                    ],
                });

            } else if (sub === 'disconnect') {
                const instanceId = interaction.options.getString('instance-id');
                const resp = await axios.post(
                    `${agentUrl}/bluetooth-disconnect`,
                    { instanceId },
                    agentHeaders(apiKey)
                );
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff8800)
                            .setDescription(`✅ Disable command sent for \`${instanceId}\``)
                            .addFields({ name: 'Output', value: resp.data.stdout || '(none)' })
                            .setTimestamp(),
                    ],
                });
            }
        } catch (error) {
            console.error('bluetooth command error:', error.message);
            let msg = 'An error occurred communicating with the Windows agent.';
            if (error.response?.data) {
                msg += `\n\`\`\`\n${JSON.stringify(error.response.data, null, 2)}\n\`\`\``;
            }
            await interaction.editReply({ content: msg });
        }
    },
};
