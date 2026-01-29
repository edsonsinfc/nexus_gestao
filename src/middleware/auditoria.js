// middleware/auditoria.js
// Corrigido caminho do database pool
const pool = require('../../db');

class AuditoriaMiddleware {
  /**
   * Middleware para setar o usuário atual na sessão do MySQL
   * Permite que triggers capturem automaticamente quem fez a mudança
   */
  static async setCurrentUser(req, res, next) {
    if (req.user && req.user.id) {
      try {
        const connection = await pool.getConnection();
        await connection.query('SET @current_user_id = ?', [req.user.id]);
        connection.release();
      } catch (error) {
        console.error('Erro ao setar usuário de auditoria:', error);
      }
    }
    next();
  }

  /**
   * Registrar ação de auditoria manualmente (quando triggers não são suficientes)
   */
  static async registrarAcao(dados) {
    const {
      tabela,
      registroId,
      operacao,
      usuarioId,
      usuarioNome,
      dadosAnteriores,
      dadosNovos,
      ipAddress,
      userAgent
    } = dados;

    try {
      await pool.execute(
        `INSERT INTO auditoria 
         (tabela, registro_id, operacao, usuario_id, usuario_nome, 
          dados_anteriores, dados_novos, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tabela,
          registroId || null,
          operacao,
          usuarioId || null,
          usuarioNome || null,
          dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
          dadosNovos ? JSON.stringify(dadosNovos) : null,
          ipAddress || null,
          userAgent || null
        ]
      );
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
      // Não falhar a operação por erro de auditoria
    }
  }

  /**
   * Registrar evento de segurança
   */
  static async registrarEventoSeguranca(dados) {
    const {
      eventType,
      usuarioId,
      username,
      ipAddress,
      userAgent,
      details,
      severity = 'LOW'
    } = dados;

    try {
      await pool.execute(
        `INSERT INTO security_logs 
         (event_type, usuario_id, username, ip_address, user_agent, details, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          eventType,
          usuarioId || null,
          username || null,
          ipAddress || null,
          userAgent || null,
          details ? JSON.stringify(details) : null,
          severity
        ]
      );
    } catch (error) {
      console.error('Erro ao registrar log de segurança:', error);
    }
  }

  /**
   * Obter histórico de mudanças de um registro específico
   */
  static async getHistorico(tabela, registroId) {
    const [rows] = await pool.execute(
      `SELECT 
        a.id,
        a.operacao,
        a.usuario_nome,
        u.nome as usuario,
        a.dados_anteriores,
        a.dados_novos,
        a.timestamp
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.tabela = ? AND a.registro_id = ?
       ORDER BY a.timestamp DESC`,
      [tabela, registroId]
    );
    return rows;
  }

  /**
   * Obter resumo de atividades de um usuário
   */
  static async getAtividadesUsuario(usuarioId, dataInicio, dataFim) {
    const [rows] = await pool.execute(
      `SELECT 
        tabela,
        operacao,
        COUNT(*) as quantidade,
        DATE(timestamp) as data
       FROM auditoria
       WHERE usuario_id = ?
       AND timestamp BETWEEN ? AND ?
       GROUP BY tabela, operacao, DATE(timestamp)
       ORDER BY timestamp DESC`,
      [usuarioId, dataInicio, dataFim]
    );
    return rows;
  }

  /**
   * Detectar atividades suspeitas
   */
  static async detectarAtividadesSuspeitas() {
    // Múltiplas tentativas de login falhas
    const [tentativasLogin] = await pool.execute(
      `SELECT 
        ip_address,
        username,
        COUNT(*) as tentativas,
        MAX(timestamp) as ultima_tentativa
       FROM security_logs
       WHERE event_type = 'LOGIN_FAILED'
       AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
       GROUP BY ip_address, username
       HAVING tentativas >= 5`
    );

    // Mudanças em massa suspeitas
    const [mudancasMassa] = await pool.execute(
      `SELECT 
        usuario_id,
        u.nome as usuario,
        tabela,
        COUNT(*) as quantidade,
        MAX(timestamp) as ultima_mudanca
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE timestamp > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       GROUP BY usuario_id, tabela
       HAVING quantidade > 50`
    );

    return {
      tentativasLoginSuspeitas: tentativasLogin,
      mudancasMassaSuspeitas: mudancasMassa
    };
  }
}

module.exports = AuditoriaMiddleware;
