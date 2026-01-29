const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function executarMigration() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Iniciando migração do estoque...\n');

    // Ler arquivo SQL
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'migrations', '007-create-estoque-simples.sql'),
      'utf8'
    );

    // Separar statements de forma mais robusta
    const statements = [];
    let currentStatement = '';
    const lines = sqlFile.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignorar comentários
      if (trimmedLine.startsWith('--') || trimmedLine.startsWith('/*') || trimmedLine.length === 0) {
        continue;
      }

      currentStatement += line + '\n';

      // Se terminar com ponto-e-vírgula, é o fim do statement
      if (trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    console.log(`Executando ${statements.length} comandos SQL...\n`);

    let executados = 0;
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;

      try {
        await connection.query(statement);
        executados++;
        
        // Mostrar progresso
        if (statement.includes('DROP TABLE')) {
          const match = statement.match(/DROP TABLE.*?`?(\w+)`?/i);
          if (match) {
            console.log(`✓ Tabela removida: ${match[1]}`);
          }
        } else if (statement.includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE.*?`?(\w+)`?\s*\(/i);
          if (match) {
            console.log(`✓ Tabela criada: ${match[1]}`);
          }
        } else if (statement.includes('CREATE') && statement.includes('VIEW')) {
          const match = statement.match(/CREATE.*?VIEW\s+`?(\w+)`?/i);
          if (match) {
            console.log(`✓ View criada: ${match[1]}`);
          }
        } else if (statement.includes('INSERT INTO')) {
          const match = statement.match(/INSERT INTO\s+`?(\w+)`?/i);
          if (match) {
            console.log(`✓ Dados inseridos em: ${match[1]}`);
          }
        }
      } catch (error) {
        // Ignorar erros de "já existe"
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.code === 'ER_DUP_ENTRY' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.errno === 1050 ||
            error.errno === 1061) {
          const tabela = error.message.match(/table '(\w+)'/i) || error.message.match(/key '(\w+)'/i);
          console.log(`⚠ Já existe: ${tabela ? tabela[1] : 'item'}`);
        } else if (error.errno === 1091) {
          console.log(`⚠ Chave estrangeira não encontrada (ignorado)`);
        } else {
          console.error(`✗ Erro:`, error.message);
          // Continuar mesmo com erro
        }
      }
    }

    console.log(`\n✓ Migration concluída! ${executados} comandos executados com sucesso.`);

  } catch (error) {
    console.error('Erro na migração:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

// Executar
executarMigration()
  .then(() => {
    console.log('\n✓ Processo finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Erro:', error);
    process.exit(1);
  });
