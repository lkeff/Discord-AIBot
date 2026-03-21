/**
 * @file logger.js
 * @description Structured JSON logger to replace console.log usage
 */

/**
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
function log(level, message, meta = {}) {
    const entry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...meta,
    };
    const output = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
        process.stderr.write(output + '\n');
    } else {
        process.stdout.write(output + '\n');
    }
}

const logger = {
    debug: (msg, meta) => log('debug', msg, meta),
    info:  (msg, meta) => log('info',  msg, meta),
    warn:  (msg, meta) => log('warn',  msg, meta),
    error: (msg, meta) => log('error', msg, meta),
};

module.exports = { logger };
