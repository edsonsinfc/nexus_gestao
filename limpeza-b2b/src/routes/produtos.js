const express = require('express');
const { getProdutosOracle } = require('../repositories/oracleProdutos');
const produtoSyncService = require('../services/produtoSyncService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Listar produtos do catálogo local (para equipe)
router.get('/', async (req, res) => {
  try {
    const { search, categoria, page = 1, pageSize = 20 } = req.query;
    const userProfile = req.user?.perfil;
    
    const result = await produtoSyncService.buscarProdutos({
      search,
      categoria,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      ativo: true
    });
    
    // Se for usuário equipe, remover preços
    if (userProfile === 'equipe') {
      result.produtos = result.produtos.map(produto => ({
        ...produto,
        preco: undefined // Remove preço para usuários equipe
      }));
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao consultar catálogo' });
  }
});

// Buscar categorias disponíveis
router.get('/categorias', async (req, res) => {
  try {
    const categorias = await produtoSyncService.buscarCategorias();
    res.json({ categorias });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Sincronizar produtos do Oracle (apenas gestor)
router.post('/sync', async (req, res) => {
  try {
    if (req.user?.perfil !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const result = await produtoSyncService.sincronizarProdutos();
    res.json({
      message: 'Sincronização concluída',
      ...result
    });
  } catch (error) {
    if (error.code === 'ORACLE_CONFIG_MISSING') {
      return res.status(503).json({ error: 'Oracle não configurado' });
    }
    console.error('Erro na sincronização:', error);
    res.status(500).json({ error: 'Erro na sincronização' });
  }
});

// Obter produto específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await produtoSyncService.obterProduto(id);
    
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Se for usuário equipe, remover preço
    if (req.user?.perfil === 'equipe') {
      produto.preco = undefined;
    }
    
    res.json(produto);
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({ error: 'Erro ao obter produto' });
  }
});

// Criar novo produto (apenas gestor)
router.post('/', async (req, res) => {
  try {
    if (req.user?.perfil !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    console.log('📦 Dados recebidos para criar produto:', req.body);
    
    // Validações básicas
    if (!req.body.codprod || !req.body.descricao) {
      return res.status(400).json({ 
        error: 'Código do produto e descrição são obrigatórios' 
      });
    }
    
    const result = await produtoSyncService.criarProduto(req.body);
    console.log('✅ Produto criado com sucesso:', result);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Erro detalhado ao criar produto:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack.substring(0, 500)
    });
    
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Código do produto já existe' });
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      res.status(400).json({ error: 'Dados muito longos para os campos' });
    } else {
      res.status(500).json({ 
        error: `Erro ao criar produto: ${error.message}`,
        details: error.sqlMessage || 'Erro interno do servidor'
      });
    }
  }
});

// Atualizar produto (apenas gestor)
router.put('/:id', async (req, res) => {
  try {
    if (req.user?.perfil !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    const result = await produtoSyncService.atualizarProduto(id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Código do produto já existe' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }
});

// Excluir produto (apenas gestor)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.perfil !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    const result = await produtoSyncService.excluirProduto(id);
    res.json(result);
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// Buscar produtos do Oracle (legacy - manter compatibilidade)
router.get('/oracle', async (req, res) => {
  try {
    const { search, categoria, fornecedor, codigo } = req.query || {};
    const data = await getProdutosOracle({ search, categoria, fornecedor, codigo });
    res.json({ produtos: data });
  } catch (e) {
    if (e.code === 'ORACLE_CONFIG_MISSING') return res.status(503).json({ error: 'Oracle não configurado' });
    console.error('Erro produtos Oracle:', e);
    res.status(500).json({ error: 'Erro ao consultar catálogo' });
  }
});

module.exports = { router };
