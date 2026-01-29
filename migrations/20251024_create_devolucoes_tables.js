const utils = require('../utils/migrationUtils');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Tabela principal de devoluções
            await queryInterface.createTable('devolucoes', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                venda_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'vendas',
                        key: 'id'
                    }
                },
                cliente_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'clientes',
                        key: 'id'
                    }
                },
                tipo_operacao: {
                    type: Sequelize.ENUM('DEVOLUCAO', 'TROCA'),
                    allowNull: false
                },
                valor_total: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                forma_ressarcimento: {
                    type: Sequelize.ENUM('ABATER_VENDA', 'CREDITO', 'TROCA'),
                    allowNull: false
                },
                motivo: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                observacoes: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                usuario_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'usuarios',
                        key: 'id'
                    }
                },
                ...utils.commonFields(Sequelize)
            }, { transaction });

            // Tabela de itens devolvidos
            await queryInterface.createTable('devolucoes_itens', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                devolucao_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'devolucoes',
                        key: 'id'
                    }
                },
                produto_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'produtos',
                        key: 'id'
                    }
                },
                quantidade: {
                    type: Sequelize.DECIMAL(10, 3),
                    allowNull: false
                },
                valor_unitario: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                valor_total: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                motivo: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                ...utils.commonFields(Sequelize)
            }, { transaction });

            // Tabela de créditos do cliente
            await queryInterface.createTable('creditos_cliente', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                cliente_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'clientes',
                        key: 'id'
                    }
                },
                valor: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                valor_utilizado: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0
                },
                origem: {
                    type: Sequelize.ENUM('DEVOLUCAO', 'OUTROS'),
                    allowNull: false
                },
                origem_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                validade: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                status: {
                    type: Sequelize.ENUM('DISPONIVEL', 'UTILIZADO', 'VENCIDO'),
                    allowNull: false,
                    defaultValue: 'DISPONIVEL'
                },
                usuario_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'usuarios',
                        key: 'id'
                    }
                },
                ...utils.commonFields(Sequelize)
            }, { transaction });

            // Tabela de pagamentos de diferença (para trocas)
            await queryInterface.createTable('pagamentos_diferenca', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                devolucao_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'devolucoes',
                        key: 'id'
                    }
                },
                valor: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                tipo: {
                    type: Sequelize.ENUM('CLIENTE_PAGA', 'LOJA_DEVOLVE'),
                    allowNull: false
                },
                forma_pagamento: {
                    type: Sequelize.STRING(50),
                    allowNull: false
                },
                status: {
                    type: Sequelize.ENUM('PENDENTE', 'PAGO', 'CANCELADO'),
                    allowNull: false,
                    defaultValue: 'PENDENTE'
                },
                ...utils.commonFields(Sequelize)
            }, { transaction });

            // Índices
            await queryInterface.addIndex('devolucoes', ['venda_id'], { transaction });
            await queryInterface.addIndex('devolucoes', ['cliente_id'], { transaction });
            await queryInterface.addIndex('devolucoes_itens', ['devolucao_id'], { transaction });
            await queryInterface.addIndex('devolucoes_itens', ['produto_id'], { transaction });
            await queryInterface.addIndex('creditos_cliente', ['cliente_id'], { transaction });
            await queryInterface.addIndex('creditos_cliente', ['status'], { transaction });
            await queryInterface.addIndex('creditos_cliente', ['validade'], { transaction });
            await queryInterface.addIndex('pagamentos_diferenca', ['devolucao_id'], { transaction });
            await queryInterface.addIndex('pagamentos_diferenca', ['status'], { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.dropTable('pagamentos_diferenca', { transaction });
            await queryInterface.dropTable('creditos_cliente', { transaction });
            await queryInterface.dropTable('devolucoes_itens', { transaction });
            await queryInterface.dropTable('devolucoes', { transaction });
            
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};