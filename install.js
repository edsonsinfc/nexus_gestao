const { execSync } = require('child_process');

console.log('📦 Iniciando npm install no servidor KingHost...');

try {
  // Executa o npm install silenciosamente para carregar as dependências de produção
  execSync('npm install --production', { stdio: 'inherit' });
  console.log('✅ npm install finalizado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao executar npm install:', error.message);
}
