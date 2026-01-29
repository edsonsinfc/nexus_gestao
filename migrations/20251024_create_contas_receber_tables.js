const utils = require('../utils/migrationUtils');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Tabela principal de contas a receber
            await queryInterface.createTable('contas_receber', {
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
                valor_total: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                valor_restante: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                data_vencimento: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                forma_pagamento: {
                    type: Sequelize.STRING(50),
                    allowNull: false
                },
                parcelas: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 1
                },
                status: {
                    type: Sequelize.ENUM('PENDENTE', 'PARCIAL', 'QUITADO', 'CANCELADO'),
                    allowNull: false,
                    defaultValue: 'PENDENTE'
                },
                observacoes: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                usuario_criacao_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'usuarios',
                        key: 'id'
                    }
                },
                ...utils.commonFields(Sequelize)
            }, { transaction });

            // Tabela de parcelas
            await queryInterface.createTable('contas_receber_parcelas', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                conta_receber_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'contas_receber',
                        key: 'id'
                    }
                },
                numero_parcela: {
                    type: Sequelize.INTEGER,
                    allowNull: false
                },
                valor_parcela: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: false
                },
                valor_pago: {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: true
                },
                data_vencimento: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                data_pagamento: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                status: {
                    type: Sequelize.ENUM('PENDENTE', 'PAGO', 'CANCELADO'),
                    allowNull: false,
                    defaultValue: 'PENDENTE'
                },
                forma_pagamento: {
                    type: Sequelize.STRING(50),
                    allowNull: true
                },
                observacoes: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                ...utils.commonFields(Sequelize)
            }, { transaction });

            // Índices para melhor performance
            await queryInterface.addIndex('contas_receber', ['venda_id'], {
                unique: true,
                where: {
                    status: {
                        [Sequelize.Op.ne]: 'CANCELADO'
                    }
                },
                transaction
            });

            await queryInterface.addIndex('contas_receber', ['cliente_id'], { transaction });
            await queryInterface.addIndex('contas_receber', ['status'], { transaction });
            await queryInterface.addIndex('contas_receber', ['data_vencimento'], { transaction });
            await queryInterface.addIndex('contas_receber_parcelas', ['conta_receber_id'], { transaction });
            await queryInterface.addIndex('contas_receber_parcelas', ['status'], { transaction });
            await queryInterface.addIndex('contas_receber_parcelas', ['data_vencimento'], { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.dropTable('contas_receber_parcelas', { transaction });
            await queryInterface.dropTable('contas_receber', { transaction });
            
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};