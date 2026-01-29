const mysql = require('mysql2/promise');
require('dotenv').config();

async function executeMigrationStepByStep() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nexus_dev'
    });

    try {
        console.log('🗑️  Limpando dados antigos se existirem...');
        
        // Primeiro, limpar tabelas se existirem dados duplicados
        await connection.query('DELETE FROM categorias_financeiras WHERE id > 0');
        
        console.log('📊 Inserindo categorias financeiras...');
        
        // RECEITAS
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
            ('Receita de Vendas', 'RECEITA', 1, 'RECEITA_BRUTA', '3.1.1'),
            ('Receita de Serviços', 'RECEITA', 1, 'RECEITA_BRUTA', '3.1.2'),
            ('Devoluções e Cancelamentos', 'RECEITA', 1, 'DEDUCOES', '3.2.1'),
            ('Descontos Concedidos', 'RECEITA', 1, 'DEDUCOES', '3.2.2'),
            ('Receitas Financeiras', 'RECEITA', 1, 'RECEITA_FINANCEIRA', '3.3.1'),
            ('Outras Receitas', 'RECEITA', 1, 'OUTRAS', '3.9.1')
        `);

        // CUSTOS
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
            ('Custo de Mercadorias Vendidas (CMV)', 'CUSTO', 1, 'CMV', '4.1.1'),
            ('Custo de Materiais', 'CUSTO', 1, 'CMV', '4.1.2'),
            ('Custo de Serviços', 'CUSTO', 1, 'CMV', '4.1.3')
        `);

        // DESPESAS OPERACIONAIS - Nível 1
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
            ('Despesas com Pessoal', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.1'),
            ('Despesas Administrativas', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.2'),
            ('Despesas Comerciais', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.3'),
            ('Despesas com Veículos', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.4'),
            ('Impostos e Taxas', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.5')
        `);

        // DESPESAS OPERACIONAIS - Nível 2 (subcategorias)
        const [pessoal] = await connection.query('SELECT id FROM categorias_financeiras WHERE nome = "Despesas com Pessoal" LIMIT 1');
        const pessoalId = pessoal[0].id;
        
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo, categoria_pai_id) VALUES
            ('Salários', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.1.1', ${pessoalId}),
            ('Encargos Sociais', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.1.2', ${pessoalId}),
            ('Benefícios', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.1.3', ${pessoalId})
        `);

        const [admin] = await connection.query('SELECT id FROM categorias_financeiras WHERE nome = "Despesas Administrativas" LIMIT 1');
        const adminId = admin[0].id;
        
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo, categoria_pai_id) VALUES
            ('Aluguel', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.2.1', ${adminId}),
            ('Água, Luz e Telefone', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.2.2', ${adminId}),
            ('Material de Escritório', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.2.3', ${adminId})
        `);

        const [comercial] = await connection.query('SELECT id FROM categorias_financeiras WHERE nome = "Despesas Comerciais" LIMIT 1');
        const comercialId = comercial[0].id;
        
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo, categoria_pai_id) VALUES
            ('Marketing e Publicidade', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.3.1', ${comercialId}),
            ('Comissões de Vendas', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.3.2', ${comercialId})
        `);

        const [veiculos] = await connection.query('SELECT id FROM categorias_financeiras WHERE nome = "Despesas com Veículos" LIMIT 1');
        const veiculosId = veiculos[0].id;
        
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo, categoria_pai_id) VALUES
            ('Combustível', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.4.1', ${veiculosId}),
            ('Manutenção', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.4.2', ${veiculosId})
        `);

        // DESPESAS FINANCEIRAS
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
            ('Juros Pagos', 'DESPESA', 1, 'DESPESA_FINANCEIRA', '6.1.1'),
            ('Tarifas Bancárias', 'DESPESA', 1, 'DESPESA_FINANCEIRA', '6.1.2'),
            ('Outras Despesas Financeiras', 'DESPESA', 1, 'DESPESA_FINANCEIRA', '6.1.3')
        `);

        // OUTRAS DESPESAS
        await connection.query(`
            INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
            ('Despesas Não Operacionais', 'DESPESA', 1, 'OUTRAS', '9.1.1')
        `);

        const [count] = await connection.query('SELECT COUNT(*) as total FROM categorias_financeiras');
        
        console.log(`✅ Migration concluída com sucesso!`);
        console.log(`📊 Total de categorias criadas: ${count[0].total}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

executeMigrationStepByStep()
    .then(() => {
        console.log('\n🎉 Processo finalizado!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
