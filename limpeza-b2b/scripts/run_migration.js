const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'Nexus_B2b'
    });

    const sql = fs.readFileSync('./scripts/sql/20251029_create_produtos_table.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await conn.execute(stmt);
          console.log(`✅ Executado: ${stmt.substring(0, 50)}...`);
        } catch (err) {
          if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠️  Já existe: ${stmt.substring(0, 50)}...`);
          } else {
            throw err;
          }
        }
      }
    }
    
    console.log('✅ Migração de produtos concluída!');
    await conn.end();
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

runMigration();