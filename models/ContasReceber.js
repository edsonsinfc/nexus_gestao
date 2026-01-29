const db = require('../db');

class ContasReceber {
    static async criar(venda, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar se já existe conta a receber para esta venda
            const [existente] = await connection.query(
                'SELECT id FROM contas_receber WHERE venda_id = ? AND status != "CANCELADO"',
                [venda.id]
            );

            if (existente.length > 0) {
                throw new Error('Já existe conta a receber para esta venda');
            }

            // Se for dinheiro ou PIX, não criar conta a receber
            if (['DINHEIRO', 'PIX'].includes(venda.forma_pagamento)) {
                await connection.commit();
                return null;
            }

            // Criar conta a receber
            const [result] = await connection.query(`
                INSERT INTO contas_receber (
                    venda_id,
                    cliente_id,
                    valor_total,
                    valor_restante,
                    data_vencimento,
                    forma_pagamento,
                    parcelas,
                    observacoes,
                    usuario_criacao_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                venda.id,
                venda.cliente_id,
                venda.valor_total,
                venda.valor_total,
                venda.data_vencimento,
                venda.forma_pagamento,
                venda.parcelas || 1,
                venda.observacoes,
                usuarioId
            ]);

            const contaId = result.insertId;

            // Criar parcelas
            const valorParcela = venda.valor_total / (venda.parcelas || 1);
            let dataVencimento = new Date(venda.data_vencimento);

            for (let i = 1; i <= (venda.parcelas || 1); i++) {
                await connection.query(`
                    INSERT INTO contas_receber_parcelas (
                        conta_receber_id,
                        numero_parcela,
                        valor_parcela,
                        data_vencimento
                    ) VALUES (?, ?, ?, ?)
                `, [
                    contaId,
                    i,
                    valorParcela,
                    dataVencimento
                ]);

                // Próximo vencimento
                dataVencimento.setMonth(dataVencimento.getMonth() + 1);
            }

            await connection.commit();
            return { contaId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async registrarPagamento(parcelaId, dados, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Buscar parcela
            const [parcela] = await connection.query(`
                SELECT p.*, c.valor_total, c.valor_restante 
                FROM contas_receber_parcelas p
                JOIN contas_receber c ON p.conta_receber_id = c.id
                WHERE p.id = ? AND p.status = 'PENDENTE'
            `, [parcelaId]);

            if (parcela.length === 0) {
                throw new Error('Parcela não encontrada ou já paga');
            }

            const valorPago = Number(dados.valor_pago);
            if (valorPago <= 0 || valorPago > parcela[0].valor_parcela) {
                throw new Error('Valor de pagamento inválido');
            }

            // Atualizar parcela
            await connection.query(`
                UPDATE contas_receber_parcelas SET
                    valor_pago = ?,
                    data_pagamento = NOW(),
                    status = 'PAGO',
                    forma_pagamento = ?,
                    observacoes = ?
                WHERE id = ?
            `, [
                valorPago,
                dados.forma_pagamento,
                dados.observacoes,
                parcelaId
            ]);

            // Atualizar conta principal
            await connection.query(`
                UPDATE contas_receber SET
                    valor_restante = valor_restante - ?,
                    status = CASE 
                        WHEN valor_restante - ? <= 0 THEN 'QUITADO'
                        ELSE 'PARCIAL'
                    END
                WHERE id = ?
            `, [
                valorPago,
                valorPago,
                parcela[0].conta_receber_id
            ]);

            await connection.commit();
            return { status: 'success' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cancelar(contaId, motivo, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar se a conta existe e pode ser cancelada
            const [conta] = await connection.query(`
                SELECT * FROM contas_receber 
                WHERE id = ? AND status NOT IN ('QUITADO', 'CANCELADO')
            `, [contaId]);

            if (conta.length === 0) {
                throw new Error('Conta não encontrada ou não pode ser cancelada');
            }

            // Cancelar conta
            await connection.query(`
                UPDATE contas_receber SET
                    status = 'CANCELADO',
                    observacoes = CONCAT(observacoes, '\nCancelada: ', ?)
                WHERE id = ?
            `, [motivo, contaId]);

            // Cancelar parcelas pendentes
            await connection.query(`
                UPDATE contas_receber_parcelas SET
                    status = 'CANCELADO',
                    observacoes = CONCAT(COALESCE(observacoes, ''), '\nCancelada: ', ?)
                WHERE conta_receber_id = ? AND status = 'PENDENTE'
            `, [motivo, contaId]);

            await connection.commit();
            return { status: 'success' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async listarPendentes() {
        return await db.query(`
            SELECT 
                cr.*,
                c.nome_razao_social as cliente_nome,
                c.telefone as cliente_telefone,
                v.numero as numero_venda,
                COUNT(p.id) as total_parcelas,
                SUM(CASE WHEN p.status = 'PENDENTE' THEN 1 ELSE 0 END) as parcelas_pendentes
            FROM contas_receber cr
            JOIN clientes c ON cr.cliente_id = c.id
            JOIN vendas v ON cr.venda_id = v.id
            LEFT JOIN contas_receber_parcelas p ON cr.id = p.conta_receber_id
            WHERE cr.status IN ('PENDENTE', 'PARCIAL')
            GROUP BY cr.id
            ORDER BY cr.data_vencimento
        `);
    }

    static async getDetalhes(contaId) {
        const [conta] = await db.query(`
            SELECT 
                cr.*,
                c.nome_razao_social as cliente_nome,
                c.telefone as cliente_telefone,
                v.numero as numero_venda,
                u.nome as usuario_criacao
            FROM contas_receber cr
            JOIN clientes c ON cr.cliente_id = c.id
            JOIN vendas v ON cr.venda_id = v.id
            JOIN usuarios u ON cr.usuario_criacao_id = u.id
            WHERE cr.id = ?
        `, [contaId]);

        if (conta.length === 0) {
            throw new Error('Conta não encontrada');
        }

        const [parcelas] = await db.query(`
            SELECT * FROM contas_receber_parcelas
            WHERE conta_receber_id = ?
            ORDER BY numero_parcela
        `, [contaId]);

        return {
            conta: conta[0],
            parcelas
        };
    }
}

module.exports = ContasReceber;