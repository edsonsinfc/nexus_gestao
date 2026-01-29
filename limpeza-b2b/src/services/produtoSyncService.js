const { getProdutosOracle } = require('../repositories/oracleProdutos');
const pool = require('../config/db.mysql');

class ProdutoSyncService {
  async sincronizarProdutos() {
    try {
      console.log('🔄 Iniciando sincronização de produtos...');
      
      // Buscar produtos do Oracle
      const produtosOracle = await getProdutosOracle({});
      console.log(`📦 Encontrados ${produtosOracle.length} produtos no Oracle`);
      
      const pool = await getConnection();
      let inseridos = 0;
      let atualizados = 0;
      
      for (const produto of produtosOracle) {
        try {
          // Verificar se produto já existe
          const [existing] = await pool.execute(
            'SELECT id FROM produtos WHERE codigo = ?',
            [produto.codprod]
          );
          
          const produtoData = {
            codigo: produto.codprod,
            nome: produto.descricao?.substring(0, 200) || 'Produto sem nome',
            descricao: produto.descricao || '',
            categoria: produto.categoria || 'Geral',
            fornecedor: produto.fornecedor || '',
            preco: 0, // Preço será definido pelo gestor
            ativo: 1
          };
          
          if (existing.length > 0) {
            // Atualizar produto existente
            await pool.execute(`
              UPDATE produtos 
              SET nome = ?, descricao = ?, categoria = ?, fornecedor = ?, updated_at = NOW()
              WHERE codigo = ?
            `, [
              produtoData.nome,
              produtoData.descricao,
              produtoData.categoria,
              produtoData.fornecedor,
              produtoData.codigo
            ]);
            atualizados++;
          } else {
            // Inserir novo produto
            await pool.execute(`
              INSERT INTO produtos (codigo, nome, descricao, categoria, fornecedor, preco, ativo)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              produtoData.codigo,
              produtoData.nome,
              produtoData.descricao,
              produtoData.categoria,
              produtoData.fornecedor,
              produtoData.preco,
              produtoData.ativo
            ]);
            inseridos++;
          }
        } catch (error) {
          console.error(`❌ Erro ao processar produto ${produto.codprod}:`, error.message);
        }
      }
      
      console.log(`✅ Sincronização concluída: ${inseridos} inseridos, ${atualizados} atualizados`);
      return { inseridos, atualizados, total: produtosOracle.length };
      
    } catch (error) {
      console.error('❌ Erro na sincronização de produtos:', error);
      throw error;
    }
  }
  
  async buscarProdutos({ search, categoria, page = 1, pageSize = 20, ativo = true }) {
    try {
      const pool = await getConnection();
      
      // Garantir que page e pageSize sejam números
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * pageSizeNum;
      
      console.log('🔍 buscarProdutos - Parâmetros:', { page, pageSize, pageNum, pageSizeNum, offset, ativo, search, categoria });
      
      let whereClause = 'WHERE ativo = ?';
      let params = [ativo ? 1 : 0];
      
      if (search) {
        whereClause += ' AND (codprod LIKE ? OR descricao LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (categoria) {
        whereClause += ' AND categoria = ?';
        params.push(categoria);
      }
      
      console.log('🔍 SQL params:', params, 'LIMIT:', pageSizeNum, 'OFFSET:', offset);
      
      // Buscar produtos com nova estrutura
      // Nota: LIMIT e OFFSET não podem usar placeholders no MySQL, precisam ser interpolados
      const [produtos] = await pool.execute(`
        SELECT 
          id, codprod, descricao, unidade, multiplos, 
          estoque, preco, ncm, categoria, foto, observacoes,
          created_at, updated_at
        FROM produtos 
        ${whereClause}
        ORDER BY descricao
        LIMIT ${pageSizeNum} OFFSET ${offset}
      `, params);
      
      console.log(`✅ Encontrados ${produtos.length} produtos`);
      
      // Contar total
      const [countResult] = await pool.execute(`
        SELECT COUNT(*) as total 
        FROM produtos 
        ${whereClause}
      `, params);
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / pageSizeNum);
      
      return {
        produtos,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      throw error;
    }
  }
  
  async buscarCategorias() {
    try {
      const pool = await getConnection();
      const [categorias] = await pool.execute(`
        SELECT DISTINCT categoria 
        FROM produtos 
        WHERE ativo = 1 AND categoria IS NOT NULL AND categoria != ''
        ORDER BY categoria
      `);
      
      return categorias.map(c => c.categoria);
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      throw error;
    }
  }
  
  async atualizarProduto(id, dados) {
    try {
      const pool = await getConnection();
      const { 
        codprod, descricao, unidade, multiplos, 
        estoque, preco, ncm, categoria, foto, observacoes 
      } = dados;
      
      await pool.execute(`
        UPDATE produtos 
        SET codprod = ?, descricao = ?, unidade = ?, multiplos = ?, 
            estoque = ?, preco = ?, ncm = ?, categoria = ?, 
            foto = ?, observacoes = ?, updated_at = NOW()
        WHERE id = ?
      `, [codprod, descricao, unidade, multiplos, estoque, preco, ncm, categoria, foto, observacoes, id]);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao atualizar produto:', error);
      throw error;
    }
  }
  
  async criarProduto(dados) {
    try {
      console.log('🔧 Service criarProduto recebeu:', dados);
      
      const pool = await getConnection();
      const { 
        codprod, descricao, unidade = 'UN', multiplos = 1, 
        estoque = 0, preco = 0, ncm, categoria, foto, observacoes 
      } = dados;
      
      console.log('🔧 Dados processados:', {
        codprod, descricao, unidade, multiplos, 
        estoque, preco, ncm, categoria, foto, observacoes
      });
      
      const [result] = await pool.execute(`
        INSERT INTO produtos 
        (codprod, descricao, unidade, multiplos, estoque, preco, ncm, categoria, foto, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [codprod, descricao, unidade, multiplos, estoque, preco, ncm, categoria, foto, observacoes]);
      
      console.log('✅ Produto inserido no banco com ID:', result.insertId);
      
      return { success: true, id: result.insertId };
    } catch (error) {
      console.error('❌ Erro detalhado no service criarProduto:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }
  
  async excluirProduto(id) {
    try {
      const pool = await getConnection();
      
      // Soft delete - apenas marca como inativo
      await pool.execute(`
        UPDATE produtos 
        SET ativo = false, updated_at = NOW()
        WHERE id = ?
      `, [id]);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao excluir produto:', error);
      throw error;
    }
  }
  
  async obterProduto(id) {
    try {
      const pool = await getConnection();
      
      const [produtos] = await pool.execute(`
        SELECT 
          id, codprod, descricao, unidade, multiplos, 
          estoque, preco, ncm, categoria, foto, observacoes,
          ativo, created_at, updated_at
        FROM produtos 
        WHERE id = ?
      `, [id]);
      
      return produtos[0] || null;
    } catch (error) {
      console.error('❌ Erro ao obter produto:', error);
      throw error;
    }
  }
}

module.exports = new ProdutoSyncService();