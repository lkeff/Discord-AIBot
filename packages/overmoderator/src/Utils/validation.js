/**
 * @file validation.js
 * @description Input validation utilities for slash commands
 */

const MAX_PROMPT_LENGTH = 2000;

// Basic prompt injection patterns to block
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(all\s+)?previous/i,
    /forget\s+(all\s+)?previous/i,
    /\bsystem\s*:/i,
    /\[INST\]/i,
    /<\|system\|>/i,
];

/**
 * Validate a user prompt before sending to AI APIs.
 * @param {string} input
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePromptInput(input) {
    if (!input || input.trim().length === 0) {
        return { valid: false, error: 'Prompt cannot be empty.' };
    }
    if (input.length > MAX_PROMPT_LENGTH) {
        return { valid: false, error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.` };
    }
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return { valid: false, error: 'Input contains disallowed content.' };
        }
    }
    return { valid: true };
}

/**
 * Reply to an interaction with an ephemeral error message.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} message
 */
async function replyWithError(interaction, message) {
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `Error: ${message}`, ephemeral: true });
    } else {
        await interaction.reply({ content: `Error: ${message}`, ephemeral: true });
    }
}

module.exports = { validatePromptInput, replyWithError };
