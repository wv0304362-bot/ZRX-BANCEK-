/*
 * © 2026 SeXyxeon (VOIDSEC)
 */
const { exec } = require('child_process');

const target = process.argv[2];
const time = process.argv[3];

if (!target || !time) {
    console.log('Usage: node ddos.js <target> <time>');
    process.exit(1);
}

console.log(`Starting process for target: ${target} during ${time}s`);
// Podes adicionar a lógica de requisições aqui se necessário
