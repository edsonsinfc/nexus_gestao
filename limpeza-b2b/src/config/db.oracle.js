let pool;

async function getOracleConnection() {
  let oracledb;
  try {
    // lazy require para não quebrar o app quando Oracle não está disponível
    oracledb = require('oracledb');
  } catch (e) {
    const err = new Error('Driver Oracle (oracledb) não instalado');
    err.code = 'ORACLE_DRIVER_MISSING';
    throw err;
  }

  if (!process.env.ORACLE_USER || !process.env.ORACLE_PASS || !process.env.ORACLE_CONNECT) {
    const e = new Error('Configuração Oracle ausente');
    e.code = 'ORACLE_CONFIG_MISSING';
    throw e;
  }
  if (!pool) {
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASS,
      connectString: process.env.ORACLE_CONNECT,
      poolMin: 0,
      poolMax: 4,
      poolIncrement: 1
    });
  }
  return pool.getConnection();
}

module.exports = { getOracleConnection };
