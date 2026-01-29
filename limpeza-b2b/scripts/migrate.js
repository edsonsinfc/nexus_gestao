require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const pool = require('../src/config/db.mysql');

async function ensureDatabase() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const dbName = process.env.MYSQL_DATABASE || 'Nexus_B2b';

  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    console.log(`📦 Database garantido: ${dbName}`);
  } finally {
    await conn.end();
  }
}

async function run() {
  try {
    await ensureDatabase();
    const dir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.sql'))
      .sort();
    for (const file of files) {
      let sql = fs.readFileSync(path.join(dir, file), 'utf8');
      sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
      sql = sql
        .split(/\r?\n/)
        .filter(line => !/^\s*--/.test(line))
        .join('\n');
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
      console.log(`▶️  Aplicando ${file} (${statements.length} statements)`);
      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (e) {
          if (isIgnorableMigrationError(e)) {
            console.warn('⚠️  Ignorado:', e.code || e.errno, '-', (e.sqlMessage || e.message));
            continue;
          }
          throw e;
        }
      }
    }
    console.log('✅ Migrações MySQL concluídas');
    process.exit(0);
  } catch (e) {
    console.error('❌ Erro migrações:', e);
    process.exit(1);
  }
}

function isIgnorableMigrationError(e) {
  const code = e && e.code;
  const msg = (e && (e.sqlMessage || e.message) || '').toLowerCase();
  return (
    code === 'ER_DUP_FIELDNAME' || // 1060 duplicate column
    code === 'ER_DUP_KEYNAME' ||   // 1061 duplicate index
    code === 'ER_FK_DUP_NAME'  ||  // 1826 duplicate fk name
    msg.includes('duplicate column') ||
    msg.includes('already exists') ||
    msg.includes('duplicate key') ||
    msg.includes('errno: 150') // fk exists or referenced
  );
}

run();
