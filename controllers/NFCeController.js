// controllers/NFCeController.js
const pool = require('../src/config/db');
const moment = require('moment-timezone');
const CupomFiscalGenerator = require('../utils/cupomFiscal');
const NFCeXMLGenerator = require('../utils/nfceXMLGenerator');
const { resolveFiguraSaida, montarCamposItemSaida } = require('../utils/tributacaoResolver');
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');

class NFCeController {
    // Gerar NFC-e a partir de uma venda
    static async gerarNFCe(req, res) {
        console.log('🧾 ==================== GERAÇÃO DE NFC-e INICIADA ====================');
        console.log('🧾 Request body:', req.body);
        console.log('🧾 User:', req.user);
        console.log('🧾 Método:', req.method);
        console.log('🧾 URL:', req.url);
        
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { venda_id, observacoes, cpf_cnpj_consumidor, nome_consumidor } = req.body;
            // Alguns middlewares populam req.user com { userId, ... }, outros com o próprio registro do usuário (id)
            const usuario_id = req.user?.userId || req.user?.id || null;
            
            console.log('🧾 Dados extraídos:');
            console.log('  - venda_id:', venda_id);
            console.log('  - observacoes:', observacoes);
            console.log('  - usuario_id:', usuario_id);

            // Buscar dados da venda
            const [vendas] = await connection.execute(`
                SELECT v.*, c.nome_razao_social as cliente_nome, c.cpf_cnpj, c.endereco
                FROM vendas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                WHERE v.id = ?
            `, [venda_id]);

            if (vendas.length === 0) {
                return res.status(404).json({ error: 'Venda não encontrada' });
            }

            const venda = vendas[0];

            // Buscar itens da venda com fallback para diferentes nomes de tabela (itens_venda vs vendas_itens)
            async function tableExists(conn, tableName) {
                const [rows] = await conn.execute(
                    `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
                    [tableName]
                );
                return rows[0].cnt > 0;
            }

            const hasItensVenda = await tableExists(connection, 'itens_venda');
            const itensTable = hasItensVenda ? 'itens_venda' : 'vendas_itens';

            const [itensVenda] = await connection.execute(`
                SELECT iv.*, 
                       p.codigo_principal AS codigo, 
                       p.descricao, 
                       p.gtin AS codigo_barras,
                       p.unidade
                FROM ${itensTable} iv
                JOIN produtos p ON iv.produto_id = p.id
                WHERE iv.venda_id = ?
                ORDER BY iv.id
            `, [venda_id]);

            // Buscar configurações fiscais da empresa
            const [configFiscal] = await connection.execute(`
                SELECT * FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1
            `);

            if (configFiscal.length === 0) {
                return res.status(400).json({ error: 'Configurações fiscais não encontradas' });
            }

            const config = configFiscal[0];

            // Buscar próximo número sequencial
            const [nextNumber] = await connection.execute(`
                SELECT COALESCE(MAX(numero_sequencial), 0) + 1 as proximo_numero
                FROM nfce WHERE serie = ?
            `, [config.serie_nfce]);

            const numeroSequencial = nextNumber[0].proximo_numero;

            // Gerar chave de acesso (simplificada para demonstração)
            const chaveAcesso = await NFCeController.gerarChaveAcesso(config, numeroSequencial);

            // Calcular impostos (retorna objeto com campos normalizados)
            const impostos = NFCeController.calcularImpostos(itensVenda, venda);

            // Normalizar CPF/CNPJ do consumidor (somente dígitos)
            const cpfCnpjConsumidorRaw = cpf_cnpj_consumidor || venda.cpf_cnpj || null;
            const cpfCnpjConsumidor = cpfCnpjConsumidorRaw
                ? (cpfCnpjConsumidorRaw || '').toString().replace(/\D/g, '') || null
                : null;

            // Inserir NFC-e
            const [resultNFCe] = await connection.execute(`
                INSERT INTO nfce (
                    numero_sequencial, serie, chave_acesso, venda_id,
                    cnpj_emitente, inscricao_estadual, razao_social_emitente, nome_fantasia_emitente,
                    endereco_emitente, municipio_emitente, uf_emitente, cep_emitente,
                    cpf_cnpj_consumidor, nome_consumidor,
                    base_calculo_icms, valor_icms, valor_pis, valor_cofins,
                    observacoes, informacoes_adicionais_fisco,
                    status, usuario_criacao_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                numeroSequencial, config.serie_nfce, chaveAcesso, venda_id,
                config.cnpj, config.inscricao_estadual, config.razao_social, config.nome_fantasia,
                `${config.logradouro}, ${config.numero} - ${config.bairro}`, 
                config.municipio, config.uf, config.cep,
                cpfCnpjConsumidor,
                nome_consumidor || venda.cliente_nome,
                impostos.baseCalculoIcms, impostos.valorIcms, impostos.valorPis, impostos.valorCofins,
                observacoes, config.observacoes_padrao,
                'NAO_FISCAL', usuario_id
            ]);

            const nfceId = resultNFCe.insertId;

            // Inserir itens fiscais
            for (let i = 0; i < itensVenda.length; i++) {
                const item = itensVenda[i];
                const numeroItem = i + 1;

                // Fallbacks fiscais para ambientes sem colunas fiscais em produtos
                const ncm = item.ncm || item.NCM || null; // se existir na base do item/produto
                const unidade = item.unidade || 'UN';

                // Resolver figura de saída (produto > NCM > default) e montar campos fiscais do item
                let campos = null;
                try {
                    const { figura } = await resolveFiguraSaida(connection, item.produto_id, ncm);
                    if (figura) {
                        campos = montarCamposItemSaida(figura, config.regime_tributario);
                    }
                } catch (e) {
                    console.warn('⚠️ Falha ao resolver figura de saída para produto', item.produto_id, e?.message);
                }

                // Fallback padrão se não houver figura
                const cfop = campos?.cfop || '5102';
                const origem = (campos?.origem_produto ?? 0);
                const cst_icms = campos?.cst_icms || '102'; // para SN usamos CSOSN nesta coluna
                const aliq_icms = campos?.aliquota_icms ?? 0;
                const pis_cst = campos?.pis_cst || '49';
                const aliq_pis = campos?.pis_aliquota ?? 0;
                const cofins_cst = campos?.cofins_cst || '49';
                const aliq_cofins = campos?.cofins_aliquota ?? 0;

                await connection.execute(`
                    INSERT INTO nfce_itens_fiscal (
                        nfce_id, item_venda_id, numero_item,
                        codigo_produto, descricao_produto, codigo_barras, ncm, cfop, unidade,
                        origem_produto, cst_icms, aliquota_icms, valor_icms,
                        cst_pis, aliquota_pis, valor_pis,
                        cst_cofins, aliquota_cofins, valor_cofins
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    nfceId, item.id, numeroItem,
                    item.codigo, item.descricao, item.codigo_barras, (ncm || '00000000'), cfop, unidade,
                    origem, cst_icms, aliq_icms, 0, // valor_icms calculado = 0 (SN ou simplificado)
                    pis_cst, aliq_pis, 0,
                    cofins_cst, aliq_cofins, 0
                ]);
            }

            // 💰 CRIAR LANÇAMENTO FINANCEIRO AUTOMÁTICO
            console.log('💰 Criando lançamento financeiro para NFC-e...');
            try {
                const lancamentoId = await criarLancamentoAutomatico({
                    operacao: 'VENDA_NFCE',
                    descricao: `Venda NFC-e #${numeroSequencial.toString().padStart(6, '0')} - ${nome_consumidor || venda.cliente_nome || 'Consumidor'}`,
                    valor: venda.valor_total,
                    data_lancamento: moment().format('YYYY-MM-DD'),
                    tipo: 'RECEITA',
                    pessoa_id: venda.cliente_id || null,
                    pessoa_tipo: venda.cliente_id ? 'CLIENTE' : null,
                    usuario_id: usuario_id,
                    referencias: {
                        venda_id: venda_id,
                        nfce_id: nfceId,
                        chave_acesso: chaveAcesso
                    },
                    observacoes: `NFC-e Série ${config.serie_nfce} Número ${numeroSequencial}`
                });

                if (lancamentoId) {
                    console.log(`✅ Lançamento financeiro criado: ID ${lancamentoId}`);
                } else {
                    console.warn('⚠️ Lançamento não criado - operação VENDA_NFCE pode não estar configurada');
                }
            } catch (lancError) {
                console.error('❌ Erro ao criar lançamento financeiro:', lancError);
                // Não interrompe a emissão da NFC-e se o lançamento falhar
            }

            await connection.commit();

            // Buscar NFC-e criada com todos os dados
            const nfceCompleta = await NFCeController.buscarNFCeCompleta(nfceId);

            res.status(201).json({
                message: 'NFC-e gerada com sucesso',
                nfce: nfceCompleta
            });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao gerar NFC-e:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } finally {
            connection.release();
        }
    }

    // Buscar NFC-e completa
    static async buscarNFCeCompleta(nfceId) {
        const [nfce] = await pool.execute(`
            SELECT n.*, v.numero_pedido as numero_venda, v.valor_total as valor_venda,
                   c.nome_razao_social as cliente_nome
            FROM nfce n
            JOIN vendas v ON n.venda_id = v.id
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE n.id = ?
        `, [nfceId]);

        if (nfce.length === 0) return null;

        // Detectar dinamicamente a tabela de itens (itens_venda vs vendas_itens)
        async function detectItensTable() {
            const [rows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('itens_venda', 'vendas_itens')`
            );
            // Se existir itens_venda, prioriza ela, senão usa vendas_itens
            const [hasItensVenda] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'itens_venda'`
            );
            return hasItensVenda[0].cnt > 0 ? 'itens_venda' : 'vendas_itens';
        }

        const itensTable = await detectItensTable();

        const [itens] = await pool.execute(`
            SELECT nf.*, iv.quantidade, iv.valor_unitario, iv.valor_total
            FROM nfce_itens_fiscal nf
            JOIN ${itensTable} iv ON nf.item_venda_id = iv.id
            WHERE nf.nfce_id = ?
            ORDER BY nf.numero_item
        `, [nfceId]);

        return {
            ...nfce[0],
            itens
        };
    }

    // Listar NFC-es
    static async listar(req, res) {
        try {
            console.log('=== LISTANDO NFCe ===');
            
            // Primeiro, vamos fazer uma consulta simples para testar
            const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM nfce');
            console.log('Total de NFC-es na tabela:', countResult[0].total);
            
            if (countResult[0].total === 0) {
                return res.json({
                    nfces: [],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        pages: 0
                    }
                });
            }

            const { page = 1, limit = 20, status, data_inicio, data_fim } = req.query;
            const offset = (page - 1) * limit;

            let whereConditions = [];
            let params = [];

            if (status) {
                whereConditions.push('n.status = ?');
                params.push(status);
            }

            if (data_inicio) {
                whereConditions.push('DATE(n.created_at) >= ?');
                params.push(data_inicio);
            }

            if (data_fim) {
                whereConditions.push('DATE(n.created_at) <= ?');
                params.push(data_fim);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            console.log('Query WHERE:', whereClause);
            console.log('Params:', params);

            const [nfces] = await pool.execute(`
                SELECT n.id, n.numero_sequencial, n.serie, n.chave_acesso, n.status,
                       n.created_at, v.numero_pedido, v.valor_total,
                       COALESCE(c.nome_razao_social, 'CONSUMIDOR') as cliente_nome
                FROM nfce n
                JOIN vendas v ON n.venda_id = v.id
                LEFT JOIN clientes c ON v.cliente_id = c.id
                ${whereClause}
                ORDER BY n.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            console.log('NFC-es encontradas:', nfces.length);

            // Contar total
            const [total] = await pool.execute(`
                SELECT COUNT(*) as total
                FROM nfce n
                JOIN vendas v ON n.venda_id = v.id
                LEFT JOIN clientes c ON v.cliente_id = c.id
                ${whereClause}
            `, params);

            console.log('Total com filtros:', total[0].total);

            res.json({
                nfces,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].total,
                    pages: Math.ceil(total[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Erro ao listar NFC-es:', error);
            console.error('Stack:', error.stack);
            res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
        }
    }

    // Buscar NFC-e por ID
    static async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const nfce = await NFCeController.buscarNFCeCompleta(id);

            if (!nfce) {
                return res.status(404).json({ error: 'NFC-e não encontrada' });
            }

            res.json(nfce);

        } catch (error) {
            console.error('Erro ao buscar NFC-e:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // Gerar cupom fiscal para impressão
    static async gerarCupom(req, res) {
        try {
            const { id } = req.params;
            const nfce = await NFCeController.buscarNFCeCompleta(id);

            if (!nfce) {
                return res.status(404).json({ error: 'NFC-e não encontrada' });
            }

            const cupom = await NFCeController.formatarCupomFiscal(nfce);

            res.json({
                cupom_html: cupom.html,
                cupom_texto: cupom.texto
            });

        } catch (error) {
            console.error('Erro ao gerar cupom:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // Cancelar NFC-e
    static async cancelar(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;
                const usuario_id = req.user?.userId || req.user?.id || null;

            const [result] = await pool.execute(`
                UPDATE nfce 
                SET status = 'CANCELADA', 
                    motivo_cancelamento = ?,
                    usuario_cancelamento_id = ?,
                    updated_at = NOW()
                WHERE id = ? AND status = 'EMITIDA'
            `, [motivo, usuario_id, id]);

            if (result.affectedRows === 0) {
                return res.status(400).json({ error: 'NFC-e não pode ser cancelada' });
            }

            res.json({ message: 'NFC-e cancelada com sucesso' });

        } catch (error) {
            console.error('Erro ao cancelar NFC-e:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // Autorizar NFC-e na SEFAZ (stub)
    static async autorizar(req, res) {
        try {
            const { venda_id } = req.body || {};
            const usuario_id = req.user?.userId || req.user?.id || null;

            console.log('🧾 [NFCeController.autorizar] Solicitação de autorização para venda_id=', venda_id);

            // Verificar se há certificado configurado
            const [configRows] = await pool.execute(`SELECT ambiente_nfce, certificado_a1, senha_certificado FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1`);
            if (configRows.length === 0) {
                return res.status(400).json({ error: 'Configurações fiscais não encontradas' });
            }
            const cfg = configRows[0];

            if (!cfg.certificado_a1 || !cfg.senha_certificado) {
                return res.status(501).json({
                    error: 'Autorização SEFAZ não configurada',
                    detalhes: 'É necessário configurar o Certificado A1 (.pfx) e a senha nas configurações fiscais para autorizar a NFC-e.',
                    proximo_passo: 'Carregue o certificado A1 e informe a senha; configure também CSC (id e token) para QR Code v2.'
                });
            }

            // Ponto de integração futuro: montar XML, assinar e enviar para SEFAZ-DF
            return res.status(501).json({
                error: 'Funcionalidade em desenvolvimento',
                detalhes: 'Transmissão para SEFAZ-DF ainda não implementada neste ambiente.',
            });
        } catch (error) {
            console.error('❌ Erro na autorização NFC-e:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // Métodos auxiliares
    static async gerarChaveAcesso(config, numeroSequencial) {
        // Implementação simplificada da chave de acesso
        const uf = '53'; // DF
        const aaaamm = moment().format('YYYYMM').substring(2);
        const cnpj = config.cnpj.replace(/\D/g, '');
        const mod = '65'; // NFC-e
        const serie = config.serie_nfce.toString().padStart(3, '0');
        const numero = numeroSequencial.toString().padStart(9, '0');
        const tpAmb = config.ambiente_nfce === 'PRODUCAO' ? '1' : '2';
        const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

        const chave = `${uf}${aaaamm}${cnpj}${mod}${serie}${numero}${tpAmb}${cNF}`;
        
        // Calcular dígito verificador (implementação simplificada)
    const dv = NFCeController.calcularDV(chave);
        
        return chave + dv;
    }

    static calcularDV(chave) {
        // Implementação simplificada do dígito verificador
        let soma = 0;
        let peso = 2;
        
        for (let i = chave.length - 1; i >= 0; i--) {
            soma += parseInt(chave[i]) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        const resto = soma % 11;
        return resto < 2 ? '0' : (11 - resto).toString();
    }

    static calcularImpostos(itens, venda) {
        // Para Simples Nacional, geralmente não há cálculo de ICMS, PIS, COFINS
        return {
            baseCalculoIcms: 0,
            valorIcms: 0,
            valorPis: 0,
            valorCofins: 0,
            valorTotalNota: venda.valor_total
        };
    }

    static async formatarCupomFiscal(nfce) {
        // Buscar configurações para logo
        const [config] = await pool.execute(`
            SELECT * FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1
        `);

        const logoBase64 = config[0]?.logo ? `data:image/png;base64,${config[0].logo.toString('base64')}` : null;
        
        const cupomGenerator = new CupomFiscalGenerator();
        
        const configuracoes = {
            logoBase64,
            observacoesAdicionais: config[0]?.observacoes_padrao || '',
            mostrarQRCode: true,
            corPrimaria: '#2563eb'
        };

        const html = cupomGenerator.gerarHTML(nfce, configuracoes);
        const texto = cupomGenerator.gerarTexto(nfce, configuracoes);

        return { html, texto };
    }

    /**
     * Gerar XML completo da NFC-e
     * @route POST /api/nfce/:id/gerar-xml
     */
    static async gerarXML(req, res) {
        try {
            const { id } = req.params;

            // Buscar NFC-e completa
            const [nfces] = await pool.execute(`
                SELECT * FROM nfce WHERE id = ?
            `, [id]);

            if (nfces.length === 0) {
                return res.status(404).json({ error: 'NFC-e não encontrada' });
            }

            const nfce = nfces[0];

            // Buscar itens
            const [itens] = await pool.execute(`
                SELECT 
                    nfi.*,
                    iv.quantidade,
                    iv.valor_unitario,
                    iv.valor_total as valor_total_item,
                    p.descricao as descricao_produto,
                    p.codigo_principal as codigo_produto,
                    p.gtin as codigo_barras,
                    p.unidade
                FROM nfce_itens_fiscal nfi
                JOIN itens_venda iv ON nfi.item_venda_id = iv.id
                JOIN produtos p ON iv.produto_id = p.id
                WHERE nfi.nfce_id = ?
                ORDER BY nfi.numero_item
            `, [id]);

            // Buscar configurações fiscais
            const [configs] = await pool.execute(`
                SELECT * FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1
            `);

            if (configs.length === 0) {
                return res.status(400).json({ error: 'Configurações fiscais não encontradas' });
            }

            const config = configs[0];

            // Buscar destinatário (se houver)
            let destinatario = null;
            if (nfce.cpf_cnpj_consumidor) {
                destinatario = {
                    cpf_cnpj: nfce.cpf_cnpj_consumidor,
                    nome: nfce.nome_consumidor
                };
            }

            // Buscar formas de pagamento da venda
            const [pagamentos] = await pool.execute(`
                SELECT forma_pagamento, valor_pago as valor
                FROM vendas
                WHERE id = ?
            `, [nfce.venda_id]);

            // Gerar XML
            const xmlCompleto = NFCeXMLGenerator.gerarXML({
                nfce,
                itens,
                config,
                destinatario,
                pagamentos: pagamentos.length > 0 ? pagamentos : null
            });

            // Atualizar NFC-e com o XML gerado
            await pool.execute(`
                UPDATE nfce 
                SET xml_nfce = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [xmlCompleto, id]);

            // Gerar URL QR Code
            const urlQRCode = NFCeXMLGenerator.gerarURLQRCode(
                nfce.chave_acesso,
                config.ambiente,
                nfce.valor_total
            );

            res.json({
                message: 'XML gerado com sucesso',
                xml: xmlCompleto,
                url_qrcode: urlQRCode,
                chave_acesso: nfce.chave_acesso
            });

        } catch (error) {
            console.error('Erro ao gerar XML:', error);
            res.status(500).json({ 
                error: 'Erro ao gerar XML da NFC-e',
                detalhes: error.message 
            });
        }
    }


}

module.exports = NFCeController;