const Entrega = require('../models/Entrega');
const PDFDocument = require('pdfkit');

class EntregaController {
    static async criarEntrega(req, res) {
        try {
            const { venda_id, ...dados } = req.body;
            const usuario_id = req.user.id;

            if (!venda_id) {
                return res.status(400).json({ message: 'ID da venda é obrigatório' });
            }

            if (!dados.tipo_entrega || !['TOTAL', 'PARCIAL'].includes(dados.tipo_entrega)) {
                return res.status(400).json({ message: 'Tipo de entrega inválido' });
            }

            const resultado = await Entrega.criar(venda_id, dados, usuario_id);
            res.json(resultado);
        } catch (error) {
            console.error('Erro ao criar entrega:', error);
            res.status(500).json({ 
                message: 'Erro ao criar entrega',
                error: error.message 
            });
        }
    }

    static async realizarEntrega(req, res) {
        try {
            const { entrega_id } = req.params;
            const dados = req.body;
            const usuario_id = req.user.id;

            if (!entrega_id) {
                return res.status(400).json({ message: 'ID da entrega é obrigatório' });
            }

            if (!dados.itens || !Array.isArray(dados.itens)) {
                return res.status(400).json({ message: 'Lista de itens é obrigatória' });
            }

            const resultado = await Entrega.realizarEntrega(entrega_id, dados, usuario_id);
            res.json(resultado);
        } catch (error) {
            console.error('Erro ao realizar entrega:', error);
            res.status(500).json({ 
                message: 'Erro ao realizar entrega',
                error: error.message 
            });
        }
    }

    static async getDetalhes(req, res) {
        try {
            const { entrega_id } = req.params;

            if (!entrega_id) {
                return res.status(400).json({ message: 'ID da entrega é obrigatório' });
            }

            const detalhes = await Entrega.getDetalhes(entrega_id);
            res.json(detalhes);
        } catch (error) {
            console.error('Erro ao buscar detalhes da entrega:', error);
            res.status(500).json({ 
                message: 'Erro ao buscar detalhes da entrega',
                error: error.message 
            });
        }
    }

    static async getPendentes(req, res) {
        try {
            const pendentes = await Entrega.getRelatorioPendentes();
            res.json(pendentes);
        } catch (error) {
            console.error('Erro ao buscar entregas pendentes:', error);
            res.status(500).json({ 
                message: 'Erro ao buscar entregas pendentes',
                error: error.message 
            });
        }
    }

    static async gerarComprovante(req, res) {
        try {
            const { entrega_id } = req.params;
            const detalhes = await Entrega.getDetalhes(entrega_id);
            
            const doc = new PDFDocument();
            
            // Configurar resposta
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=entrega_${entrega_id}.pdf`);
            doc.pipe(res);

            // Cabeçalho
            doc.fontSize(16).text('COMPROVANTE DE ENTREGA', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Nº Entrega: ${entrega_id}`);
            doc.text(`Nº Venda: ${detalhes.entrega.numero_venda}`);
            doc.text(`Data: ${new Date(detalhes.entrega.data_criacao).toLocaleDateString()}`);
            doc.moveDown();

            // Dados do Cliente
            doc.fontSize(14).text('CLIENTE');
            doc.fontSize(12).text(`Nome: ${detalhes.entrega.cliente}`);
            doc.text(`Telefone: ${detalhes.entrega.cliente_telefone}`);
            doc.text(`Endereço: ${detalhes.entrega.endereco_entrega}`);
            doc.moveDown();

            // Itens
            doc.fontSize(14).text('ITENS ENTREGUES');
            doc.moveDown();

            // Cabeçalho da tabela
            const headers = ['Código', 'Produto', 'Qtd. Entregue', 'Unidade'];
            const rowHeight = 20;
            const colWidths = [80, 250, 100, 80];
            let y = doc.y;

            // Desenhar cabeçalho
            doc.fontSize(10);
            headers.forEach((header, i) => {
                doc.text(header, doc.x + (i > 0 ? colWidths.slice(0, i).reduce((a, b) => a + b, 0) : 0), y);
            });

            y += rowHeight;

            // Desenhar linhas de itens
            detalhes.itens.forEach(item => {
                if (y > 700) { // Nova página se necessário
                    doc.addPage();
                    y = 50;
                }

                doc.text(item.produto_codigo, doc.x, y);
                doc.text(item.produto_descricao, doc.x + colWidths[0], y);
                doc.text(item.quantidade_entregue.toString(), doc.x + colWidths[0] + colWidths[1], y);
                doc.text(item.unidade, doc.x + colWidths[0] + colWidths[1] + colWidths[2], y);

                y += rowHeight;
            });

            doc.moveDown(2);

            // Assinaturas
            doc.fontSize(12);
            doc.text('_______________________', 50, doc.y);
            doc.text('Entregador', 85, doc.y + 10);
            
            doc.text('_______________________', 300, doc.y - 12);
            doc.text('Cliente', 350, doc.y - 2);

            // Observações
            if (detalhes.entrega.observacoes) {
                doc.moveDown(2);
                doc.fontSize(12).text('Observações:');
                doc.fontSize(10).text(detalhes.entrega.observacoes);
            }

            // Finalizar PDF
            doc.end();

        } catch (error) {
            console.error('Erro ao gerar comprovante:', error);
            res.status(500).json({ 
                message: 'Erro ao gerar comprovante',
                error: error.message 
            });
        }
    }
}

module.exports = EntregaController;