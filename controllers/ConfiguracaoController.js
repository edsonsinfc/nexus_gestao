const Configuracao = require('../models/Configuracao');

class ConfiguracaoController {
    static async getAll(req, res) {
        try {
            const configs = await Configuracao.getAll();
            res.json(configs);
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            res.status(500).json({ 
                message: 'Erro ao buscar configurações',
                error: error.message 
            });
        }
    }

    static async update(req, res) {
        try {
            const configs = req.body;
            const usuarioId = req.user.id; // Assume que o middleware de autenticação adiciona o usuário ao req

            // Validação básica
            if (!configs || Object.keys(configs).length === 0) {
                return res.status(400).json({ 
                    message: 'Nenhuma configuração fornecida para atualização' 
                });
            }

            // Validações específicas
            if (configs.nfe_serie && (!Number.isInteger(Number(configs.nfe_serie)) || Number(configs.nfe_serie) < 1)) {
                return res.status(400).json({ 
                    message: 'Série da NFe deve ser um número inteiro positivo' 
                });
            }

            if (configs.nfe_proxima_numeracao && 
                (!Number.isInteger(Number(configs.nfe_proxima_numeracao)) || 
                Number(configs.nfe_proxima_numeracao) < 1)) {
                return res.status(400).json({ 
                    message: 'Próxima numeração da NFe deve ser um número inteiro positivo' 
                });
            }

            if (configs.empresa_cnpj && !configs.empresa_cnpj.match(/^\d{14}$/)) {
                return res.status(400).json({ 
                    message: 'CNPJ deve conter 14 dígitos numéricos' 
                });
            }

            await Configuracao.update(configs, usuarioId);
            
            res.json({ 
                message: 'Configurações atualizadas com sucesso',
                configuracoes: await Configuracao.getAll()
            });
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            res.status(500).json({ 
                message: 'Erro ao atualizar configurações',
                error: error.message 
            });
        }
    }
}

module.exports = ConfiguracaoController;