require('dotenv').config();
const mysql = require('mysql2/promise');

async function testarCategorias() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_gestao'
  });

  try {
    console.log('🔍 Testando categorias financeiras...\n');

    // Verificar se a tabela existe
    const [tables] = await connection.query("SHOW TABLES LIKE 'categorias_financeiras'");
    
    if (tables.length === 0) {
      console.log('❌ Tabela categorias_financeiras não existe!');
      return;
    }

    console.log('✅ Tabela categorias_financeiras existe');

    // Buscar todas as categorias
    const [categorias] = await connection.query('SELECT * FROM categorias_financeiras');
    
    console.log(`\n📊 Total de categorias: ${categorias.length}\n`);

    if (categorias.length === 0) {
      console.log('⚠️  Nenhuma categoria encontrada. Inserindo categorias padrão...\n');

      // Inserir categorias padrão
      const categoriasDefault = [
        { codigo: '1.01', nome: 'Vendas de Mercadorias', tipo: 'RECEITA', dre_grupo: 'RECEITA_BRUTA' },
        { codigo: '1.02', nome: 'Vendas de Serviços', tipo: 'RECEITA', dre_grupo: 'RECEITA_BRUTA' },
        { codigo: '1.03', nome: 'Receitas Financeiras', tipo: 'RECEITA', dre_grupo: 'RECEITA_FINANCEIRA' },
        { codigo: '2.01', nome: 'Compra de Mercadorias', tipo: 'DESPESA', dre_grupo: 'CMV' },
        { codigo: '2.02', nome: 'Energia Elétrica', tipo: 'DESPESA', dre_grupo: 'DESPESA_OPERACIONAL' },
        { codigo: '2.03', nome: 'Aluguel', tipo: 'DESPESA', dre_grupo: 'DESPESA_OPERACIONAL' },
        { codigo: '2.04', nome: 'Salários e Encargos', tipo: 'DESPESA', dre_grupo: 'DESPESA_OPERACIONAL' },
        { codigo: '2.05', nome: 'Fornecedores', tipo: 'DESPESA', dre_grupo: 'CMV' },
        { codigo: '2.06', nome: 'Impostos e Taxas', tipo: 'DESPESA', dre_grupo: 'DEDUCOES' },
        { codigo: '2.07', nome: 'Despesas Bancárias', tipo: 'DESPESA', dre_grupo: 'DESPESA_FINANCEIRA' }
      ];

      for (const cat of categoriasDefault) {
        await connection.query(
          'INSERT INTO categorias_financeiras (codigo, nome, tipo, dre_grupo, ativa) VALUES (?, ?, ?, ?, 1)',
          [cat.codigo, cat.nome, cat.tipo, cat.dre_grupo]
        );
        console.log(`✅ Criada: ${cat.codigo} - ${cat.nome} (${cat.tipo})`);
      }

      console.log('\n✅ Categorias padrão criadas com sucesso!');
      
      // Buscar novamente
      const [novasCategorias] = await connection.query('SELECT * FROM categorias_financeiras');
      console.log(`\n📊 Total de categorias agora: ${novasCategorias.length}\n`);
    } else {
      console.log('Categorias existentes:\n');
      categorias.forEach(cat => {
        console.log(`  ${cat.codigo} - ${cat.nome} (${cat.tipo})`);
      });
    }

    // Testar filtro por tipo
    const [despesas] = await connection.query('SELECT * FROM categorias_financeiras WHERE tipo = "DESPESA"');
    const [receitas] = await connection.query('SELECT * FROM categorias_financeiras WHERE tipo = "RECEITA"');
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Receitas: ${receitas.length}`);
    console.log(`   Despesas: ${despesas.length}`);
    console.log(`   Total: ${categorias.length || (despesas.length + receitas.length)}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

testarCategorias();
