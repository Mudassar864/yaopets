#!/usr/bin/env node

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔄 Preparando para enviar o esquema do banco de dados para o PostgreSQL...');

// Confirmar antes de prosseguir
rl.question('⚠️ Isso irá sincronizar as alterações ao banco de dados. Continuar? (s/N) ', (answer) => {
  if (answer.toLowerCase() === 's') {
    console.log('🚀 Enviando esquema para o banco de dados...');
    
    // Executar o comando drizzle-kit push
    exec('npx drizzle-kit push:pg', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erro ao enviar esquema: ${error.message}`);
        rl.close();
        return;
      }
      
      if (stderr) {
        console.error(`⚠️ Avisos: ${stderr}`);
      }
      
      console.log('✅ Esquema enviado com sucesso!');
      console.log(stdout);
      
      rl.close();
    });
  } else {
    console.log('❌ Operação cancelada pelo usuário.');
    rl.close();
  }
});