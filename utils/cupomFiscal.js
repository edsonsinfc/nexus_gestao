// utils/cupomFiscal.js
const moment = require('moment-timezone');

class CupomFiscalGenerator {
    constructor() {
        this.larguraCupom = 48; // caracteres por linha para impressora térmica 80mm
        this.charset = 'utf8';
    }

    // Gerar cupom em HTML para visualização
    gerarHTML(nfce, configuracoes = {}) {
        const {
            logoBase64,
            observacoesAdicionais = '',
            mostrarQRCode = true,
            corPrimaria = '#000000'
        } = configuracoes;

        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NFC-e ${nfce.numero_sequencial}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 15px;
            width: 80mm;
            color: ${corPrimaria};
            background: white;
        }
        
        .cupom-container {
            max-width: 80mm;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .logo {
            max-width: 60mm;
            max-height: 40mm;
            margin-bottom: 8px;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        
        .empresa-info {
            text-align: center;
            margin-bottom: 10px;
        }
        
        .empresa-nome {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 3px;
        }
        
        .empresa-fantasia {
            font-size: 12px;
            margin-bottom: 3px;
        }
        
        .empresa-endereco {
            font-size: 11px;
            line-height: 1.3;
            margin-bottom: 8px;
        }
        
        .empresa-cnpj {
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .linha-separadora {
            border-top: 1px dashed ${corPrimaria};
            margin: 12px 0;
            height: 1px;
        }
        
        .linha-dupla {
            border-top: 2px solid ${corPrimaria};
            margin: 15px 0;
            height: 2px;
        }
        
        .titulo-documento {
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            margin: 10px 0;
            text-transform: uppercase;
        }
        
        .info-nfce {
            margin-bottom: 10px;
            font-size: 11px;
        }
        
        .info-linha {
            margin-bottom: 2px;
            display: flex;
            justify-content: space-between;
        }
        
        .info-cliente {
            margin: 8px 0;
            font-size: 11px;
        }
        
        .secao-itens {
            margin: 15px 0;
        }
        
        .titulo-itens {
            font-weight: bold;
            margin-bottom: 8px;
            text-align: center;
        }
        
        .item {
            margin-bottom: 8px;
            font-size: 11px;
            padding: 3px 0;
        }
        
        .item-numero {
            font-weight: bold;
        }
        
        .item-descricao {
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .item-detalhes {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
        }
        
        .item-codigo {
            font-size: 10px;
            color: #666;
        }
        
        .item-valor {
            text-align: right;
            font-weight: bold;
        }
        
        .totais {
            margin: 15px 0;
            text-align: center;
        }
        
        .total-geral {
            font-size: 16px;
            font-weight: bold;
            background: #f0f0f0;
            padding: 8px;
            border: 2px solid ${corPrimaria};
        }
        
        .observacoes {
            margin: 12px 0;
            font-size: 11px;
            text-align: left;
            background: #f9f9f9;
            padding: 8px;
            border-left: 3px solid ${corPrimaria};
        }
        
        .info-fiscal {
            text-align: center;
            font-size: 10px;
            margin: 15px 0;
            line-height: 1.4;
        }
        
        .chave-acesso {
            font-family: monospace;
            font-size: 9px;
            word-wrap: break-word;
            background: #f5f5f5;
            padding: 8px;
            margin: 8px 0;
            border: 1px solid #ddd;
        }
        
        .qr-code {
            text-align: center;
            margin: 15px 0;
            padding: 10px;
            background: #f0f0f0;
            border: 1px dashed ${corPrimaria};
        }
        
        .data-impressao {
            text-align: center;
            font-size: 10px;
            margin-top: 20px;
            color: #666;
        }
        
        .botoes-acao {
            text-align: center;
            margin: 20px 0;
        }
        
        .btn {
            background: ${corPrimaria};
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .btn:hover {
            opacity: 0.8;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-emitida {
            background: #4CAF50;
            color: white;
        }
        
        .status-cancelada {
            background: #f44336;
            color: white;
        }

        .status-nao_fiscal {
            background: #0ea5e9;
            color: white;
        }

        .status-autorizada {
            background: #16a34a;
            color: white;
        }

        .status-pendente {
            background: #f59e0b;
            color: white;
        }
    </style>
</head>
<body>
    <div class="cupom-container">
        <!-- Cabeçalho com logo e dados da empresa -->
        <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo da Empresa">` : ''}
            
            <div class="empresa-info">
                <div class="empresa-nome">${nfce.razao_social_emitente}</div>
                ${nfce.nome_fantasia_emitente ? `<div class="empresa-fantasia">${nfce.nome_fantasia_emitente}</div>` : ''}
                <div class="empresa-endereco">
                    ${nfce.endereco_emitente}<br>
                    ${nfce.municipio_emitente} - ${nfce.uf_emitente}<br>
                    CEP: ${this.formatarCEP(nfce.cep_emitente)}
                </div>
                <div class="empresa-cnpj">CNPJ: ${this.formatarCNPJ(nfce.cnpj_emitente)}</div>
                <div>I.E.: ${nfce.inscricao_estadual}</div>
            </div>
        </div>

        <div class="linha-dupla"></div>
        
        <!-- Título do documento -->
        <div class="titulo-documento">
            Documento Auxiliar da<br>
            Nota Fiscal de Consumidor Eletrônica
        </div>
        
        <div class="linha-separadora"></div>
        
        <!-- Informações da NFC-e -->
        <div class="info-nfce">
            <div class="info-linha">
                <span><strong>NFC-e:</strong> ${String(nfce.numero_sequencial).padStart(9, '0')}</span>
                <span><strong>Série:</strong> ${nfce.serie}</span>
            </div>
            <div class="info-linha">
                <span><strong>Data/Hora:</strong> ${moment(nfce.created_at).format('DD/MM/YYYY HH:mm:ss')}</span>
                <span class="status-badge status-${nfce.status.toLowerCase()}">${nfce.status}</span>
            </div>
        </div>
        
        <!-- Dados do cliente (se informado) -->
        ${nfce.nome_consumidor || nfce.cpf_cnpj_consumidor ? `
        <div class="linha-separadora"></div>
        <div class="info-cliente">
            ${nfce.nome_consumidor ? `<div><strong>Cliente:</strong> ${nfce.nome_consumidor}</div>` : ''}
            ${nfce.cpf_cnpj_consumidor ? `<div><strong>CPF/CNPJ:</strong> ${this.formatarCpfCnpj(nfce.cpf_cnpj_consumidor)}</div>` : ''}
        </div>
        ` : ''}
        
        <div class="linha-separadora"></div>
        
        <!-- Itens da venda -->
        <div class="secao-itens">
            <div class="titulo-itens">ITENS DA VENDA</div>
            
            ${nfce.itens.map((item, index) => `
            <div class="item">
                <div class="item-descricao">
                    <span class="item-numero">${String(index + 1).padStart(2, '0')}.</span>
                    ${item.descricao_produto}
                </div>
                <div class="item-codigo">Cód: ${item.codigo_produto}</div>
                <div class="item-detalhes">
                    <span>${parseFloat(item.quantidade).toFixed(3)} ${item.unidade} × R$ ${parseFloat(item.valor_unitario).toFixed(2)}</span>
                    <span class="item-valor">R$ ${parseFloat(item.valor_total).toFixed(2)}</span>
                </div>
            </div>
            `).join('')}
        </div>
        
        <div class="linha-dupla"></div>
        
        <!-- Totais -->
        <div class="totais">
            <div class="total-geral">
                TOTAL: R$ ${parseFloat(nfce.valor_venda || nfce.valor_total).toFixed(2)}
            </div>
        </div>
        
        <div class="linha-separadora"></div>
        
        <!-- Observações -->
        ${nfce.observacoes || observacoesAdicionais ? `
        <div class="observacoes">
            <strong>Observações:</strong><br>
            ${nfce.observacoes || ''}
            ${observacoesAdicionais ? '<br>' + observacoesAdicionais : ''}
        </div>
        <div class="linha-separadora"></div>
        ` : ''}
        
        <!-- Informações fiscais -->
        <div class="info-fiscal">
            <div><strong>EMITIDA VIA APLICATIVO</strong></div>
            <div>Consulte pela chave de acesso em:</div>
            <div><strong>https://dec.fazenda.df.gov.br/ConsultarNFCe.aspx</strong></div>
            
            <div class="chave-acesso">
                <strong>CHAVE DE ACESSO:</strong><br>
                ${this.formatarChaveAcesso(nfce.chave_acesso)}
            </div>
        </div>
        
        <!-- QR Code (placeholder) -->
        ${mostrarQRCode ? `
        <div class="qr-code">
            <div><strong>QR CODE</strong></div>
            <div style="font-size: 8px;">
                [QR Code seria gerado aqui para leitura<br>
                por aplicativos de consulta de NFC-e]
            </div>
        </div>
        ` : ''}
        
        <div class="linha-separadora"></div>
        
        <!-- Data de impressão -->
        <div class="data-impressao">
            Impresso em: ${moment().format('DD/MM/YYYY HH:mm:ss')}
        </div>
        
        <!-- Botões de ação (não aparecem na impressão) -->
        <div class="botoes-acao no-print">
            <button class="btn" onclick="window.print()">🖨️ Imprimir</button>
            <button class="btn" onclick="window.close()">✖️ Fechar</button>
        </div>
    </div>

    <script>
        // Auto-focus para impressão
        window.addEventListener('load', function() {
            // Opcional: imprimir automaticamente
            // window.print();
        });
        
        // Configurações de impressão
        window.addEventListener('beforeprint', function() {
            document.title = 'NFC-e ${nfce.numero_sequencial} - ${nfce.razao_social_emitente}';
        });
    </script>
</body>
</html>`;
    }

    // Gerar cupom em texto puro para impressoras térmicas
    gerarTexto(nfce, configuracoes = {}) {
        const {
            observacoesAdicionais = '',
            charset = 'utf8'
        } = configuracoes;

        let cupom = '';
        const linha = '='.repeat(this.larguraCupom);
        const linhaPontilhada = '-'.repeat(this.larguraCupom);
        
        // Cabeçalho
        cupom += this.centralizarTexto(nfce.razao_social_emitente, this.larguraCupom) + '\n';
        if (nfce.nome_fantasia_emitente) {
            cupom += this.centralizarTexto(nfce.nome_fantasia_emitente, this.larguraCupom) + '\n';
        }
        cupom += this.centralizarTexto(nfce.endereco_emitente, this.larguraCupom) + '\n';
        cupom += this.centralizarTexto(`${nfce.municipio_emitente} - ${nfce.uf_emitente}`, this.larguraCupom) + '\n';
        cupom += this.centralizarTexto(`CNPJ: ${this.formatarCNPJ(nfce.cnpj_emitente)}`, this.larguraCupom) + '\n';
        cupom += this.centralizarTexto(`I.E.: ${nfce.inscricao_estadual}`, this.larguraCupom) + '\n';
        cupom += linha + '\n';
        
        // Título do documento
        cupom += this.centralizarTexto('DOCUMENTO AUXILIAR DA', this.larguraCupom) + '\n';
        cupom += this.centralizarTexto('NOTA FISCAL DE CONSUMIDOR', this.larguraCupom) + '\n';
        cupom += this.centralizarTexto('ELETRONICA', this.larguraCupom) + '\n';
        cupom += linhaPontilhada + '\n';
        
        // Informações da NFC-e
        cupom += `NFC-e: ${String(nfce.numero_sequencial).padStart(9, '0')}    Serie: ${nfce.serie}\n`;
        cupom += `Data: ${moment(nfce.created_at).format('DD/MM/YYYY HH:mm:ss')}\n`;
        cupom += `Status: ${nfce.status}\n`;
        
        // Cliente (se informado)
        if (nfce.nome_consumidor || nfce.cpf_cnpj_consumidor) {
            cupom += linhaPontilhada + '\n';
            if (nfce.nome_consumidor) cupom += `Cliente: ${nfce.nome_consumidor}\n`;
            if (nfce.cpf_cnpj_consumidor) cupom += `CPF/CNPJ: ${this.formatarCpfCnpj(nfce.cpf_cnpj_consumidor)}\n`;
        }
        
        cupom += linhaPontilhada + '\n';
        cupom += this.centralizarTexto('ITENS', this.larguraCupom) + '\n';
        cupom += linhaPontilhada + '\n';
        
        // Itens
        nfce.itens.forEach((item, index) => {
            const numeroItem = String(index + 1).padStart(2, '0');
            cupom += `${numeroItem} ${this.truncarTexto(item.descricao_produto, this.larguraCupom - 3)}\n`;
            cupom += `   Cod: ${item.codigo_produto}\n`;
            
            const qtdUnid = `${parseFloat(item.quantidade).toFixed(3)} ${item.unidade}`;
            const valorUnit = `R$ ${parseFloat(item.valor_unitario).toFixed(2)}`;
            const valorTotal = `R$ ${parseFloat(item.valor_total).toFixed(2)}`;
            
            const linhaValor = `   ${qtdUnid} x ${valorUnit}`;
            const espacos = this.larguraCupom - linhaValor.length - valorTotal.length;
            cupom += linhaValor + ' '.repeat(Math.max(0, espacos)) + valorTotal + '\n';
            cupom += '\n';
        });
        
        cupom += linha + '\n';
        
        // Total
        const textoTotal = 'TOTAL:';
        const valorTotal = `R$ ${parseFloat(nfce.valor_venda || nfce.valor_total).toFixed(2)}`;
        const espacosTotal = this.larguraCupom - textoTotal.length - valorTotal.length;
        cupom += textoTotal + ' '.repeat(Math.max(0, espacosTotal)) + valorTotal + '\n';
        cupom += linha + '\n';
        
        // Observações
        if (nfce.observacoes || observacoesAdicionais) {
            cupom += 'Observacoes:\n';
            if (nfce.observacoes) {
                cupom += this.quebrarTexto(nfce.observacoes, this.larguraCupom) + '\n';
            }
            if (observacoesAdicionais) {
                cupom += this.quebrarTexto(observacoesAdicionais, this.larguraCupom) + '\n';
            }
            cupom += linhaPontilhada + '\n';
        }
        
        // Informações fiscais
        cupom += this.centralizarTexto('EMITIDA VIA APLICATIVO', this.larguraCupom) + '\n';
        cupom += '\n';
        cupom += 'Consulte em:\n';
        cupom += 'https://dec.fazenda.df.gov.br/ConsultarNFCe.aspx\n';
        cupom += '\n';
        cupom += 'Chave de Acesso:\n';
        cupom += this.quebrarTexto(nfce.chave_acesso, this.larguraCupom) + '\n';
        cupom += linha + '\n';
        
        // Data de impressão
        cupom += this.centralizarTexto(`Impresso: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, this.larguraCupom) + '\n';
        
        return cupom;
    }

    // Métodos auxiliares de formatação
    centralizarTexto(texto, largura) {
        if (texto.length >= largura) return texto.substring(0, largura);
        const espacos = Math.floor((largura - texto.length) / 2);
        return ' '.repeat(espacos) + texto;
    }

    truncarTexto(texto, largura) {
        return texto.length > largura ? texto.substring(0, largura - 3) + '...' : texto;
    }

    quebrarTexto(texto, largura) {
        const palavras = texto.split(' ');
        let linhas = [];
        let linhaAtual = '';

        palavras.forEach(palavra => {
            if ((linhaAtual + palavra).length <= largura) {
                linhaAtual += (linhaAtual ? ' ' : '') + palavra;
            } else {
                if (linhaAtual) linhas.push(linhaAtual);
                linhaAtual = palavra;
            }
        });

        if (linhaAtual) linhas.push(linhaAtual);
        return linhas.join('\n');
    }

    formatarCNPJ(cnpj) {
        const num = cnpj.replace(/\D/g, '');
        return num.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    formatarCPF(cpf) {
        const num = cpf.replace(/\D/g, '');
        return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    formatarCpfCnpj(documento) {
        const num = documento.replace(/\D/g, '');
        return num.length === 11 ? this.formatarCPF(documento) : this.formatarCNPJ(documento);
    }

    formatarCEP(cep) {
        const num = cep.replace(/\D/g, '');
        return num.replace(/(\d{5})(\d{3})/, '$1-$2');
    }

    formatarChaveAcesso(chave) {
        // Formatar chave em grupos de 4 dígitos
        return chave.replace(/(\d{4})/g, '$1 ').trim();
    }
}

module.exports = CupomFiscalGenerator;