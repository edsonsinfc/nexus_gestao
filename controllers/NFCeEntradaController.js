// controllers/NFCeEntradaController.js
const db = require('../db');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');
const sefazService = require('../services/SefazService');

class NFCeEntradaController {
  
  // Listar NF-es de entrada
  async listar(req, res) {
    try {
      const { 
        status_entrada, 
        status_manifestacao,
        fornecedor_id,
        data_inicio,
        data_fim,
        page = 1,
        limit = 20 
      } = req.query;

      let sql = `
        SELECT 
          ne.*,
          f.razao_social as fornecedor_razao_social,
          f.nome_fantasia as fornecedor_nome_fantasia,
          u_download.nome as usuario_download_nome,
          u_manifestacao.nome as usuario_manifestacao_nome,
          u_importacao.nome as usuario_importacao_nome,
          (SELECT COUNT(*) FROM nfe_entrada_itens WHERE nfe_entrada_id = ne.id) as total_itens
        FROM nfe_entrada ne
        LEFT JOIN fornecedores f ON ne.fornecedor_id = f.id
        LEFT JOIN usuarios u_download ON ne.usuario_download_id = u_download.id
        LEFT JOIN usuarios u_manifestacao ON ne.usuario_manifestacao_id = u_manifestacao.id
        LEFT JOIN usuarios u_importacao ON ne.usuario_importacao_id = u_importacao.id
        WHERE 1=1
      `;

      const params = [];

      if (status_entrada) {
        sql += ' AND ne.status_entrada = ?';
        params.push(status_entrada);
      }

      if (status_manifestacao) {
        sql += ' AND ne.status_manifestacao = ?';
        params.push(status_manifestacao);
      }

      if (fornecedor_id) {
        sql += ' AND ne.fornecedor_id = ?';
        params.push(fornecedor_id);
      }

      if (data_inicio) {
        sql += ' AND DATE(ne.data_emissao) >= ?';
        params.push(data_inicio);
      }

      if (data_fim) {
        sql += ' AND DATE(ne.data_emissao) <= ?';
        params.push(data_fim);
      }

      sql += ' ORDER BY ne.data_emissao DESC';

      // Paginação
      const offset = (page - 1) * limit;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [notas] = await db.query(sql, params);

      // Contar total
      let sqlCount = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      sqlCount = sqlCount.replace(/LIMIT.*/, '');
      const [countResult] = await db.query(sqlCount, params.slice(0, -2));
      
      const total = countResult && countResult[0] && countResult[0].total ? countResult[0].total : 0;

      res.json({
        notas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar NF-es:', error);
      res.status(500).json({ error: 'Erro ao listar NF-es de entrada' });
    }
  }

  // Buscar NF-e por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const [notas] = await db.query(`
        SELECT 
          ne.*,
          f.*,
          f.id as fornecedor_id,
          f.razao_social as fornecedor_razao_social
        FROM nfe_entrada ne
        LEFT JOIN fornecedores f ON ne.fornecedor_id = f.id
        WHERE ne.id = ?
      `, [id]);

      if (notas.length === 0) {
        return res.status(404).json({ error: 'NF-e não encontrada' });
      }

      // Buscar itens
      const [itens] = await db.query(`
        SELECT 
          nei.*,
          p.descricao as produto_descricao_cadastro,
          p.estoque_atual
        FROM nfe_entrada_itens nei
        LEFT JOIN produtos p ON nei.produto_id = p.id
        WHERE nei.nfe_entrada_id = ?
        ORDER BY nei.numero_item
      `, [id]);

      // Buscar manifestações
      const [manifestacoes] = await db.query(`
        SELECT 
          m.*,
          u.nome as usuario_nome
        FROM manifestacoes_destinatario m
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.nfe_entrada_id = ?
        ORDER BY m.created_at DESC
      `, [id]);

      res.json({
        nota: notas[0],
        itens,
        manifestacoes
      });

    } catch (error) {
      console.error('Erro ao buscar NF-e:', error);
      res.status(500).json({ error: 'Erro ao buscar NF-e' });
    }
  }

  // Consultar NF-es na SEFAZ (a ser implementado com certificado)
  async consultarSEFAZ(req, res) {
    try {
      const { cnpj, data_inicio, data_fim } = req.body;

      // TODO: Implementar integração com API da SEFAZ
      // Requer certificado A1 configurado
      
      res.status(501).json({ 
        error: 'Funcionalidade requer certificado digital configurado',
        message: 'Configure o certificado A1 nas configurações fiscais'
      });

    } catch (error) {
      console.error('Erro ao consultar SEFAZ:', error);
      res.status(500).json({ error: 'Erro ao consultar SEFAZ' });
    }
  }

  // Upload manual de XML
  async uploadXML(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const xmlContent = await fs.readFile(req.file.path, 'utf-8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlContent);

      // Extrair dados do XML
      const nfe = result.nfeProc?.NFe?.[0]?.infNFe?.[0];
      if (!nfe) {
        return res.status(400).json({ error: 'XML inválido ou não é uma NF-e' });
      }

      const ide = nfe.ide[0];
      const emit = nfe.emit[0];
      const total = nfe.total[0].ICMSTot[0];
      const chaveAcesso = nfe.$?.Id?.replace('NFe', '');

      // Verificar se já existe
      const [existe] = await db.query(
        'SELECT id FROM nfe_entrada WHERE chave_acesso = ?',
        [chaveAcesso]
      );

      if (existe.length > 0) {
        return res.status(400).json({ error: 'NF-e já cadastrada no sistema' });
      }

      // Buscar fornecedor pelo CNPJ
      const cnpjEmitente = emit.CNPJ?.[0] || emit.CPF?.[0];
      const [fornecedores] = await db.query(
        'SELECT id FROM fornecedores WHERE cnpj = ?',
        [cnpjEmitente]
      );

      // Inserir NF-e
      const [resultNfe] = await db.query(`
        INSERT INTO nfe_entrada (
          chave_acesso, numero_nfe, serie,
          fornecedor_id, fornecedor_cnpj, fornecedor_nome,
          data_emissao, natureza_operacao,
          valor_produtos, valor_frete, valor_seguro, 
          valor_desconto, valor_outras_despesas,
          valor_ipi, valor_icms, valor_total,
          xml_completo, status_download,
          usuario_download_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BAIXADO', ?)
      `, [
        chaveAcesso,
        ide.nNF[0],
        ide.serie[0],
        fornecedores[0]?.id || null,
        cnpjEmitente,
        emit.xNome[0],
        ide.dhEmi[0],
        ide.natOp[0],
        parseFloat(total.vProd[0]),
        parseFloat(total.vFrete?.[0] || 0),
        parseFloat(total.vSeg?.[0] || 0),
        parseFloat(total.vDesc?.[0] || 0),
        parseFloat(total.vOutro?.[0] || 0),
        parseFloat(total.vIPI?.[0] || 0),
        parseFloat(total.vICMS?.[0] || 0),
        parseFloat(total.vNF[0]),
        xmlContent,
        req.userId
      ]);

      const nfeId = resultNfe.insertId;

      // Inserir itens
      const det = nfe.det || [];
      for (let i = 0; i < det.length; i++) {
        const item = det[i];
        const prod = item.prod[0];
        const imposto = item.imposto[0];

        // Tentar vincular produto pelo código ou GTIN
        const [produtos] = await db.query(
          'SELECT id FROM produtos WHERE codigo_principal = ? OR gtin = ? LIMIT 1',
          [prod.cProd[0], prod.cEAN?.[0] || null]
        );

        await db.query(`
          INSERT INTO nfe_entrada_itens (
            nfe_entrada_id, numero_item,
            produto_id, codigo_produto, gtin, descricao,
            ncm, cfop, unidade,
            quantidade, valor_unitario, valor_bruto, valor_total,
            icms_valor, icms_aliquota, ipi_valor, ipi_aliquota
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          nfeId,
          item.$.nItem,
          produtos[0]?.id || null,
          prod.cProd[0],
          prod.cEAN?.[0] || null,
          prod.xProd[0],
          prod.NCM?.[0] || null,
          prod.CFOP?.[0] || null,
          prod.uCom[0],
          parseFloat(prod.qCom[0]),
          parseFloat(prod.vUnCom[0]),
          parseFloat(prod.vProd[0]),
          parseFloat(prod.vProd[0]) - parseFloat(prod.vDesc?.[0] || 0),
          parseFloat(imposto.ICMS?.[0]?.ICMS00?.[0]?.vICMS?.[0] || 0),
          parseFloat(imposto.ICMS?.[0]?.ICMS00?.[0]?.pICMS?.[0] || 0),
          parseFloat(imposto.IPI?.[0]?.IPINT?.[0]?.vIPI?.[0] || 0),
          parseFloat(imposto.IPI?.[0]?.IPINT?.[0]?.pIPI?.[0] || 0)
        ]);
      }

      // 💰 CRIAR LANÇAMENTO FINANCEIRO AUTOMÁTICO
      console.log('💰 Criando lançamento financeiro para NF-e de entrada...');
      try {
        const valorTotal = parseFloat(total.vNF[0]);
        const lancamentoId = await criarLancamentoAutomatico({
          operacao: 'COMPRA_NFE',
          descricao: `Compra NF-e #${ide.nNF[0]} - ${emit.xNome[0]}`,
          valor: valorTotal,
          data_lancamento: ide.dhEmi[0].split('T')[0], // Data da emissão
          tipo: 'DESPESA',
          pessoa_id: fornecedores[0]?.id || null,
          pessoa_tipo: fornecedores[0]?.id ? 'FORNECEDOR' : null,
          usuario_id: req.userId,
          referencias: {
            nfe_entrada_id: nfeId,
            chave_acesso: chaveAcesso,
            numero_nfe: ide.nNF[0],
            serie: ide.serie[0]
          },
          observacoes: `NF-e ${ide.nNF[0]} Série ${ide.serie[0]} - ${ide.natOp[0]}`
        });

        if (lancamentoId) {
          console.log(`✅ Lançamento financeiro criado: ID ${lancamentoId}`);
        } else {
          console.warn('⚠️ Lançamento não criado - operação COMPRA_NFE pode não estar configurada');
        }
      } catch (lancError) {
        console.error('❌ Erro ao criar lançamento financeiro:', lancError);
        // Não interrompe a importação da NF-e se o lançamento falhar
      }

      // Remover arquivo temporário
      await fs.unlink(req.file.path);

      res.json({
        success: true,
        message: 'XML importado com sucesso',
        nfe_id: nfeId,
        total_itens: det.length
      });

    } catch (error) {
      console.error('Erro ao fazer upload de XML:', error);
      res.status(500).json({ error: 'Erro ao processar XML' });
    }
  }

  // Manifestar destinatário
  async manifestar(req, res) {
    try {
      const { id } = req.params;
      const { tipo_evento, justificativa } = req.body;

      // Validar tipo de evento
      const tiposValidos = [
        'CIENCIA_EMISSAO',
        'CONFIRMACAO_OPERACAO',
        'DESCONHECIMENTO_OPERACAO',
        'OPERACAO_NAO_REALIZADA'
      ];

      if (!tiposValidos.includes(tipo_evento)) {
        return res.status(400).json({ error: 'Tipo de evento inválido' });
      }

      // Buscar NF-e
      const [notas] = await db.query(
        'SELECT * FROM nfe_entrada WHERE id = ?',
        [id]
      );

      if (notas.length === 0) {
        return res.status(404).json({ error: 'NF-e não encontrada' });
      }

      // TODO: Enviar manifestação para SEFAZ com certificado
      // Por enquanto, apenas registrar localmente

      // Registrar manifestação
      await db.query(`
        INSERT INTO manifestacoes_destinatario (
          nfe_entrada_id, tipo_evento, justificativa,
          data_evento, usuario_id, resultado, mensagem_retorno
        ) VALUES (?, ?, ?, NOW(), ?, 'PENDENTE', 'Aguardando configuração de certificado')
      `, [id, tipo_evento, justificativa || null, req.userId]);

      // Atualizar status na NF-e
      await db.query(`
        UPDATE nfe_entrada 
        SET status_manifestacao = ?,
            data_manifestacao = NOW(),
            usuario_manifestacao_id = ?
        WHERE id = ?
      `, [tipo_evento, req.userId, id]);

      res.json({
        success: true,
        message: 'Manifestação registrada (requer certificado para envio à SEFAZ)'
      });

    } catch (error) {
      console.error('Erro ao manifestar:', error);
      res.status(500).json({ error: 'Erro ao manifestar destinatário' });
    }
  }

  // Importar NF-e para entrada de mercadoria
  async importarParaEntrada(req, res) {
    try {
      const { id } = req.params;
      const { data_entrada, observacoes } = req.body;

      const connection = await db.getConnection();
      
      try {
        await connection.beginTransaction();

        // Buscar NF-e e itens
        const [notas] = await connection.query(
          'SELECT * FROM nfe_entrada WHERE id = ?',
          [id]
        );

        if (notas.length === 0) {
          throw new Error('NF-e não encontrada');
        }

        const nota = notas[0];

        if (nota.status_entrada === 'IMPORTADO') {
          throw new Error('NF-e já foi importada');
        }

        const [itens] = await connection.query(
          'SELECT * FROM nfe_entrada_itens WHERE nfe_entrada_id = ? ORDER BY numero_item',
          [id]
        );

        // Gerar número de entrada
        const [lastEntrada] = await connection.query(
          'SELECT numero_entrada FROM entradas_mercadorias ORDER BY id DESC LIMIT 1'
        );
        
        let numeroEntrada = 1;
        if (lastEntrada.length > 0) {
          const lastNum = parseInt(lastEntrada[0].numero_entrada.replace(/\D/g, ''));
          numeroEntrada = lastNum + 1;
        }
        numeroEntrada = `ENT${numeroEntrada.toString().padStart(6, '0')}`;

        // Criar entrada de mercadoria
        const [resultEntrada] = await connection.query(`
          INSERT INTO entradas_mercadorias (
            numero_entrada, tipo_entrada, origem,
            fornecedor_id, nfe_entrada_id,
            data_entrada, valor_produtos, valor_frete,
            valor_seguro, valor_desconto, valor_outras_despesas,
            valor_total, observacoes, usuario_id
          ) VALUES (?, 'NFE', 'Importação de XML', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          numeroEntrada,
          nota.fornecedor_id,
          id,
          data_entrada || new Date(),
          nota.valor_produtos,
          nota.valor_frete,
          nota.valor_seguro,
          nota.valor_desconto,
          nota.valor_outras_despesas,
          nota.valor_total,
          observacoes || null,
          req.userId
        ]);

        const entradaId = resultEntrada.insertId;

        // Criar itens e atualizar estoque
        for (const item of itens) {
          // Inserir item da entrada
          await connection.query(`
            INSERT INTO entradas_mercadorias_itens (
              entrada_mercadoria_id, numero_item,
              produto_id, codigo_produto, descricao, unidade,
              quantidade, valor_unitario, valor_total,
              nfe_entrada_item_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            entradaId,
            item.numero_item,
            item.produto_id,
            item.codigo_produto,
            item.descricao,
            item.unidade,
            item.quantidade,
            item.valor_unitario,
            item.valor_total,
            item.id
          ]);

          // Atualizar estoque (se produto vinculado)
          if (item.produto_id) {
            await connection.query(`
              UPDATE produtos 
              SET estoque_atual = estoque_atual + ?
              WHERE id = ?
            `, [item.quantidade, item.produto_id]);
          }
        }

        // Atualizar status da NF-e
        await connection.query(`
          UPDATE nfe_entrada 
          SET status_entrada = 'IMPORTADO',
              entrada_mercadoria_id = ?,
              usuario_importacao_id = ?
          WHERE id = ?
        `, [entradaId, req.userId, id]);

        await connection.commit();

        res.json({
          success: true,
          message: 'NF-e importada com sucesso',
          entrada_id: entradaId,
          numero_entrada: numeroEntrada
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Erro ao importar NF-e:', error);
      res.status(500).json({ error: error.message || 'Erro ao importar NF-e' });
    }
  }

  // Deletar NF-e
  async deletar(req, res) {
    try {
      const { id } = req.params;

      const [notas] = await db.query(
        'SELECT status_entrada FROM nfe_entrada WHERE id = ?',
        [id]
      );

      if (notas.length === 0) {
        return res.status(404).json({ error: 'NF-e não encontrada' });
      }

      if (notas[0].status_entrada === 'IMPORTADO') {
        return res.status(400).json({ 
          error: 'Não é possível deletar NF-e já importada' 
        });
      }

      await db.query('DELETE FROM nfe_entrada WHERE id = ?', [id]);

      res.json({ success: true, message: 'NF-e removida com sucesso' });

    } catch (error) {
      console.error('Erro ao deletar NF-e:', error);
      res.status(500).json({ error: 'Erro ao deletar NF-e' });
    }
  }

  // Buscar itens do XML para associação
  async buscarItensXML(req, res) {
    try {
      const { id } = req.params;

      // Buscar NF-e
      const [nfes] = await db.query(
        'SELECT xml_completo FROM nfe_entrada WHERE id = ?',
        [id]
      );

      if (nfes.length === 0) {
        return res.status(404).json({ error: 'NF-e não encontrada' });
      }

      const xmlContent = nfes[0].xml_completo;
      if (!xmlContent) {
        return res.status(400).json({ error: 'XML não disponível para esta NF-e' });
      }

      // Parse do XML
      const parser = new xml2js.Parser({ explicitArray: true });
      const result = await parser.parseStringPromise(xmlContent);
      
      const nfe = result.nfeProc?.NFe?.[0]?.infNFe?.[0] || result.NFe?.infNFe?.[0];
      const det = nfe.det || [];

      const itens = det.map(item => {
        const prod = item.prod[0];
        const imposto = item.imposto?.[0];
        const icms = imposto?.ICMS?.[0];
        const ipi = imposto?.IPI?.[0];

        // Extrair valores de ICMS (pode estar em diferentes tags)
        let icmsValor = 0;
        let icmsAliquota = 0;
        if (icms) {
          const icmsTag = Object.keys(icms)[0];
          const icmsData = icms[icmsTag]?.[0];
          icmsValor = parseFloat(icmsData?.vICMS?.[0] || 0);
          icmsAliquota = parseFloat(icmsData?.pICMS?.[0] || 0);
        }

        // Extrair valores de IPI
        let ipiValor = 0;
        let ipiAliquota = 0;
        if (ipi?.IPITrib?.[0]) {
          ipiValor = parseFloat(ipi.IPITrib[0].vIPI?.[0] || 0);
          ipiAliquota = parseFloat(ipi.IPITrib[0].pIPI?.[0] || 0);
        }

        return {
          numeroItem: parseInt(item.$.nItem),
          codigoProduto: prod.cProd[0],
          gtin: prod.cEAN?.[0] || null,
          descricao: prod.xProd[0],
          ncm: prod.NCM?.[0] || null,
          cfop: prod.CFOP?.[0] || null,
          unidade: prod.uCom[0],
          quantidade: parseFloat(prod.qCom[0]),
          valorUnitario: parseFloat(prod.vUnCom[0]),
          valorTotal: parseFloat(prod.vProd[0]),
          icmsValor,
          icmsAliquota,
          ipiValor,
          ipiAliquota
        };
      });

      res.json({ itens });

    } catch (error) {
      console.error('Erro ao buscar itens do XML:', error);
      res.status(500).json({ error: 'Erro ao processar XML' });
    }
  }

  // Associar itens do XML aos produtos
  async associarItensXML(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { itens } = req.body;

      if (!itens || itens.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Nenhum item fornecido' });
      }

      // Verificar se NF-e existe
      const [nfes] = await connection.query(
        'SELECT fornecedor_id FROM nfe_entrada WHERE id = ?',
        [id]
      );

      if (nfes.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'NF-e não encontrada' });
      }

      const fornecedorId = nfes[0].fornecedor_id;

      // Remover itens existentes (se houver)
      await connection.query('DELETE FROM nfe_entrada_itens WHERE nfe_entrada_id = ?', [id]);

      let itensAssociados = 0;
      let novosProdutos = 0;

      for (const item of itens) {
        let produtoId = item.produto_id;

        // Se não tem produto associado, criar novo
        if (!produtoId) {
          const [resultProduto] = await connection.query(`
            INSERT INTO produtos (
              codigo_principal,
              gtin,
              descricao,
              ncm,
              unidade,
              preco_custo,
              preco_venda,
              estoque_minimo,
              estoque_maximo,
              ativo,
              categoria_id,
              fornecedor_padrao_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 4, NULL)
          `, [
            item.codigoProduto,
            item.gtin,
            item.descricao,
            item.ncm,
            item.unidade,
            item.valorUnitario,
            item.valorUnitario * 1.3 // margem de 30%
          ]);

          produtoId = resultProduto.insertId;
          novosProdutos++;
        } else {
          itensAssociados++;
        }

        // Inserir item da NF-e
        await connection.query(`
          INSERT INTO nfe_entrada_itens (
            nfe_entrada_id,
            numero_item,
            produto_id,
            codigo_produto,
            gtin,
            descricao,
            ncm,
            cfop,
            unidade,
            quantidade,
            valor_unitario,
            valor_bruto,
            valor_total,
            icms_valor,
            icms_aliquota,
            ipi_valor,
            ipi_aliquota,
            status_conferencia
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')
        `, [
          id,
          item.numeroItem,
          produtoId,
          item.codigoProduto,
          item.gtin,
          item.descricao,
          item.ncm,
          item.cfop,
          item.unidade,
          item.quantidade,
          item.valorUnitario,
          item.valorTotal,
          item.valorTotal,
          item.icmsValor || 0,
          item.icmsAliquota || 0,
          item.ipiValor || 0,
          item.ipiAliquota || 0
        ]);

        // 📦 ATUALIZAR ESTOQUE E PREÇO DE CUSTO
        if (produtoId) {
          await connection.query(`
            UPDATE produtos 
            SET estoque_atual = estoque_atual + ?,
                preco_custo = ?,
                updated_at = NOW()
            WHERE id = ?
          `, [item.quantidade, item.valorUnitario, produtoId]);
          
          console.log(`✅ Produto ${produtoId}: +${item.quantidade} unidades, custo R$ ${item.valorUnitario}`);
        }
      }

      // Atualizar status da NF-e para CONFERIDO
      await connection.query(
        'UPDATE nfe_entrada SET status_entrada = "CONFERIDO" WHERE id = ?',
        [id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Itens associados com sucesso!',
        itensAssociados,
        novosProdutos,
        totalItens: itens.length
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao associar itens:', error);
      res.status(500).json({ error: 'Erro ao associar itens do XML' });
    } finally {
      connection.release();
    }
  }

  // ENTRADA MANUAL
  async criarEntradaManual(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        fornecedor_id,
        pedido_compra_id,
        numero_nf,
        serie_nf,
        chave_acesso,
        data_emissao,
        data_entrada,
        valor_produtos,
        valor_frete,
        valor_outros,
        valor_total,
        observacoes
      } = req.body;

      // Validações
      if (!fornecedor_id || !numero_nf || !serie_nf || !data_emissao || !data_entrada || !valor_total) {
        await connection.rollback();
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      }

      // Verificar se já existe entrada com mesmo número/série/fornecedor
      const [existente] = await connection.query(
        `SELECT id FROM nfe_entrada 
         WHERE numero_nfe = ? AND serie = ? AND fornecedor_id = ?`,
        [numero_nf, serie_nf, fornecedor_id]
      );

      if (existente.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Já existe uma NF-e ${serie_nf}-${numero_nf} para este fornecedor` 
        });
      }

      // Buscar dados do fornecedor
      const [fornecedor] = await connection.query(
        'SELECT cnpj, razao_social FROM fornecedores WHERE id = ?',
        [fornecedor_id]
      );

      if (fornecedor.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Fornecedor não encontrado' });
      }

      // Inserir NF-e de entrada
      const [result] = await connection.query(
        `INSERT INTO nfe_entrada (
          fornecedor_id,
          fornecedor_cnpj,
          fornecedor_nome,
          pedido_compra_id,
          chave_acesso,
          numero_nfe,
          serie,
          data_emissao,
          data_entrada,
          valor_produtos,
          valor_frete,
          valor_outras_despesas,
          valor_total,
          tipo_entrada,
          status_entrada,
          observacoes,
          criado_por_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', 'PENDENTE', ?, ?)`,
        [
          fornecedor_id,
          fornecedor[0].cnpj,
          fornecedor[0].razao_social,
          pedido_compra_id || null,
          chave_acesso || null,
          numero_nf,
          serie_nf,
          data_emissao,
          data_entrada,
          valor_produtos || 0,
          valor_frete || 0,
          valor_outros || 0,
          valor_total,
          observacoes || null,
          req.user.userId
        ]
      );

      const nfeId = result.insertId;

      // Se tem pedido de compra vinculado, atualizar status
      if (pedido_compra_id) {
        await connection.query(
          `UPDATE pedidos_compra 
           SET status = 'RECEBIMENTO_PARCIAL',
               updated_at = NOW()
           WHERE id = ?`,
          [pedido_compra_id]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Entrada manual registrada com sucesso',
        nfeId: nfeId
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao criar entrada manual:', error);
      res.status(500).json({ error: 'Erro ao criar entrada manual' });
    } finally {
      connection.release();
    }
  }

  // ENTRADA MANUAL COMPLETA (com itens)
  async criarEntradaManualCompleta(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      console.log('=== CRIAR ENTRADA MANUAL COMPLETA ===');
      console.log('Body recebido:', JSON.stringify(req.body, null, 2));

      // Garantir que temos o userId
      const userId = req.user?.userId || req.user?.id || 1;
      console.log('User ID:', userId);

      const {
        fornecedor_id,
        pedido_compra_id,
        numero_nf,
        serie_nf,
        chave_acesso,
        data_emissao,
        data_entrada,
        valor_produtos,
        valor_frete,
        valor_outros,
        valor_total,
        observacoes,
        xml_completo,
        itens,
        duplicatas
      } = req.body;

      // Validações detalhadas
      console.log('Validando campos obrigatórios...');
      console.log('fornecedor_id:', fornecedor_id);
      console.log('numero_nf:', numero_nf);
      console.log('serie_nf:', serie_nf);
      console.log('data_emissao:', data_emissao);
      console.log('data_entrada:', data_entrada);
      console.log('valor_total:', valor_total);
      console.log('itens:', itens?.length);

      if (!fornecedor_id || !numero_nf || !serie_nf || !data_emissao || !data_entrada || !valor_total) {
        await connection.rollback();
        const camposFaltando = [];
        if (!fornecedor_id) camposFaltando.push('fornecedor_id');
        if (!numero_nf) camposFaltando.push('numero_nf');
        if (!serie_nf) camposFaltando.push('serie_nf');
        if (!data_emissao) camposFaltando.push('data_emissao');
        if (!data_entrada) camposFaltando.push('data_entrada');
        if (!valor_total) camposFaltando.push('valor_total');
        
        console.error('Campos obrigatórios faltando:', camposFaltando);
        return res.status(400).json({ 
          error: 'Dados obrigatórios não fornecidos',
          campos_faltando: camposFaltando
        });
      }

      if (!itens || itens.length === 0) {
        await connection.rollback();
        console.error('Erro: Nenhum item fornecido');
        return res.status(400).json({ error: 'Adicione pelo menos um item à nota' });
      }

      console.log('Total de itens:', itens.length);

      // Verificar duplicidade
      const [existente] = await connection.query(
        `SELECT id FROM nfe_entrada 
         WHERE numero_nfe = ? AND serie = ? AND fornecedor_id = ?`,
        [numero_nf, serie_nf, fornecedor_id]
      );

      if (existente.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Já existe uma NF-e ${serie_nf}-${numero_nf} para este fornecedor` 
        });
      }

      // Buscar dados do fornecedor
      const [fornecedor] = await connection.query(
        'SELECT cnpj, razao_social FROM fornecedores WHERE id = ?',
        [fornecedor_id]
      );

      if (fornecedor.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Fornecedor não encontrado' });
      }

      // Inserir NF-e de entrada
      const [result] = await connection.query(
        `INSERT INTO nfe_entrada (
          fornecedor_id,
          fornecedor_cnpj,
          fornecedor_nome,
          pedido_compra_id,
          chave_acesso,
          numero_nfe,
          serie,
          data_emissao,
          data_entrada,
          valor_produtos,
          valor_frete,
          valor_outras_despesas,
          valor_total,
          xml_completo,
          tipo_entrada,
          status_entrada,
          observacoes,
          criado_por_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', 'CONFERIDO', ?, ?)`,
        [
          fornecedor_id,
          fornecedor[0].cnpj,
          fornecedor[0].razao_social,
          pedido_compra_id || null,
          chave_acesso || null,
          numero_nf,
          serie_nf,
          data_emissao,
          data_entrada,
          valor_produtos || 0,
          valor_frete || 0,
          valor_outros || 0,
          valor_total,
          xml_completo || null,
          observacoes || null,
          userId
        ]
      );

      const nfeId = result.insertId;

      // Processar itens
      let novosProdutos = 0;
      let produtosAtualizados = 0;

      for (const item of itens) {
        let produtoId = item.produto_id;

        // Se não tem produto_id associado, tentar buscar por código antes de criar
        if (!produtoId) {
          const [produtoExistente] = await connection.query(
            'SELECT id FROM produtos WHERE codigo_principal = ? LIMIT 1',
            [item.codigo]
          );
          
          if (produtoExistente.length > 0) {
            // Produto já existe, usar o ID existente
            produtoId = produtoExistente[0].id;
            console.log(`✅ Produto ${item.codigo} já existe (ID: ${produtoId})`);
          }
        }

        // Se ainda não tem produto, criar novo
        if (!produtoId) {
          const [resultProduto] = await connection.query(`
            INSERT INTO produtos (
              codigo_principal,
              descricao,
              ncm,
              unidade,
              preco_custo,
              preco_venda,
              estoque_minimo,
              estoque_maximo,
              ativo,
              categoria_id,
              fornecedor_padrao_id
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, 4, NULL)
          `, [
            item.codigo,
            item.descricao,
            item.ncm || null,
            item.unidade || 'UN',
            item.valorUnitario,
            item.valorUnitario * 1.3 // margem de 30%
          ]);

          produtoId = resultProduto.insertId;
          novosProdutos++;
          console.log(`➕ Produto criado: ${item.codigo} (ID: ${produtoId})`);
        } else {
          // Produto já existe, atualizar preço de custo
          await connection.query(`
            UPDATE produtos 
            SET preco_custo = ?,
                updated_at = NOW()
            WHERE id = ?
          `, [item.valorUnitario, produtoId]);
          
          produtosAtualizados++;
          console.log(`🔄 Produto atualizado: ${item.codigo} (ID: ${produtoId})`);
        }

        // Inserir item da NF-e COM TODOS OS CAMPOS FISCAIS
        const valorTotal = item.quantidade * item.valorUnitario;
        
        await connection.query(`
          INSERT INTO nfe_entrada_itens (
            nfe_entrada_id,
            numero_item,
            produto_id,
            codigo_produto,
            gtin,
            descricao,
            ncm,
            cest,
            cfop,
            origem,
            cst,
            unidade,
            quantidade,
            valor_unitario,
            valor_bruto,
            valor_desconto,
            valor_frete,
            valor_seguro,
            valor_outras_despesas,
            valor_total,
            icms_base_calculo,
            icms_aliquota,
            icms_valor,
            icms_st,
            ipi_valor,
            ipi_aliquota,
            pis_valor,
            pis_aliquota,
            cofins_valor,
            cofins_aliquota,
            status_conferencia
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')
        `, [
          nfeId,
          item.numeroItem,
          produtoId,
          item.codigo,
          item.gtin || null,
          item.descricao,
          item.ncm || null,
          item.cest || null,
          item.cfop || null,
          item.origem || null,
          item.cst || null,
          item.unidade || 'UN',
          item.quantidade,
          item.valorUnitario,
          item.valorProduto || valorTotal,
          item.valorDesconto || 0,
          item.valorFrete || 0,
          item.valorSeguro || 0,
          item.valorOutros || 0,
          valorTotal,
          item.icmsBase || 0,
          item.icmsAliquota || 0,
          item.icmsValor || 0,
          item.icmsST || 0,
          item.ipiValor || 0,
          item.ipiAliquota || 0,
          item.pisValor || 0,
          item.pisAliquota || 0,
          item.cofinsValor || 0,
          item.cofinsAliquota || 0
        ]);

        // 📦 ATUALIZAR ESTOQUE E PREÇO DE CUSTO
        await connection.query(`
          UPDATE produtos 
          SET estoque_atual = estoque_atual + ?,
              preco_custo = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [item.quantidade, item.valorUnitario, produtoId]);
        
        console.log(`✅ Produto ${produtoId}: +${item.quantidade} unidades, custo atualizado para R$ ${item.valorUnitario}`);
      }

      // Se tem pedido de compra vinculado, atualizar status
      if (pedido_compra_id) {
        await connection.query(
          `UPDATE pedidos_compra 
           SET status = 'RECEBIMENTO_PARCIAL',
               updated_at = NOW()
           WHERE id = ?`,
          [pedido_compra_id]
        );
      }

      // Processar duplicatas (parcelas) e gerar no Contas a Pagar
      let parcelasCriadas = 0;
      
      if (duplicatas && duplicatas.length > 0) {
        console.log('Processando duplicatas:', duplicatas.length);
        
        // Buscar categoria padrão (Compra de Mercadorias)
        const [categorias] = await connection.query(
          `SELECT id FROM categorias_financeiras 
           WHERE tipo = 'DESPESA' AND (nome LIKE '%compra%' OR nome LIKE '%mercadoria%') 
           LIMIT 1`
        );
        
        if (categorias.length === 0) {
          console.warn('⚠️ Nenhuma categoria financeira encontrada, criando padrão...');
          const [catResult] = await connection.query(
            `INSERT INTO categorias_financeiras (nome, tipo, ativa) 
             VALUES ('Compra de Mercadorias', 'DESPESA', 1)`
          );
          var categoriaId = catResult.insertId;
        } else {
          var categoriaId = categorias[0].id;
        }
        console.log('Categoria ID:', categoriaId);

        // Buscar forma de pagamento padrão
        const [formas] = await connection.query('SELECT id FROM formas_pagamento WHERE ativo = 1 LIMIT 1');
        
        if (formas.length === 0) {
          console.warn('⚠️ Nenhuma forma de pagamento encontrada, criando padrão...');
          const [formaResult] = await connection.query(
            `INSERT INTO formas_pagamento (descricao, tipo, ativo) 
             VALUES ('A Prazo', 'PRAZO', 1)`
          );
          var formaPagamentoId = formaResult.insertId;
        } else {
          var formaPagamentoId = formas[0].id;
        }
        console.log('Forma Pagamento ID:', formaPagamentoId);

        for (const dup of duplicatas) {
          console.log('Inserindo parcela:', dup);
          
          await connection.query(`
            INSERT INTO contas_pagar (
              fornecedor_id,
              categoria_id,
              numero_documento,
              valor_total,
              valor_restante,
              valor_final,
              data_emissao,
              data_vencimento,
              status,
              forma_pagamento,
              descricao,
              observacoes,
              nfe_entrada_id,
              usuario_criacao_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', 'BOLETO', ?, ?, ?, ?)
          `, [
            fornecedor_id,
            categoriaId,
            `${serie_nf}-${numero_nf}/${dup.numero}`,
            dup.valor,
            dup.valor,
            dup.valor,
            data_emissao,
            dup.vencimento,
            `NF-e ${serie_nf}-${numero_nf} - Parcela ${dup.numero}`,
            `Gerado automaticamente da NF-e ${serie_nf}-${numero_nf}`,
            nfeId,
            userId
          ]);
          parcelasCriadas++;
          console.log('Parcela criada:', parcelasCriadas);
        }
      }

      await connection.commit();

      console.log('✅ Entrada criada com sucesso!');
      console.log('NF-e ID:', nfeId);
      console.log('Total de itens:', itens.length);
      console.log('Novos produtos criados:', novosProdutos);
      console.log('Produtos atualizados:', produtosAtualizados);
      console.log('Parcelas criadas:', parcelasCriadas);

      res.json({
        success: true,
        message: 'Entrada manual com itens registrada com sucesso',
        nfeId: nfeId,
        totalItens: itens.length,
        novosProdutos: novosProdutos,
        produtosAtualizados: produtosAtualizados,
        parcelasCriadas: parcelasCriadas
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Erro ao criar entrada manual completa:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        error: 'Erro ao criar entrada manual completa',
        message: error.message,
        details: error.sqlMessage || error.toString()
      });
    } finally {
      connection.release();
    }
  }

  // NOVOS MÉTODOS - INTEGRAÇÃO SEFAZ

  // Consultar notas pendentes na SEFAZ
  async consultarSefaz(req, res) {
    try {
      const { ultNSU } = req.query;
      
      const resultado = await sefazService.consultarNotasPendentes(ultNSU || '0');
      
      if (!resultado.sucesso) {
        return res.status(400).json({ error: resultado.mensagem });
      }

      res.json({
        sucesso: true,
        ultNSU: resultado.ultNSU,
        maxNSU: resultado.maxNSU,
        totalNotas: resultado.notas.length,
        notas: resultado.notas
      });

    } catch (error) {
      console.error('Erro ao consultar SEFAZ:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Importar nota da SEFAZ para o banco
  async importarDaSefaz(req, res) {
    try {
      const { chaveNFe, xmlContent, nsu } = req.body;
      const userId = req.user.userId;

      // Salvar XML no servidor
      const xmlPath = await sefazService.salvarXML(chaveNFe, xmlContent);

      // Processar XML
      const parser = new xml2js.Parser({ explicitArray: false });
      const parsed = await parser.parseStringPromise(xmlContent);
      
      const nfe = parsed.nfeProc ? parsed.nfeProc.NFe.infNFe : parsed.NFe.infNFe;
      const emit = nfe.emit;
      const dest = nfe.dest;
      const total = nfe.total.ICMSTot;

      // Buscar ou criar fornecedor
      let fornecedorId = null;
      const cnpjEmit = emit.CNPJ || emit.CPF;
      
      const [fornecedor] = await db.query(
        'SELECT id FROM fornecedores WHERE cnpj = ? OR cpf = ?',
        [cnpjEmit, cnpjEmit]
      );

      if (fornecedor.length > 0) {
        fornecedorId = fornecedor[0].id;
      } else {
        // Criar fornecedor automaticamente
        const [resultForn] = await db.query(`
          INSERT INTO fornecedores (
            razao_social, nome_fantasia, cnpj, inscricao_estadual,
            logradouro, numero, bairro, cidade, uf, cep,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          emit.xNome,
          emit.xFant || emit.xNome,
          emit.CNPJ || null,
          emit.IE || null,
          emit.enderEmit?.xLgr || '',
          emit.enderEmit?.nro || '',
          emit.enderEmit?.xBairro || '',
          emit.enderEmit?.xMun || '',
          emit.enderEmit?.UF || '',
          emit.enderEmit?.CEP || ''
        ]);
        
        fornecedorId = resultForn.insertId;
      }

      // Inserir NF-e
      const [resultNFe] = await db.query(`
        INSERT INTO nfe_entrada (
          chave_acesso, numero, serie, data_emissao, data_recebimento,
          fornecedor_id, valor_produtos, valor_frete, valor_seguro,
          valor_desconto, valor_icms, valor_ipi, valor_total,
          status_entrada, status_manifestacao, nsu, xml_path,
          usuario_download_id, created_at
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', 'PENDENTE', ?, ?, ?, NOW())
      `, [
        chaveNFe,
        nfe.ide.nNF,
        nfe.ide.serie,
        nfe.ide.dhEmi,
        fornecedorId,
        parseFloat(total.vProd || 0),
        parseFloat(total.vFrete || 0),
        parseFloat(total.vSeg || 0),
        parseFloat(total.vDesc || 0),
        parseFloat(total.vICMS || 0),
        parseFloat(total.vIPI || 0),
        parseFloat(total.vNF),
        nsu,
        xmlPath,
        userId
      ]);

      const nfeId = resultNFe.insertId;

      // Inserir itens
      const itens = Array.isArray(nfe.det) ? nfe.det : [nfe.det];
      
      for (const item of itens) {
        const prod = item.prod;
        const imposto = item.imposto;

        await db.query(`
          INSERT INTO nfe_entrada_itens (
            nfe_entrada_id, numero_item, codigo_produto, descricao,
            ncm, cfop, unidade, quantidade, valor_unitario, valor_total,
            valor_icms, valor_ipi, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          nfeId,
          item.$.nItem,
          prod.cProd,
          prod.xProd,
          prod.NCM,
          prod.CFOP,
          prod.uCom,
          parseFloat(prod.qCom),
          parseFloat(prod.vUnCom),
          parseFloat(prod.vProd),
          parseFloat(imposto?.ICMS?.ICMS00?.vICMS || imposto?.ICMS?.ICMS10?.vICMS || 0),
          parseFloat(imposto?.IPI?.IPITrib?.vIPI || 0)
        ]);
      }

      res.json({
        sucesso: true,
        mensagem: 'NF-e importada com sucesso',
        nfeId: nfeId
      });

    } catch (error) {
      console.error('Erro ao importar da SEFAZ:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Manifestar destinatário (Ciência, Confirmação, etc)
  async manifestar(req, res) {
    try {
      const { chaveNFe, tipoEvento, justificativa } = req.body;
      const userId = req.user.userId;

      // Manifestar na SEFAZ
      const resultado = await sefazService.manifestarDestinatario(chaveNFe, tipoEvento, justificativa);

      if (!resultado.sucesso) {
        return res.status(400).json({ error: resultado.mensagem });
      }

      // Atualizar status no banco
      await db.query(`
        UPDATE nfe_entrada 
        SET status_manifestacao = ?,
            data_manifestacao = NOW(),
            protocolo_manifestacao = ?,
            usuario_manifestacao_id = ?
        WHERE chave_acesso = ?
      `, [tipoEvento, resultado.protocolo, userId, chaveNFe]);

      res.json({
        sucesso: true,
        mensagem: resultado.mensagem,
        protocolo: resultado.protocolo
      });

    } catch (error) {
      console.error('Erro ao manifestar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Verificar status do certificado
  async verificarCertificado(req, res) {
    try {
      const resultado = await sefazService.verificarCertificado();
      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Download de XML completo por chave
  async downloadXMLSefaz(req, res) {
    try {
      const { chaveNFe } = req.params;
      
      const xmlCompleto = await sefazService.downloadXMLPorChave(chaveNFe);
      
      res.json({
        sucesso: true,
        xml: xmlCompleto
      });

    } catch (error) {
      console.error('Erro ao baixar XML:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new NFCeEntradaController();
