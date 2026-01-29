const db = require('../db');
const NFCe = require('./NFCe');

class Devolucoes {
    static async registrarDevolucao(dados, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar venda
            const [venda] = await connection.query(
                'SELECT * FROM vendas WHERE id = ? AND status != "CANCELADO"',
                [dados.venda_id]
            );

            if (venda.length === 0) {
                throw new Error('Venda não encontrada ou já cancelada');
            }

            // Criar registro de devolução
            const [result] = await connection.query(`
                INSERT INTO devolucoes (
                    venda_id,
                    cliente_id,
                    tipo_operacao,
                    valor_total,
                    forma_ressarcimento,
                    motivo,
                    observacoes,
                    usuario_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                dados.venda_id,
                venda[0].cliente_id,
                dados.tipo_operacao, // DEVOLUCAO, TROCA
                dados.valor_total,
                dados.forma_ressarcimento, // ABATER_VENDA, CREDITO, TROCA
                dados.motivo,
                dados.observacoes,
                usuarioId
            ]);

            const devolucaoId = result.insertId;

            // Registrar itens devolvidos
            for (const item of dados.itens) {
                await connection.query(`
                    INSERT INTO devolucoes_itens (
                        devolucao_id,
                        produto_id,
                        quantidade,
                        valor_unitario,
                        valor_total,
                        motivo
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    devolucaoId,
                    item.produto_id,
                    item.quantidade,
                    item.valor_unitario,
                    item.quantidade * item.valor_unitario,
                    item.motivo
                ]);

                // Atualizar estoque
                await connection.query(`
                    UPDATE produtos SET
                        estoque_atual = estoque_atual + ?
                    WHERE id = ?
                `, [item.quantidade, item.produto_id]);
            }

            // Processar ressarcimento
            switch (dados.forma_ressarcimento) {
                case 'ABATER_VENDA':
                    // Reduzir valor da venda original
                    await connection.query(`
                        UPDATE vendas SET
                            valor_total = valor_total - ?,
                            valor_final = valor_final - ?
                        WHERE id = ?
                    `, [dados.valor_total, dados.valor_total, dados.venda_id]);

                    // Se for NFCe, emitir nota de devolução
                    if (venda[0].tipo === 'NFCe') {
                        await NFCe.emitirDevolucao({
                            venda_id: dados.venda_id,
                            devolucao_id: devolucaoId,
                            valor: dados.valor_total,
                            itens: dados.itens
                        });
                    }
                    break;

                case 'CREDITO':
                    // Criar crédito para o cliente
                    await connection.query(`
                        INSERT INTO creditos_cliente (
                            cliente_id,
                            valor,
                            origem,
                            origem_id,
                            validade,
                            usuario_id
                        ) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY), ?)
                    `, [
                        venda[0].cliente_id,
                        dados.valor_total,
                        'DEVOLUCAO',
                        devolucaoId,
                        usuarioId
                    ]);
                    break;

                case 'TROCA':
                    // Registrar diferença de valores para troca
                    if (dados.valor_diferenca) {
                        if (dados.valor_diferenca > 0) {
                            // Cliente deve pagar a diferença
                            await connection.query(`
                                INSERT INTO pagamentos_diferenca (
                                    devolucao_id,
                                    valor,
                                    tipo,
                                    forma_pagamento,
                                    status
                                ) VALUES (?, ?, 'CLIENTE_PAGA', ?, 'PENDENTE')
                            `, [devolucaoId, dados.valor_diferenca, dados.forma_pagamento_diferenca]);
                        } else {
                            // Loja deve devolver a diferença
                            await connection.query(`
                                INSERT INTO pagamentos_diferenca (
                                    devolucao_id,
                                    valor,
                                    tipo,
                                    forma_pagamento,
                                    status
                                ) VALUES (?, ?, 'LOJA_DEVOLVE', ?, 'PENDENTE')
                            `, [devolucaoId, Math.abs(dados.valor_diferenca), dados.forma_pagamento_diferenca]);
                        }
                    }
                    break;
            }

            await connection.commit();
            return { devolucaoId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cancelarVenda(vendaId, motivo, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar venda
            const [venda] = await connection.query(
                'SELECT * FROM vendas WHERE id = ? AND status != "CANCELADO"',
                [vendaId]
            );

            if (venda.length === 0) {
                throw new Error('Venda não encontrada ou já cancelada');
            }

            // Se for NFCe, cancelar no SEFAZ
            if (venda[0].tipo === 'NFCe') {
                await NFCe.cancelar(vendaId, motivo);
            }

            // Cancelar venda
            await connection.query(`
                UPDATE vendas SET
                    status = 'CANCELADO',
                    motivo_cancelamento = ?,
                    data_cancelamento = NOW(),
                    usuario_cancelamento_id = ?
                WHERE id = ?
            `, [motivo, usuarioId, vendaId]);

            // Retornar produtos ao estoque
            const [itens] = await connection.query(
                'SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = ?',
                [vendaId]
            );

            for (const item of itens) {
                await connection.query(`
                    UPDATE produtos SET
                        estoque_atual = estoque_atual + ?
                    WHERE id = ?
                `, [item.quantidade, item.produto_id]);
            }

            // Cancelar conta a receber se existir
            await connection.query(`
                UPDATE contas_receber SET
                    status = 'CANCELADO',
                    observacoes = CONCAT(COALESCE(observacoes, ''), '\nCancelamento de venda: ', ?)
                WHERE venda_id = ? AND status != 'QUITADO'
            `, [motivo, vendaId]);

            await connection.commit();
            return { status: 'success' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async listarDevolucoes(filtros = {}) {
        let query = `
            SELECT 
                d.*,
                c.nome_razao_social as cliente_nome,
                v.numero as numero_venda,
                u.nome as usuario_nome
            FROM devolucoes d
            JOIN clientes c ON d.cliente_id = c.id
            JOIN vendas v ON d.venda_id = v.id
            JOIN usuarios u ON d.usuario_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (filtros.dataInicio) {
            query += ' AND d.created_at >= ?';
            params.push(filtros.dataInicio);
        }

        if (filtros.dataFim) {
            query += ' AND d.created_at <= ?';
            params.push(filtros.dataFim);
        }

        if (filtros.cliente_id) {
            query += ' AND d.cliente_id = ?';
            params.push(filtros.cliente_id);
        }

        query += ' ORDER BY d.created_at DESC';

        return await db.query(query, params);
    }

    static async getDetalhes(devolucaoId) {
        const [devolucao] = await db.query(`
            SELECT 
                d.*,
                c.nome_razao_social as cliente_nome,
                v.numero as numero_venda,
                u.nome as usuario_nome
            FROM devolucoes d
            JOIN clientes c ON d.cliente_id = c.id
            JOIN vendas v ON d.venda_id = v.id
            JOIN usuarios u ON d.usuario_id = u.id
            WHERE d.id = ?
        `, [devolucaoId]);

        if (devolucao.length === 0) {
            throw new Error('Devolução não encontrada');
        }

        const [itens] = await db.query(`
            SELECT 
                di.*,
                p.descricao as produto_descricao
            FROM devolucoes_itens di
            JOIN produtos p ON di.produto_id = p.id
            WHERE di.devolucao_id = ?
        `, [devolucaoId]);

        const [diferenca] = await db.query(`
            SELECT * FROM pagamentos_diferenca
            WHERE devolucao_id = ?
        `, [devolucaoId]);

        return {
            devolucao: devolucao[0],
            itens,
            diferenca: diferenca[0] || null
        };
    }
}

module.exports = Devolucoes;