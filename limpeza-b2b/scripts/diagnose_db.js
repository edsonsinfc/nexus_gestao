require('dotenv').config();
const pool = require('../src/config/db.mysql');
(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [dbinfo] = await conn.query('SELECT DATABASE() as db');
    console.log('DB atual:', dbinfo[0]?.db);
    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tabelas:', tables.map(r => Object.values(r)[0]));
    const [createEquipes] = await conn.query('SHOW CREATE TABLE equipes');
    console.log('CREATE TABLE equipes:\n', createEquipes[0]['Create Table']);
    try {
      const [createPedidos] = await conn.query('SHOW CREATE TABLE pedidos');
      console.log('CREATE TABLE pedidos:\n', createPedidos[0]['Create Table']);
    } catch {}
    try {
      const [createUsuarios] = await conn.query('SHOW CREATE TABLE usuarios');
      console.log('CREATE TABLE usuarios:\n', createUsuarios[0]['Create Table']);
    } catch {}
  } catch (e) {
    console.error('Diagnóstico falhou:', e);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
    try { await pool.end(); } catch {}
  }
})();