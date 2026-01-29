const pool = require('../db');

/**
 * Busca a categoria configurada para uma operação específica
 * @param {string} operacao - Nome da operação (ex: 'COMPRA_MERCADORIA', 'SALARIO')
 * @returns {number|null} - ID da categoria ou null se não configurada
 */
async function buscarCategoriaOperacao(operacao) {
  try {
    const [configs] = await pool.query(
      'SELECT categoria_id FROM configuracoes_operacoes_financeiras WHERE operacao = ?',
      [operacao]
    );
    
    if (configs.length > 0 && configs[0].categoria_id) {
      return configs[0].categoria_id;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar categoria da operação:', error);
    return null;
  }
}

/**
 * Cria um lançamento financeiro automaticamente baseado na operação
 * @param {object} dados - Dados do lançamento
 * @param {string} dados.operacao - Tipo de operação
 * @param {string} dados.descricao - Descrição do lançamento
 * @param {number} dados.valor - Valor
 * @param {string} dados.data_lancamento - Data do lançamento
 * @param {string} dados.tipo - RECEITA, DESPESA ou TRANSFERENCIA
 * @param {number} dados.pessoa_id - ID da pessoa (opcional)
 * @param {string} dados.pessoa_tipo - CLIENTE, FORNECEDOR, OUTRO (opcional)
 * @param {number} dados.usuario_id - ID do usuário
 * @param {object} dados.referencias - Objeto com referências (venda_id, nfce_id, etc)
 * @returns {number|null} - ID do lançamento criado ou null
 */
async function criarLancamentoAutomatico(dados) {
  try {
    // Buscar categoria configurada
    const categoriaId = await buscarCategoriaOperacao(dados.operacao);
    
    if (!categoriaId) {
      console.log(`⚠️ Categoria não configurada para operação: ${dados.operacao}`);
      return null;
    }
    
    // Calcular data de vencimento (30 dias após lançamento se for despesa)
    let dataVencimento = null;
    if (dados.tipo === 'DESPESA' && dados.data_lancamento) {
      const dataLanc = new Date(dados.data_lancamento);
      dataLanc.setDate(dataLanc.getDate() + 30);
      dataVencimento = dataLanc.toISOString().split('T')[0];
    }
    
    // Inserir lançamento
    const [result] = await pool.query(`
      INSERT INTO lancamentos_financeiros (
        tipo, categoria_id, descricao, valor,
        data_lancamento, data_vencimento, status,
        pessoa_id, pessoa_tipo, observacoes, usuario_id,
        venda_id, nfce_id, nfe_id, pedido_compra_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dados.tipo,
      categoriaId,
      dados.descricao,
      dados.valor,
      dados.data_lancamento,
      dataVencimento,
      'PENDENTE',
      dados.pessoa_id || null,
      dados.pessoa_tipo || null,
      dados.observacoes || `Gerado automaticamente pela operação: ${dados.operacao}`,
      dados.usuario_id,
      dados.referencias?.venda_id || null,
      dados.referencias?.nfce_id || null,
      dados.referencias?.nfe_id || null,
      dados.referencias?.pedido_compra_id || null
    ]);
    
    console.log(`✅ Lançamento financeiro criado automaticamente - ID: ${result.insertId}`);
    return result.insertId;
    
  } catch (error) {
    console.error('Erro ao criar lançamento automático:', error);
    return null;
  }
}

module.exports = {
  buscarCategoriaOperacao,
  criarLancamentoAutomatico
};
