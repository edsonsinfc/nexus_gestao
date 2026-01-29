// scripts/run-migration-auditoria-v2.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER?.replace(/'/g, '') || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'nexus_dev'
    });

    console.log('✅ Conectado ao banco nexus_dev');

    // Criar tabela de auditoria
    console.log('📝 Criando tabela auditoria...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        tabela VARCHAR(100) NOT NULL,
        registro_id INT UNSIGNED,
        operacao ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','ACESSO_NEGADO') NOT NULL,
        usuario_id INT UNSIGNED,
        usuario_nome VARCHAR(255),
        dados_anteriores JSON,
        dados_novos JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tabela (tabela),
        INDEX idx_usuario (usuario_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_operacao (operacao),
        INDEX idx_registro (tabela, registro_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Criar tabela user_sessions
    console.log('📝 Criando tabela user_sessions...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        usuario_id INT UNSIGNED NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE KEY idx_token (token_hash),
        INDEX idx_usuario (usuario_id),
        INDEX idx_expires (expires_at),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Criar tabela security_logs
    console.log('📝 Criando tabela security_logs...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        event_type ENUM('LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT','PASSWORD_CHANGE','2FA_ENABLED','2FA_DISABLED','PERMISSION_DENIED','SUSPICIOUS_ACTIVITY') NOT NULL,
        usuario_id INT UNSIGNED,
        username VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSON,
        severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'LOW',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuario (usuario_id),
        INDEX idx_event_type (event_type),
        INDEX idx_timestamp (timestamp),
        INDEX idx_severity (severity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Criar triggers
    console.log('⚡ Criando trigger audit_produtos_insert...');
    await connection.query('DROP TRIGGER IF EXISTS audit_produtos_insert');
    await connection.query(`
      CREATE TRIGGER audit_produtos_insert
      AFTER INSERT ON produtos
      FOR EACH ROW
      BEGIN
        INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_novos)
        VALUES (
          'produtos',
          NEW.id,
          'INSERT',
          @current_user_id,
          JSON_OBJECT(
            'descricao', NEW.descricao,
            'codigo_principal', NEW.codigo_principal,
            'gtin', NEW.gtin,
            'preco_venda', NEW.preco_venda,
            'estoque_atual', NEW.estoque_atual
          )
        );
      END
    `);

    console.log('⚡ Criando trigger audit_produtos_update...');
    await connection.query('DROP TRIGGER IF EXISTS audit_produtos_update');
    await connection.query(`
      CREATE TRIGGER audit_produtos_update
      AFTER UPDATE ON produtos
      FOR EACH ROW
      BEGIN
        INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_anteriores, dados_novos)
        VALUES (
          'produtos',
          NEW.id,
          'UPDATE',
          @current_user_id,
          JSON_OBJECT(
            'descricao', OLD.descricao,
            'codigo_principal', OLD.codigo_principal,
            'gtin', OLD.gtin,
            'preco_venda', OLD.preco_venda,
            'estoque_atual', OLD.estoque_atual
          ),
          JSON_OBJECT(
            'descricao', NEW.descricao,
            'codigo_principal', NEW.codigo_principal,
            'gtin', NEW.gtin,
            'preco_venda', NEW.preco_venda,
            'estoque_atual', NEW.estoque_atual
          )
        );
      END
    `);

    console.log('⚡ Criando trigger audit_produtos_delete...');
    await connection.query('DROP TRIGGER IF EXISTS audit_produtos_delete');
    await connection.query(`
      CREATE TRIGGER audit_produtos_delete
      BEFORE DELETE ON produtos
      FOR EACH ROW
      BEGIN
        INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_anteriores)
        VALUES (
          'produtos',
          OLD.id,
          'DELETE',
          @current_user_id,
          JSON_OBJECT(
            'descricao', OLD.descricao,
            'codigo_principal', OLD.codigo_principal,
            'gtin', OLD.gtin,
            'preco_venda', OLD.preco_venda,
            'estoque_atual', OLD.estoque_atual
          )
        );
      END
    `);

    console.log('⚡ Criando trigger audit_vendas_insert...');
    await connection.query('DROP TRIGGER IF EXISTS audit_vendas_insert');
    await connection.query(`
      CREATE TRIGGER audit_vendas_insert
      AFTER INSERT ON vendas
      FOR EACH ROW
      BEGIN
        INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_novos)
        VALUES (
          'vendas',
          NEW.id,
          'INSERT',
          @current_user_id,
          JSON_OBJECT(
            'numero_pedido', NEW.numero_pedido,
            'cliente_id', NEW.cliente_id,
            'status', NEW.status,
            'valor_total', NEW.valor_total,
            'desconto_total', NEW.desconto_total,
            'observacao', NEW.observacao
          )
        );
      END
    `);

    console.log('⚡ Criando trigger audit_vendas_update...');
    await connection.query('DROP TRIGGER IF EXISTS audit_vendas_update');
    await connection.query(`
      CREATE TRIGGER audit_vendas_update
      AFTER UPDATE ON vendas
      FOR EACH ROW
      BEGIN
        INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_anteriores, dados_novos)
        VALUES (
          'vendas',
          NEW.id,
          'UPDATE',
          @current_user_id,
          JSON_OBJECT(
            'numero_pedido', OLD.numero_pedido,
            'cliente_id', OLD.cliente_id,
            'status', OLD.status,
            'valor_total', OLD.valor_total,
            'desconto_total', OLD.desconto_total,
            'observacao', OLD.observacao
          ),
          JSON_OBJECT(
            'numero_pedido', NEW.numero_pedido,
            'cliente_id', NEW.cliente_id,
            'status', NEW.status,
            'valor_total', NEW.valor_total,
            'desconto_total', NEW.desconto_total,
            'observacao', NEW.observacao
          )
        );
      END
    `);

    // Criar views
    console.log('🔍 Criando view v_auditoria_resumo...');
    await connection.query('DROP VIEW IF EXISTS v_auditoria_resumo');
    await connection.query(`
      CREATE VIEW v_auditoria_resumo AS
      SELECT 
        DATE(timestamp) as data,
        tabela,
        operacao,
        COUNT(*) as quantidade,
        COUNT(DISTINCT usuario_id) as usuarios_distintos
      FROM auditoria
      GROUP BY DATE(timestamp), tabela, operacao
      ORDER BY data DESC, quantidade DESC
    `);

    console.log('🔍 Criando view v_ultimas_alteracoes...');
    await connection.query('DROP VIEW IF EXISTS v_ultimas_alteracoes');
    await connection.query(`
      CREATE VIEW v_ultimas_alteracoes AS
      SELECT 
        a.id,
        a.tabela,
        a.registro_id,
        a.operacao,
        u.nome as usuario,
        a.timestamp,
        a.dados_anteriores,
        a.dados_novos
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT 100
    `);

    // Criar stored procedure
    console.log('📦 Criando procedure limpar_auditoria_antiga...');
    await connection.query('DROP PROCEDURE IF EXISTS limpar_auditoria_antiga');
    await connection.query(`
      CREATE PROCEDURE limpar_auditoria_antiga()
      BEGIN
        DELETE FROM auditoria 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL 365 DAY)
        AND operacao NOT IN ('DELETE');
        
        DELETE FROM security_logs 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL 730 DAY);
      END
    `);

    console.log('');
    console.log('✅ Migration de auditoria executada com sucesso!');
    console.log('');
    console.log('📊 Estruturas criadas:');
    console.log('   ✓ 3 Tabelas: auditoria, user_sessions, security_logs');
    console.log('   ✓ 5 Triggers: produtos (INSERT/UPDATE/DELETE), vendas (INSERT/UPDATE)');
    console.log('   ✓ 2 Views: v_auditoria_resumo, v_ultimas_alteracoes');
    console.log('   ✓ 1 Procedure: limpar_auditoria_antiga');
    console.log('');
    console.log('💡 Próximos passos:');
    console.log('   1. Reinicie o servidor: npm start');
    console.log('   2. Acesse /auditoria (interface web)');
    console.log('   3. API: GET /api/auditoria (requer permissão admin)');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
