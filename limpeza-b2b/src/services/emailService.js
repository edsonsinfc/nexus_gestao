const nodemailer = require('nodemailer');
const pool = require('../config/db.mysql');

class EmailService {
  constructor() {
    this.transporter = null;
  }
  
  async configurarTransporter() {
    try {
      const pool = await getConnection();
      const [config] = await pool.execute(
        'SELECT * FROM email_config WHERE ativo = 1 LIMIT 1'
      );
      
      if (config.length === 0) {
        // Configuração padrão para desenvolvimento (usando Gmail como exemplo)
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'seu-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'sua-senha-app'
          }
        });
        console.log('⚠️  Usando configuração de email padrão (configure no banco)');
      } else {
        const emailConfig = config[0];
        this.transporter = nodemailer.createTransporter({
          host: emailConfig.smtp_host,
          port: emailConfig.smtp_port,
          secure: emailConfig.smtp_port === 465,
          auth: {
            user: emailConfig.smtp_user,
            pass: emailConfig.smtp_pass
          }
        });
        console.log('✅ Configuração de email carregada do banco');
      }
      
      return this.transporter;
    } catch (error) {
      console.error('❌ Erro ao configurar email:', error);
      throw error;
    }
  }
  
  async enviarNotificacaoPedido(pedidoData) {
    try {
      if (!this.transporter) {
        await this.configurarTransporter();
      }
      
      const { pedido, equipe, itens, vendedorEmail } = pedidoData;
      
      if (!vendedorEmail) {
        console.log('⚠️  Email do vendedor não configurado para a equipe');
        return { success: false, error: 'Email do vendedor não configurado' };
      }
      
      const htmlTemplate = this.gerarTemplateEmail(pedido, equipe, itens);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'nexus-b2b@empresa.com',
        to: vendedorEmail,
        subject: `🛒 Novo Pedido #${pedido.id} - ${equipe.nome}`,
        html: htmlTemplate
      };
      
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado para ${vendedorEmail} - Pedido #${pedido.id}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }
  }
  
  gerarTemplateEmail(pedido, equipe, itens) {
    const formatMoney = (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };
    
    const formatDate = (date) => {
      return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    const itensHtml = itens.map(item => `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 8px;">${item.codprod}</td>
        <td style="padding: 8px;">${item.descricao}</td>
        <td style="padding: 8px; text-align: center;">${item.quantidade}</td>
        <td style="padding: 8px; text-align: right;">${formatMoney(item.valor_unitario)}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">${formatMoney(item.valor_total)}</td>
      </tr>
    `).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Pedido - Nexus B2B</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🛒 Novo Pedido Recebido</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Pedido #${pedido.id}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e5e5e5;">
          <h2 style="color: #22c55e; margin-top: 0;">📋 Informações do Pedido</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>🏢 Equipe:</strong> ${equipe.nome}</p>
            <p><strong>📅 Data:</strong> ${formatDate(pedido.data)}</p>
            <p><strong>💰 Valor Total:</strong> <span style="color: #22c55e; font-size: 20px; font-weight: bold;">${formatMoney(pedido.valor_total)}</span></p>
            <p><strong>📊 Status:</strong> <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px;">${pedido.status}</span></p>
          </div>
          
          <h3 style="color: #22c55e;">🛍️ Itens do Pedido</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #22c55e; color: white;">
                <th style="padding: 12px; text-align: left;">Código</th>
                <th style="padding: 12px; text-align: left;">Produto</th>
                <th style="padding: 12px; text-align: center;">Qtd</th>
                <th style="padding: 12px; text-align: right;">Valor Unit.</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
            <p style="margin: 0; color: #666;">
              📧 Este email foi enviado automaticamente pelo sistema Nexus B2B<br>
              Para mais informações, acesse o painel administrativo.
            </p>
          </div>
        </div>
        
        <div style="background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">© ${new Date().getFullYear()} Nexus B2B - Sistema de Gestão Comercial</p>
        </div>
        
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();