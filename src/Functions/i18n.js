/**
 * @file i18n.js
 * @description Internationalization and localization functions
 * @author Javis
 * @license MIT
 * @copyright Copyright (c) 2025
 */
const fs = require('fs');
const path = require('path');
const UserSettings = require('../Models/UserSettings');

let defaultLanguage = process.env.BOT_LANG || 'zh-TW';
const userPreferences = new Map();
const guildPreferences = new Map();

const languages = {};
const localesDir = path.join(__dirname, '..', 'locales');

if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
}

try {
    const files = fs.readdirSync(localesDir);
    for (const file of files) {
        if (file.endsWith('.js')) {
            const languageCode = file.replace('.js', '');
            languages[languageCode] = require(path.join(localesDir, file));
            console.log(`加載語言檔案: ${languageCode}`);
        }
    }
} catch (error) {
    console.error('讀取語言檔案時出錯:', error);
}

if (Object.keys(languages).length === 0) {
    console.warn('沒有找到語言檔案，使用默認結構');
    languages['zh-TW'] = require('../locales/zh-TW');
    languages['zh-CN'] = require('../locales/zh-CN');
    languages['en-US'] = require('../locales/en-US');
    languages['ja-JP'] = require('../locales/ja-JP');
}

function getText(key, language = defaultLanguage, variables = {}) {
    if (language && typeof language === 'object') {
        const contextObj = language;
        const userId = contextObj.userId;
        const guildId = contextObj.guildId;
        
        let userLang = null;
        
        if (contextObj.userLang) {
            userLang = contextObj.userLang;
        }
        else {
            userLang = getUserLanguageSync(userId, guildId);
        }
        
        language = userLang || defaultLanguage;
        
        variables = variables || {};
    }
    
    if (!languages[language]) {
        language = defaultLanguage;
    }

    const keys = key.split('.');
    let text = languages[language];

    for (const k of keys) {
        if (text && text[k]) {
            text = text[k];
        } else {
            if (!key.includes('.choices.')) {
                console.warn(`未找到翻譯: ${key} (${language})`);
            }
            
            if (language !== defaultLanguage) {
                return getText(key, defaultLanguage, variables);
            }
            
            if (variables && variables.default) {
                return variables.default;
            }
            
            return key;
        }
    }

    if (typeof text === 'string' && variables) {
        for (const [key, value] of Object.entries(variables)) {
            try {
                if (key && key.length > 0) {
                    text = text.replace(new RegExp(`{${key}}`, 'g'), value || '');
                }
            } catch (error) {
                console.error(`正則表達式替換錯誤 (key: ${key}):`, error);
                text = text.replace(`{${key}}`, value || '');
            }
        }
    }

    return text;
}

async function setUserLanguage(userId, language) {
    if (languages[language]) {
        userPreferences.set(userId, language);
        
        try {
            await UserSettings.findOneAndUpdate(
                { userId: userId },
                { 
                    userId: userId,
                    language: language,
                    lastUpdated: Date.now()
                },
                { upsert: true, new: true }
            );
            return true;
        } catch (error) {
            console.error(`保存用戶語言設置時出錯: ${error.message}`);
            return false;
        }
    }
    return false;
}

function setGuildLanguage(guildId, language) {
    if (languages[language]) {
        guildPreferences.set(guildId, language);
        return true;
    }
    return false;
}

async function getUserLanguage(userId, guildId = null) {
    if (userPreferences.has(userId)) {
        return userPreferences.get(userId);
    }
    
    try {
        const userSettings = await UserSettings.findOne({ userId: userId });
        if (userSettings && userSettings.language) {
            userPreferences.set(userId, userSettings.language);
            return userSettings.language;
        }
    } catch (error) {
        console.error(`獲取用戶語言設置時出錯: ${error.message}`);
    }
    
    if (guildId && guildPreferences.has(guildId)) {
        return guildPreferences.get(guildId);
    }
    
    return defaultLanguage;
}

function getUserLanguageSync(userId, guildId) {
    if (userPreferences.has(userId)) {
        return userPreferences.get(userId);
    }
    
    if (guildId && guildPreferences.has(guildId)) {
        return guildPreferences.get(guildId);
    }
    
    return defaultLanguage;
}

async function getLanguageSafe(userId, guildId = null) {
    if (userPreferences.has(userId)) {
        return userPreferences.get(userId);
    }
    
    try {
        const userSettings = await UserSettings.findOne({ userId: userId });
        if (userSettings && userSettings.language) {
            userPreferences.set(userId, userSettings.language);
            return userSettings.language;
        }
    } catch (error) {
        console.warn(`異步獲取用戶語言失敗: ${error.message}`);
    }
    
    if (guildId && guildPreferences.has(guildId)) {
        return guildPreferences.get(guildId);
    }
    
    return defaultLanguage;
}

function getAvailableLanguages() {
    return Object.keys(languages);
}

function setDefaultLanguage(language) {
    if (languages[language]) {
        defaultLanguage = language;
        return true;
    }
    return false;
}

async function loadUserLanguagePreferences() {
    try {
        userPreferences.clear();
        
        const allUserSettings = await UserSettings.find({});
        for (const settings of allUserSettings) {
            if (settings.userId && settings.language) {
                userPreferences.set(settings.userId, settings.language);
            }
        }
        console.log(`已從資料庫加載 ${userPreferences.size} 個用戶的語言偏好設置`);
    } catch (error) {
        console.error(`加載用戶語言偏好設置時出錯: ${error.message}`);
    }
}

module.exports = {
    getText,
    setUserLanguage,
    setGuildLanguage,
    getUserLanguage,
    getUserLanguageSync,
    getLanguageSafe,
    getAvailableLanguages,
    setDefaultLanguage,
    loadUserLanguagePreferences
}; 