const db = require('../db');

class CaixaFechamento {
    static async iniciarFechamento(caixaId, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar se o caixa está aberto
            const [caixa] = await connection.query(
                'SELECT * FROM caixas WHERE id = ? AND status = "ABERTO"',
                [caixaId]
            );

            if (caixa.length === 0) {
                throw new Error('Caixa não encontrado ou não está aberto');
            }

            // Calcular totais por forma de pagamento
            const [totaisPorForma] = await connection.query(`
                SELECT 
                    forma_pagamento,
                    SUM(CASE WHEN tipo = 'VENDA' THEN valor ELSE 0 END) as total_vendas,
                    SUM(CASE WHEN tipo = 'SANGRIA' THEN valor ELSE 0 END) as total_sangrias,
                    SUM(CASE WHEN tipo = 'SUPRIMENTO' THEN valor ELSE 0 END) as total_suprimentos,
                    SUM(CASE WHEN tipo = 'CANCELAMENTO' THEN valor ELSE 0 END) as total_cancelamentos
                FROM caixa_movimentos
                WHERE caixa_id = ?
                GROUP BY forma_pagamento
            `, [caixaId]);

            // Calcular totalizadores
            const [totais] = await connection.query(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN tipo = 'VENDA' THEN referencia_id END) as total_vendas,
                    COUNT(DISTINCT CASE WHEN tipo = 'CANCELAMENTO' THEN referencia_id END) as total_cancelamentos,
                    SUM(CASE WHEN tipo = 'SANGRIA' THEN valor ELSE 0 END) as total_sangrias,
                    SUM(CASE WHEN tipo = 'SUPRIMENTO' THEN valor ELSE 0 END) as total_suprimentos
                FROM caixa_movimentos
                WHERE caixa_id = ?
            `, [caixaId]);

            // Criar registro de fechamento
            const [result] = await connection.query(`
                INSERT INTO caixa_fechamentos (
                    caixa_id, 
                    data_abertura,
                    data_fechamento,
                    usuario_abertura_id,
                    usuario_fechamento_id,
                    valor_sistema_dinheiro,
                    valor_sistema_pix,
                    valor_sistema_cartao_credito,
                    valor_sistema_cartao_debito,
                    valor_sistema_outros,
                    total_vendas,
                    total_cancelamentos,
                    total_sangrias,
                    total_suprimentos,
                    status
                ) VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO')
            `, [
                caixaId,
                caixa[0].usuario_id,
                usuarioId,
                totaisPorForma.find(t => t.forma_pagamento === 'DINHEIRO')?.total_vendas || 0,
                totaisPorForma.find(t => t.forma_pagamento === 'PIX')?.total_vendas || 0,
                totaisPorForma.find(t => t.forma_pagamento === 'CARTAO_CREDITO')?.total_vendas || 0,
                totaisPorForma.find(t => t.forma_pagamento === 'CARTAO_DEBITO')?.total_vendas || 0,
                totaisPorForma.find(t => t.forma_pagamento === 'OUTROS')?.total_vendas || 0,
                totais[0].total_vendas,
                totais[0].total_cancelamentos,
                totais[0].total_sangrias,
                totais[0].total_suprimentos
            ]);

            const fechamentoId = result.insertId;

            // Registrar detalhes do fechamento
            await connection.query(`
                INSERT INTO caixa_fechamento_detalhes (
                    fechamento_id,
                    tipo_registro,
                    documento_id,
                    valor,
                    forma_pagamento,
                    data_movimento,
                    usuario_id,
                    observacao
                )
                SELECT 
                    ?,
                    tipo,
                    referencia_id,
                    valor,
                    forma_pagamento,
                    data_movimento,
                    usuario_id,
                    observacao
                FROM caixa_movimentos
                WHERE caixa_id = ?
            `, [fechamentoId, caixaId]);

            await connection.commit();
            return { fechamentoId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async concluirFechamento(fechamentoId, dados, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Validar se o fechamento existe e está aberto
            const [fechamento] = await connection.query(
                'SELECT * FROM caixa_fechamentos WHERE id = ? AND status = "ABERTO"',
                [fechamentoId]
            );

            if (fechamento.length === 0) {
                throw new Error('Fechamento não encontrado ou já concluído');
            }

            // Calcular diferenças
            const diferencaDinheiro = dados.valor_informado_dinheiro - fechamento[0].valor_sistema_dinheiro;

            // Atualizar fechamento
            await connection.query(`
                UPDATE caixa_fechamentos SET
                    valor_informado_dinheiro = ?,
                    valor_informado_pix = ?,
                    valor_informado_cartao_credito = ?,
                    valor_informado_cartao_debito = ?,
                    valor_informado_outros = ?,
                    diferenca_dinheiro = ?,
                    diferenca_justificativa = ?,
                    observacoes = ?,
                    status = 'FECHADO',
                    data_fechamento = NOW()
                WHERE id = ?
            `, [
                dados.valor_informado_dinheiro,
                dados.valor_informado_pix,
                dados.valor_informado_cartao_credito,
                dados.valor_informado_cartao_debito,
                dados.valor_informado_outros,
                diferencaDinheiro,
                dados.diferenca_justificativa || null,
                dados.observacoes || null,
                fechamentoId
            ]);

            // Fechar o caixa
            await connection.query(
                'UPDATE caixas SET status = "FECHADO" WHERE id = ?',
                [fechamento[0].caixa_id]
            );

            await connection.commit();
            return { fechamentoId, status: 'FECHADO' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getRelatorioFechamento(fechamentoId) {
        const [fechamento] = await db.query(`
            SELECT 
                cf.*,
                c.numero as caixa_numero,
                ua.nome as usuario_abertura,
                uf.nome as usuario_fechamento,
                uc.nome as conferido_por
            FROM caixa_fechamentos cf
            JOIN caixas c ON cf.caixa_id = c.id
            JOIN usuarios ua ON cf.usuario_abertura_id = ua.id
            JOIN usuarios uf ON cf.usuario_fechamento_id = uf.id
            LEFT JOIN usuarios uc ON cf.conferido_por_id = uc.id
            WHERE cf.id = ?
        `, [fechamentoId]);

        if (fechamento.length === 0) {
            throw new Error('Fechamento não encontrado');
        }

        const [detalhes] = await db.query(`
            SELECT * FROM caixa_fechamento_detalhes
            WHERE fechamento_id = ?
            ORDER BY data_movimento
        `, [fechamentoId]);

        return {
            fechamento: fechamento[0],
            detalhes
        };
    }
}

module.exports = CaixaFechamento;