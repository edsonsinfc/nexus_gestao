const pool = require('./db');

async function verificarTabelas() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE '%nfe_entrada%'");
    
    if (tables.length > 0) {
      console.log('\n✅ Tabelas NF-e Entrada encontradas:\n');
      tables.forEach(t => console.log('-', Object.values(t)[0]));
    } else {
      console.log('\n❌ NENHUMA tabela nfe_entrada encontrada!');
      console.log('\nAs tabelas precisam ser criadas.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarTabelas();
