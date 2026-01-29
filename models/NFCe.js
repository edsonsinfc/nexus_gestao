const db = require('../db');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const Configuracao = require('./Configuracao');

class NFCe {
    static async emitir(vendaId, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Buscar dados da venda
            const [venda] = await connection.query(`
                SELECT v.*, c.*, u.nome as vendedor_nome
                FROM vendas v
                JOIN clientes c ON v.cliente_id = c.id
                JOIN usuarios u ON v.vendedor_id = u.id
                WHERE v.id = ?
            `, [vendaId]);

            if (venda.length === 0) {
                throw new Error('Venda não encontrada');
            }

            // Buscar itens da venda
            const [itens] = await connection.query(`
                SELECT vi.*, p.*
                FROM venda_itens vi
                JOIN produtos p ON vi.produto_id = p.id
                WHERE vi.venda_id = ?
            `, [vendaId]);

            // Buscar configurações necessárias
            const config = await Configuracao.getAll();

            // Gerar XML da NFCe
            const xmlNFCe = await this.gerarXML(venda[0], itens, config);

            // Assinar XML com certificado
            const xmlAssinado = await this.assinarXML(xmlNFCe, config);

            // Transmitir para SEFAZ
            const retorno = await this.transmitirSEFAZ(xmlAssinado, config);

            // Se autorizado, salvar NFCe
            if (retorno.status === 'AUTORIZADA') {
                await connection.query(`
                    INSERT INTO nfce (
                        venda_id,
                        numero,
                        serie,
                        chave_acesso,
                        status,
                        ambiente,
                        protocolo_autorizacao,
                        data_emissao,
                        data_autorizacao,
                        xml_envio,
                        xml_retorno,
                        danfe_html,
                        url_consulta
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?)
                `, [
                    vendaId,
                    retorno.numero,
                    config.nfce_serie,
                    retorno.chaveAcesso,
                    'AUTORIZADA',
                    config.nfce_ambiente,
                    retorno.protocolo,
                    xmlAssinado,
                    retorno.xmlRetorno,
                    retorno.danfeHtml,
                    retorno.urlConsulta
                ]);

                // Atualizar status da venda
                await connection.query(`
                    UPDATE vendas 
                    SET status = 'FATURADA', 
                        nfce_numero = ?,
                        nfce_serie = ?
                    WHERE id = ?
                `, [retorno.numero, config.nfce_serie, vendaId]);
            }

            await connection.commit();
            return retorno;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cancelar(nfceId, motivo, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Buscar dados da NFCe
            const [nfce] = await connection.query(
                'SELECT * FROM nfce WHERE id = ? AND status = "AUTORIZADA"',
                [nfceId]
            );

            if (nfce.length === 0) {
                throw new Error('NFCe não encontrada ou não está autorizada');
            }

            const config = await Configuracao.getAll();

            // Cancelar na SEFAZ
            const retorno = await this.cancelarSEFAZ(nfce[0], motivo, config);

            if (retorno.status === 'CANCELADA') {
                // Atualizar NFCe
                await connection.query(`
                    UPDATE nfce SET
                        status = 'CANCELADA',
                        protocolo_cancelamento = ?,
                        motivo_cancelamento = ?,
                        data_cancelamento = NOW()
                    WHERE id = ?
                `, [retorno.protocolo, motivo, nfceId]);

                // Atualizar venda
                await connection.query(`
                    UPDATE vendas SET
                        status = 'CANCELADA'
                    WHERE id = ?
                `, [nfce[0].venda_id]);
            }

            await connection.commit();
            return retorno;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async gerarXML(venda, itens, config) {
        // Implementar geração do XML conforme layout da SEFAZ
        // Esta é uma versão simplificada, você precisará implementar de acordo com
        // o layout específico da sua UF
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
                <!-- Implementar layout completo aqui -->
            </NFe>`;
        
        return xml;
    }

    static async assinarXML(xml, config) {
        // Implementar assinatura do XML usando certificado digital
        // Esta é uma versão simplificada, você precisará implementar a assinatura real
        return xml;
    }

    static async transmitirSEFAZ(xml, config) {
        // Implementar comunicação com a SEFAZ
        // Esta é uma versão simplificada, você precisará implementar a comunicação real
        return {
            status: 'AUTORIZADA',
            numero: '000000001',
            chaveAcesso: '12345678901234567890123456789012345678901234',
            protocolo: '123456789012345',
            xmlRetorno: '<retorno>...</retorno>',
            danfeHtml: '<html>...</html>',
            urlConsulta: 'https://www.sefaz.uf.gov.br/consulta'
        };
    }

    static async cancelarSEFAZ(nfce, motivo, config) {
        // Implementar cancelamento na SEFAZ
        // Esta é uma versão simplificada, você precisará implementar o cancelamento real
        return {
            status: 'CANCELADA',
            protocolo: '987654321098765'
        };
    }

    static async converterParaFiscal(vendaId, usuarioId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar se a venda existe e é não fiscal
            const [venda] = await connection.query(`
                SELECT * FROM vendas 
                WHERE id = ? AND tipo = 'NAO_FISCAL' AND status = 'CONFIRMADA'
            `, [vendaId]);

            if (venda.length === 0) {
                throw new Error('Venda não encontrada ou não pode ser convertida');
            }

            // Atualizar tipo da venda
            await connection.query(`
                UPDATE vendas SET
                    tipo = 'FISCAL'
                WHERE id = ?
            `, [vendaId]);

            // Emitir NFCe
            const retorno = await this.emitir(vendaId, usuarioId);

            await connection.commit();
            return retorno;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = NFCe;