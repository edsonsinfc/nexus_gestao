const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nexus_dev',
        multipleStatements: true
    });

    try {
        console.log('📁 Lendo arquivo de migration...');
        const sqlFile = path.join(__dirname, 'migrations', '20251111_create_financeiro_fiscal.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('🚀 Executando migration...');
        await connection.query(sql);

        console.log('✅ Migration executada com sucesso!');
        console.log('📊 Tabelas criadas:');
        console.log('   - contas_bancarias');
        console.log('   - categorias_financeiras');
        console.log('   - lancamentos_financeiros');
        console.log('   - extratos_bancarios');
        console.log('   - conciliacoes_bancarias');
        console.log('   - conciliacoes_itens');
        console.log('   - xml_envios_contador');
        console.log('   - xml_envios_detalhes');
        console.log('   - estatisticas_fiscais_cache');
        console.log('   - configuracoes (com 26 categorias padrão)');
        
    } catch (error) {
        console.error('❌ Erro ao executar migration:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigration()
    .then(() => {
        console.log('\n🎉 Processo finalizado com sucesso!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Erro no processo:', error);
        process.exit(1);
    });
