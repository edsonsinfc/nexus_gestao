const pool = require('../db');

class ConfiguracoesFinanceirasController {
  // Listar todas as configurações de mapeamento
  async listar(req, res) {
    try {
      const [configs] = await pool.query(`
        SELECT 
          c.*,
          cat.codigo as categoria_codigo,
          cat.nome as categoria_nome,
          cat.tipo as categoria_tipo
        FROM configuracoes_operacoes_financeiras c
        LEFT JOIN categorias_financeiras cat ON c.categoria_id = cat.id
        ORDER BY c.grupo, c.ordem
      `);
      
      res.json({ configuracoes: configs });
    } catch (error) {
      console.error('Erro ao listar configurações:', error);
      res.status(500).json({ error: 'Erro ao listar configurações' });
    }
  }

  // Atualizar configuração
  async atualizar(req, res) {
    try {
      const { operacao, categoria_id } = req.body;
      
      if (!operacao) {
        return res.status(400).json({ error: 'Operação é obrigatória' });
      }

      // Verificar se configuração existe
      const [existe] = await pool.query(
        'SELECT id FROM configuracoes_operacoes_financeiras WHERE operacao = ?',
        [operacao]
      );

      if (existe.length > 0) {
        // Atualizar
        await pool.query(
          'UPDATE configuracoes_operacoes_financeiras SET categoria_id = ? WHERE operacao = ?',
          [categoria_id || null, operacao]
        );
      } else {
        // Inserir
        await pool.query(
          'INSERT INTO configuracoes_operacoes_financeiras (operacao, categoria_id) VALUES (?, ?)',
          [operacao, categoria_id || null]
        );
      }

      res.json({ message: 'Configuração atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
  }

  // Buscar categoria por operação
  async buscarPorOperacao(req, res) {
    try {
      const { operacao } = req.params;
      
      const [configs] = await pool.query(
        `SELECT 
          c.*,
          cat.codigo as categoria_codigo,
          cat.nome as categoria_nome,
          cat.tipo as categoria_tipo
        FROM configuracoes_operacoes_financeiras c
        LEFT JOIN categorias_financeiras cat ON c.categoria_id = cat.id
        WHERE c.operacao = ?`,
        [operacao]
      );

      if (configs.length === 0) {
        return res.json({ configuracao: null });
      }

      res.json({ configuracao: configs[0] });
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
  }

  // Inicializar configurações padrão
  async inicializar(req, res) {
    try {
      const configsPadrao = [
        // COMPRAS E ESTOQUE
        { operacao: 'COMPRA_MERCADORIA', descricao: 'Compra de Mercadorias para Revenda', grupo: 'COMPRAS', ordem: 1 },
        { operacao: 'COMPRA_NFE', descricao: 'Compra via NF-e de Entrada', grupo: 'COMPRAS', ordem: 2 },
        { operacao: 'COMPRA_MATERIA_PRIMA', descricao: 'Compra de Matéria-Prima', grupo: 'COMPRAS', ordem: 3 },
        { operacao: 'COMPRA_MATERIAL_USO', descricao: 'Compra de Material de Uso e Consumo', grupo: 'COMPRAS', ordem: 4 },
        { operacao: 'FRETE_COMPRA', descricao: 'Frete sobre Compras', grupo: 'COMPRAS', ordem: 5 },
        { operacao: 'FRETE_ENTRADA', descricao: 'Frete sobre NF-e de Entrada', grupo: 'COMPRAS', ordem: 6 },
        { operacao: 'DEVOLUCAO_COMPRA', descricao: 'Devolução de Compras', grupo: 'COMPRAS', ordem: 7 },
        
        // VENDAS
        { operacao: 'VENDA_PRODUTO', descricao: 'Venda de Produtos', grupo: 'VENDAS', ordem: 1 },
        { operacao: 'VENDA_SERVICO', descricao: 'Venda de Serviços', grupo: 'VENDAS', ordem: 2 },
        { operacao: 'VENDA_NFCE', descricao: 'Venda NFC-e (Varejo)', grupo: 'VENDAS', ordem: 3 },
        { operacao: 'DEVOLUCAO_VENDA', descricao: 'Devolução de Vendas', grupo: 'VENDAS', ordem: 4 },
        { operacao: 'DESCONTO_VENDA', descricao: 'Descontos Concedidos', grupo: 'VENDAS', ordem: 5 },
        
        // RECEBIMENTOS
        { operacao: 'RECEBIMENTO_CLIENTE', descricao: 'Recebimento de Clientes', grupo: 'RECEBIMENTOS', ordem: 1 },
        { operacao: 'RECEBIMENTO_CARTAO', descricao: 'Recebimento via Cartão de Crédito/Débito', grupo: 'RECEBIMENTOS', ordem: 2 },
        { operacao: 'RECEBIMENTO_PIX', descricao: 'Recebimento via PIX', grupo: 'RECEBIMENTOS', ordem: 3 },
        { operacao: 'RECEBIMENTO_BOLETO', descricao: 'Recebimento via Boleto', grupo: 'RECEBIMENTOS', ordem: 4 },
        { operacao: 'RECEBIMENTO_DINHEIRO', descricao: 'Recebimento em Dinheiro', grupo: 'RECEBIMENTOS', ordem: 5 },
        { operacao: 'RECEBIMENTO_CHEQUE', descricao: 'Recebimento em Cheque', grupo: 'RECEBIMENTOS', ordem: 6 },
        { operacao: 'ADIANTAMENTO_CLIENTE', descricao: 'Adiantamento de Clientes', grupo: 'RECEBIMENTOS', ordem: 7 },
        
        // PESSOAL
        { operacao: 'SALARIO', descricao: 'Salários de Funcionários', grupo: 'PESSOAL', ordem: 1 },
        { operacao: 'PROLABORE', descricao: 'Pró-Labore de Sócios', grupo: 'PESSOAL', ordem: 2 },
        { operacao: 'INSS', descricao: 'INSS (Empresa + Funcionários)', grupo: 'PESSOAL', ordem: 3 },
        { operacao: 'FGTS', descricao: 'FGTS', grupo: 'PESSOAL', ordem: 4 },
        { operacao: 'FERIAS', descricao: 'Férias', grupo: 'PESSOAL', ordem: 5 },
        { operacao: 'DECIMO_TERCEIRO', descricao: '13º Salário', grupo: 'PESSOAL', ordem: 6 },
        { operacao: 'VALE_TRANSPORTE', descricao: 'Vale Transporte', grupo: 'PESSOAL', ordem: 7 },
        { operacao: 'VALE_ALIMENTACAO', descricao: 'Vale Alimentação/Refeição', grupo: 'PESSOAL', ordem: 8 },
        { operacao: 'PLANO_SAUDE', descricao: 'Plano de Saúde', grupo: 'PESSOAL', ordem: 9 },
        { operacao: 'RESCISAO', descricao: 'Rescisão Contratual', grupo: 'PESSOAL', ordem: 10 },
        
        // DESPESAS ADMINISTRATIVAS
        { operacao: 'ALUGUEL', descricao: 'Aluguel', grupo: 'ADMINISTRATIVO', ordem: 1 },
        { operacao: 'ENERGIA', descricao: 'Energia Elétrica', grupo: 'ADMINISTRATIVO', ordem: 2 },
        { operacao: 'AGUA', descricao: 'Água', grupo: 'ADMINISTRATIVO', ordem: 3 },
        { operacao: 'TELEFONE', descricao: 'Telefone/Internet', grupo: 'ADMINISTRATIVO', ordem: 4 },
        { operacao: 'MATERIAL_ESCRITORIO', descricao: 'Material de Escritório', grupo: 'ADMINISTRATIVO', ordem: 5 },
        { operacao: 'MATERIAL_LIMPEZA', descricao: 'Material de Limpeza', grupo: 'ADMINISTRATIVO', ordem: 6 },
        { operacao: 'MANUTENCAO', descricao: 'Manutenção e Reparos', grupo: 'ADMINISTRATIVO', ordem: 7 },
        { operacao: 'SEGURO', descricao: 'Seguros', grupo: 'ADMINISTRATIVO', ordem: 8 },
        { operacao: 'IPTU', descricao: 'IPTU', grupo: 'ADMINISTRATIVO', ordem: 9 },
        { operacao: 'CONDOMINIO', descricao: 'Condomínio', grupo: 'ADMINISTRATIVO', ordem: 10 },
        
        // DESPESAS COMERCIAIS
        { operacao: 'COMISSAO_VENDA', descricao: 'Comissões de Vendas', grupo: 'COMERCIAL', ordem: 1 },
        { operacao: 'PROPAGANDA', descricao: 'Propaganda e Publicidade', grupo: 'COMERCIAL', ordem: 2 },
        { operacao: 'MARKETING', descricao: 'Marketing Digital', grupo: 'COMERCIAL', ordem: 3 },
        { operacao: 'FRETE_VENDA', descricao: 'Frete sobre Vendas', grupo: 'COMERCIAL', ordem: 4 },
        { operacao: 'EMBALAGEM', descricao: 'Embalagens', grupo: 'COMERCIAL', ordem: 5 },
        
        // VEÍCULOS
        { operacao: 'COMBUSTIVEL', descricao: 'Combustível', grupo: 'VEICULOS', ordem: 1 },
        { operacao: 'MANUTENCAO_VEICULO', descricao: 'Manutenção de Veículos', grupo: 'VEICULOS', ordem: 2 },
        { operacao: 'IPVA', descricao: 'IPVA', grupo: 'VEICULOS', ordem: 3 },
        { operacao: 'SEGURO_VEICULO', descricao: 'Seguro de Veículos', grupo: 'VEICULOS', ordem: 4 },
        { operacao: 'PEDAGIO', descricao: 'Pedágio', grupo: 'VEICULOS', ordem: 5 },
        
        // IMPOSTOS
        { operacao: 'SIMPLES_NACIONAL', descricao: 'Simples Nacional (DAS)', grupo: 'IMPOSTOS', ordem: 1 },
        { operacao: 'ICMS', descricao: 'ICMS', grupo: 'IMPOSTOS', ordem: 2 },
        { operacao: 'ISS', descricao: 'ISS', grupo: 'IMPOSTOS', ordem: 3 },
        { operacao: 'PIS', descricao: 'PIS', grupo: 'IMPOSTOS', ordem: 4 },
        { operacao: 'COFINS', descricao: 'COFINS', grupo: 'IMPOSTOS', ordem: 5 },
        { operacao: 'IPI', descricao: 'IPI', grupo: 'IMPOSTOS', ordem: 6 },
        { operacao: 'IRPJ', descricao: 'IRPJ', grupo: 'IMPOSTOS', ordem: 7 },
        { operacao: 'CSLL', descricao: 'CSLL', grupo: 'IMPOSTOS', ordem: 8 },
        
        // SERVIÇOS PROFISSIONAIS
        { operacao: 'CONTADOR', descricao: 'Serviços Contábeis', grupo: 'SERVICOS', ordem: 1 },
        { operacao: 'ADVOGADO', descricao: 'Serviços Advocatícios', grupo: 'SERVICOS', ordem: 2 },
        { operacao: 'CONSULTORIA', descricao: 'Consultoria', grupo: 'SERVICOS', ordem: 3 },
        { operacao: 'SISTEMA', descricao: 'Sistema/Software', grupo: 'SERVICOS', ordem: 4 },
        { operacao: 'CERTIFICADO_DIGITAL', descricao: 'Certificado Digital', grupo: 'SERVICOS', ordem: 5 },
        
        // FINANCEIRO
        { operacao: 'JUROS_RECEBIDOS', descricao: 'Juros Recebidos (Receita)', grupo: 'FINANCEIRO', ordem: 1 },
        { operacao: 'JUROS_PAGOS', descricao: 'Juros Pagos (Despesa)', grupo: 'FINANCEIRO', ordem: 2 },
        { operacao: 'MULTA_RECEBIDA', descricao: 'Multas Recebidas (Receita)', grupo: 'FINANCEIRO', ordem: 3 },
        { operacao: 'MULTA_PAGA', descricao: 'Multas Pagas (Despesa)', grupo: 'FINANCEIRO', ordem: 4 },
        { operacao: 'DESCONTO_RECEBIDO', descricao: 'Descontos Obtidos (Receita)', grupo: 'FINANCEIRO', ordem: 5 },
        { operacao: 'DESCONTO_CONCEDIDO', descricao: 'Descontos Concedidos (Despesa)', grupo: 'FINANCEIRO', ordem: 6 },
        { operacao: 'TARIFA_BANCARIA', descricao: 'Tarifas Bancárias (Despesa)', grupo: 'FINANCEIRO', ordem: 7 },
        { operacao: 'IOF', descricao: 'IOF (Despesa)', grupo: 'FINANCEIRO', ordem: 8 },
        { operacao: 'RENDIMENTO_APLICACAO', descricao: 'Rendimentos de Aplicações (Receita)', grupo: 'FINANCEIRO', ordem: 9 },
        { operacao: 'ESTORNO_RECEBIDO', descricao: 'Estornos Recebidos (Receita)', grupo: 'FINANCEIRO', ordem: 10 },
        { operacao: 'ESTORNO_PAGO', descricao: 'Estornos Pagos (Despesa)', grupo: 'FINANCEIRO', ordem: 11 },
        
        // OUTROS
        { operacao: 'OUTRAS_RECEITAS', descricao: 'Outras Receitas', grupo: 'OUTROS', ordem: 1 },
        { operacao: 'OUTRAS_DESPESAS', descricao: 'Outras Despesas', grupo: 'OUTROS', ordem: 2 }
      ];

      for (const config of configsPadrao) {
        await pool.query(
          `INSERT INTO configuracoes_operacoes_financeiras 
           (operacao, descricao, grupo, ordem)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           descricao = VALUES(descricao),
           grupo = VALUES(grupo),
           ordem = VALUES(ordem)`,
          [config.operacao, config.descricao, config.grupo, config.ordem]
        );
      }

      res.json({ 
        message: 'Configurações inicializadas com sucesso',
        total: configsPadrao.length 
      });
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
      res.status(500).json({ error: 'Erro ao inicializar configurações' });
    }
  }

  // Listar contas bancárias
  async listarContasBancarias(req, res) {
    try {
      const [contas] = await pool.query(`
        SELECT 
          id,
          banco_codigo,
          banco_nome,
          agencia,
          agencia_digito,
          conta,
          conta_digito,
          tipo_conta,
          saldo_inicial,
          saldo_atual,
          data_saldo_inicial,
          ativa,
          observacoes,
          created_at,
          updated_at
        FROM contas_bancarias
        WHERE ativa = TRUE
        ORDER BY banco_nome, agencia, conta
      `);
      
      res.json({ contas });
    } catch (error) {
      console.error('Erro ao listar contas bancárias:', error);
      res.status(500).json({ error: 'Erro ao listar contas bancárias' });
    }
  }
}

module.exports = new ConfiguracoesFinanceirasController();
