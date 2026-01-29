// Seed de usuário admin para Nexus_B2b
// Uso: npm run seed:admin (ou node scripts/seed_admin.js)

try { require('dotenv').config(); } catch (e) { /* dotenv opcional */ }

const bcrypt = require('bcryptjs');
const mysqlPool = require('../src/config/db.mysql');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

(async () => {
  let conn;
  try {
    console.log('ENV MYSQL_DATABASE =', process.env.MYSQL_DATABASE);
    conn = await mysqlPool.getConnection();
    const [dbinfo] = await conn.query('SELECT DATABASE() as db');
    console.log('Conectado ao banco:', dbinfo[0]?.db);
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [ADMIN_EMAIL]);
    if (rows.length > 0) {
      console.log(`Usuário admin já existe: ${ADMIN_EMAIL} (id=${rows[0].id})`);
      await conn.rollback();
      return;
    }

    const senhaHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    const [result] = await conn.query(
      'INSERT INTO usuarios (nome, email, senha, perfil, ativo) VALUES (?, ?, ?, ?, 1)',
      ['Administrador', ADMIN_EMAIL, senhaHash, 'gestor']
    );

    const adminId = result.insertId;
    console.log(`Admin criado com sucesso: ${ADMIN_EMAIL} (id=${adminId})`);

    await conn.commit();
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error('Falha ao criar usuário admin:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
    // encerra pool para evitar processo pendurado
    try { await mysqlPool.end(); } catch (_) {}
  }
})();
