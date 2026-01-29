require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const [columns] = await conn.query('DESCRIBE contas_bancarias');
  console.log('📊 Colunas da tabela contas_bancarias:\n');
  columns.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));

  await conn.end();
})();
