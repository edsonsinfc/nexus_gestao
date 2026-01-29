const CaixaFechamento = require('../models/CaixaFechamento');

class CaixaFechamentoController {
    static async iniciarFechamento(req, res) {
        try {
            const { caixa_id } = req.body;
            const usuario_id = req.user.id;

            if (!caixa_id) {
                return res.status(400).json({ message: 'ID do caixa é obrigatório' });
            }

            const resultado = await CaixaFechamento.iniciarFechamento(caixa_id, usuario_id);
            res.json(resultado);
        } catch (error) {
            console.error('Erro ao iniciar fechamento:', error);
            res.status(500).json({ 
                message: 'Erro ao iniciar fechamento de caixa',
                error: error.message 
            });
        }
    }

    static async concluirFechamento(req, res) {
        try {
            const { fechamento_id } = req.params;
            const dados = req.body;
            const usuario_id = req.user.id;

            if (!fechamento_id) {
                return res.status(400).json({ message: 'ID do fechamento é obrigatório' });
            }

            // Validar dados obrigatórios
            const camposObrigatorios = [
                'valor_informado_dinheiro',
                'valor_informado_pix',
                'valor_informado_cartao_credito',
                'valor_informado_cartao_debito',
                'valor_informado_outros'
            ];

            for (const campo of camposObrigatorios) {
                if (typeof dados[campo] !== 'number') {
                    return res.status(400).json({ 
                        message: `Campo ${campo} é obrigatório e deve ser um número` 
                    });
                }
            }

            const resultado = await CaixaFechamento.concluirFechamento(
                fechamento_id, 
                dados, 
                usuario_id
            );

            res.json(resultado);
        } catch (error) {
            console.error('Erro ao concluir fechamento:', error);
            res.status(500).json({ 
                message: 'Erro ao concluir fechamento de caixa',
                error: error.message 
            });
        }
    }

    static async getRelatorio(req, res) {
        try {
            const { fechamento_id } = req.params;

            if (!fechamento_id) {
                return res.status(400).json({ message: 'ID do fechamento é obrigatório' });
            }

            const relatorio = await CaixaFechamento.getRelatorioFechamento(fechamento_id);
            res.json(relatorio);
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            res.status(500).json({ 
                message: 'Erro ao gerar relatório de fechamento',
                error: error.message 
            });
        }
    }
}

module.exports = CaixaFechamentoController;