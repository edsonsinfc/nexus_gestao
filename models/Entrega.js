const db = require('../db');

class Entrega {
    static async criar(vendaId, dados, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar se a venda existe e está confirmada
            const [venda] = await connection.query(
                'SELECT * FROM vendas WHERE id = ? AND status = "CONFIRMADA"',
                [vendaId]
            );

            if (venda.length === 0) {
                throw new Error('Venda não encontrada ou não está confirmada');
            }

            // Inserir entrega
            const [result] = await connection.query(`
                INSERT INTO entregas (
                    venda_id,
                    tipo_entrega,
                    status,
                    previsao_entrega,
                    motorista,
                    placa_veiculo,
                    telefone_contato,
                    endereco_entrega,
                    observacoes,
                    usuario_criacao_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                vendaId,
                dados.tipo_entrega,
                'PENDENTE',
                dados.previsao_entrega,
                dados.motorista,
                dados.placa_veiculo,
                dados.telefone_contato,
                dados.endereco_entrega,
                dados.observacoes,
                usuarioId
            ]);

            const entregaId = result.insertId;

            // Buscar itens da venda
            const [itensVenda] = await connection.query(
                'SELECT * FROM venda_itens WHERE venda_id = ?',
                [vendaId]
            );

            // Inserir itens da entrega
            for (const item of itensVenda) {
                const qtdEntregar = dados.tipo_entrega === 'TOTAL' ? 
                    item.quantidade : 
                    (dados.itens[item.id]?.quantidade || 0);

                await connection.query(`
                    INSERT INTO entrega_itens (
                        entrega_id,
                        venda_item_id,
                        produto_id,
                        quantidade_vendida,
                        quantidade_entregar,
                        unidade,
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    entregaId,
                    item.id,
                    item.produto_id,
                    item.quantidade,
                    qtdEntregar,
                    item.unidade,
                    'PENDENTE'
                ]);
            }

            // Registrar histórico
            await connection.query(`
                INSERT INTO entrega_historicos (
                    entrega_id,
                    tipo_movimento,
                    status_anterior,
                    status_novo,
                    observacao,
                    usuario_id
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                entregaId,
                'SEPARACAO',
                null,
                'PENDENTE',
                'Entrega criada',
                usuarioId
            ]);

            await connection.commit();
            return { entregaId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async realizarEntrega(entregaId, dados, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar se a entrega existe e está pendente ou parcial
            const [entrega] = await connection.query(
                'SELECT * FROM entregas WHERE id = ? AND status IN ("PENDENTE", "PARCIAL")',
                [entregaId]
            );

            if (entrega.length === 0) {
                throw new Error('Entrega não encontrada ou já finalizada');
            }

            // Atualizar quantidades entregues e baixar estoque
            for (const itemEntrega of dados.itens) {
                const [item] = await connection.query(
                    'SELECT * FROM entrega_itens WHERE id = ? AND entrega_id = ?',
                    [itemEntrega.id, entregaId]
                );

                if (item.length === 0) continue;

                const quantidadeEntregue = Number(itemEntrega.quantidade || 0);
                if (quantidadeEntregue <= 0) continue;

                // Verificar se quantidade é válida
                if (quantidadeEntregue > (item[0].quantidade_entregar - item[0].quantidade_entregue)) {
                    throw new Error(`Quantidade inválida para o item ${item[0].produto_id}`);
                }

                // Atualizar item da entrega
                await connection.query(`
                    UPDATE entrega_itens SET
                        quantidade_entregue = quantidade_entregue + ?,
                        status = CASE 
                            WHEN quantidade_entregue + ? >= quantidade_entregar THEN 'ENTREGUE'
                            ELSE 'PARCIAL'
                        END,
                        data_ultima_entrega = NOW(),
                        usuario_ultima_entrega_id = ?
                    WHERE id = ?
                `, [
                    quantidadeEntregue,
                    quantidadeEntregue,
                    usuarioId,
                    itemEntrega.id
                ]);

                // Baixar estoque
                await connection.query(`
                    INSERT INTO entrega_estoque_movimentos (
                        entrega_id,
                        entrega_item_id,
                        produto_id,
                        tipo_movimento,
                        quantidade,
                        usuario_id,
                        observacao
                    ) VALUES (?, ?, ?, 'SAIDA', ?, ?, 'Baixa por entrega')
                `, [
                    entregaId,
                    itemEntrega.id,
                    item[0].produto_id,
                    quantidadeEntregue,
                    usuarioId
                ]);

                // Atualizar estoque do produto
                await connection.query(`
                    UPDATE produtos SET
                        estoque_atual = estoque_atual - ?
                    WHERE id = ?
                `, [
                    quantidadeEntregue,
                    item[0].produto_id
                ]);
            }

            // Verificar se todos os itens foram entregues
            const [itensRestantes] = await connection.query(`
                SELECT COUNT(*) as total 
                FROM entrega_itens 
                WHERE entrega_id = ? AND status != 'ENTREGUE'
            `, [entregaId]);

            const novoStatus = itensRestantes[0].total === 0 ? 'ENTREGUE' : 'PARCIAL';

            // Atualizar entrega
            await connection.query(`
                UPDATE entregas SET
                    status = ?,
                    data_entrega = NOW(),
                    usuario_entrega_id = ?,
                    motorista = COALESCE(?, motorista),
                    placa_veiculo = COALESCE(?, placa_veiculo),
                    assinatura_cliente = ?,
                    comprovante_foto = ?
                WHERE id = ?
            `, [
                novoStatus,
                usuarioId,
                dados.motorista,
                dados.placa_veiculo,
                dados.assinatura_cliente,
                dados.comprovante_foto,
                entregaId
            ]);

            // Registrar histórico
            await connection.query(`
                INSERT INTO entrega_historicos (
                    entrega_id,
                    tipo_movimento,
                    status_anterior,
                    status_novo,
                    observacao,
                    usuario_id
                ) VALUES (?, 'ENTREGA', ?, ?, ?, ?)
            `, [
                entregaId,
                entrega[0].status,
                novoStatus,
                dados.observacao || 'Entrega realizada',
                usuarioId
            ]);

            await connection.commit();
            return { status: novoStatus };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getDetalhes(entregaId) {
        const [entrega] = await db.query(`
            SELECT 
                e.*,
                v.numero as numero_venda,
                v.data_venda,
                c.nome_razao_social as cliente,
                c.telefone as cliente_telefone,
                u1.nome as usuario_criacao,
                u2.nome as usuario_separacao,
                u3.nome as usuario_entrega
            FROM entregas e
            JOIN vendas v ON e.venda_id = v.id
            JOIN clientes c ON v.cliente_id = c.id
            JOIN usuarios u1 ON e.usuario_criacao_id = u1.id
            LEFT JOIN usuarios u2 ON e.usuario_separacao_id = u2.id
            LEFT JOIN usuarios u3 ON e.usuario_entrega_id = u3.id
            WHERE e.id = ?
        `, [entregaId]);

        if (entrega.length === 0) {
            throw new Error('Entrega não encontrada');
        }

        const [itens] = await db.query(`
            SELECT 
                ei.*,
                p.descricao as produto_descricao,
                p.codigo_principal as produto_codigo
            FROM entrega_itens ei
            JOIN produtos p ON ei.produto_id = p.id
            WHERE ei.entrega_id = ?
            ORDER BY ei.id
        `, [entregaId]);

        const [historico] = await db.query(`
            SELECT 
                h.*,
                u.nome as usuario_nome
            FROM entrega_historicos h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.entrega_id = ?
            ORDER BY h.data_movimento DESC
        `, [entregaId]);

        return {
            entrega: entrega[0],
            itens,
            historico
        };
    }

    static async getRelatorioPendentes() {
        return await db.query(`
            SELECT 
                e.*,
                v.numero as numero_venda,
                v.data_venda,
                c.nome_razao_social as cliente,
                c.telefone as cliente_telefone,
                COUNT(ei.id) as total_itens,
                SUM(CASE WHEN ei.status = 'PENDENTE' THEN 1 ELSE 0 END) as itens_pendentes,
                SUM(CASE WHEN ei.status = 'PARCIAL' THEN 1 ELSE 0 END) as itens_parciais,
                SUM(CASE WHEN ei.status = 'ENTREGUE' THEN 1 ELSE 0 END) as itens_entregues
            FROM entregas e
            JOIN vendas v ON e.venda_id = v.id
            JOIN clientes c ON v.cliente_id = c.id
            JOIN entrega_itens ei ON e.id = ei.entrega_id
            WHERE e.status IN ('PENDENTE', 'PARCIAL')
            GROUP BY e.id
            ORDER BY e.previsao_entrega, e.data_criacao
        `);
    }
}

module.exports = Entrega;