// Script para preparar o ambiente de compilação com Capacitor
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output no console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m"
};

/**
 * Executa um comando e retorna sua saída
 * @param {string} command Comando a ser executado
 * @param {boolean} silent Se true, não exibe saída no console
 * @returns {string} Saída do comando
 */
function runCommand(command, silent = false) {
  try {
    // Lista de comandos permitidos para execução
    const allowedCommands = [
      'npm run build',
      'npx cap init YaoPets com.yaopets.app --web-dir=dist',
      'npx cap add android',
      'npx cap add ios',
      'npx cap copy',
      'npx cap sync'
    ];
    
    // Verificar se o comando está na lista de permitidos
    if (!allowedCommands.includes(command)) {
      throw new Error(`Comando não permitido: ${command}`);
    }
    
    if (!silent) {
      console.log(`${colors.blue}Executando:${colors.reset} ${command}`);
    }
    
    const output = execSync(command, { encoding: 'utf8' });
    
    if (!silent && output && output.trim()) {
      console.log(`${colors.green}Saída:${colors.reset}\n${output}`);
    }
    
    return output;
  } catch (error) {
    console.error(`${colors.red}Erro ao executar: ${command}${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    throw error;
  }
}

/**
 * Função principal de preparação
 */
async function prepareCapacitor() {
  console.log(`\n${colors.green}=== Iniciando preparação do ambiente Capacitor ===${colors.reset}\n`);
  
  // Verifica se o arquivo de configuração capacitor.config.json existe
  const configPath = path.join(process.cwd(), 'capacitor.config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`${colors.red}Erro: capacitor.config.json não encontrado!${colors.reset}`);
    process.exit(1);
  }
  
  // Primeiro, construímos o aplicativo web
  console.log(`${colors.yellow}Construindo o aplicativo web...${colors.reset}`);
  runCommand('npm run build');
  
  // Inicializa o Capacitor se ainda não foi inicializado
  const androidDir = path.join(process.cwd(), 'android');
  const iosDir = path.join(process.cwd(), 'ios');
  
  if (!fs.existsSync(androidDir) || !fs.existsSync(iosDir)) {
    console.log(`${colors.yellow}Inicializando Capacitor...${colors.reset}`);
    runCommand('npx cap init YaoPets com.yaopets.app --web-dir=dist');
  }
  
  // Adiciona as plataformas Android e iOS
  if (!fs.existsSync(androidDir)) {
    console.log(`${colors.yellow}Adicionando plataforma Android...${colors.reset}`);
    runCommand('npx cap add android');
  } else {
    console.log(`${colors.green}Plataforma Android já adicionada.${colors.reset}`);
  }
  
  if (!fs.existsSync(iosDir)) {
    console.log(`${colors.yellow}Adicionando plataforma iOS...${colors.reset}`);
    runCommand('npx cap add ios');
  } else {
    console.log(`${colors.green}Plataforma iOS já adicionada.${colors.reset}`);
  }
  
  // Copia os arquivos web para os projetos nativos
  console.log(`${colors.yellow}Copiando arquivos web para projetos nativos...${colors.reset}`);
  runCommand('npx cap copy');
  
  // Sincroniza os plugins
  console.log(`${colors.yellow}Sincronizando plugins...${colors.reset}`);
  runCommand('npx cap sync');
  
  console.log(`\n${colors.green}=== Preparação concluída com sucesso! ===${colors.reset}\n`);
  console.log(`${colors.yellow}Para abrir os projetos nativos:${colors.reset}`);
  console.log(`  - Android: ${colors.blue}npx cap open android${colors.reset}`);
  console.log(`  - iOS:     ${colors.blue}npx cap open ios${colors.reset}`);
  console.log(`\n${colors.green}Para publicar nas lojas:${colors.reset}`);
  console.log(`  1. Configure os ícones e splash screens em seus respectivos diretórios`);
  console.log(`  2. Atualize as informações do aplicativo nos projetos nativos`);
  console.log(`  3. Construa os pacotes para upload nas lojas usando Android Studio / Xcode\n`);
}

// Executar a função principal
prepareCapacitor().catch(error => {
  console.error(`${colors.red}Erro durante a preparação:${colors.reset}`, error);
  process.exit(1);
});