const crypto = require('crypto');
const moment = require('moment-timezone');

/**
 * Gerador de XML NFC-e completo conforme layout SEFAZ 4.00
 * Campos obrigatórios para autorização
 */

class NFCeXMLGenerator {
  /**
   * Gerar XML completo da NFC-e
   * @param {Object} dados - Dados da nota fiscal
   * @returns {String} XML formatado
   */
  static gerarXML(dados) {
    const { nfce, itens, config, destinatario, pagamentos } = dados;

    // Validar dados obrigatórios
    this.validarDados(dados);

    // Montar estrutura XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFe${nfce.chave_acesso}">
    ${this.gerarIdentificacao(nfce, config)}
    ${this.gerarEmitente(config)}
    ${destinatario ? this.gerarDestinatario(destinatario) : ''}
    ${this.gerarItens(itens)}
    ${this.gerarTotais(nfce)}
    ${this.gerarTransporte()}
    ${this.gerarPagamento(pagamentos || [], nfce.valor_total)}
    ${this.gerarInformacoesAdicionais(nfce)}
  </infNFe>
</NFe>`;

    return this.formatarXML(xml);
  }

  /**
   * Identificação da NF-e (Grupo IDE)
   */
  static gerarIdentificacao(nfce, config) {
    const dataEmissao = moment(nfce.data_emissao || new Date()).tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ssZ');

    return `    <ide>
      <cUF>53</cUF><!-- Código UF DF -->
      <cNF>${this.gerarCodigoNumerico(nfce.numero_sequencial)}</cNF>
      <natOp>VENDA</natOp>
      <mod>65</mod><!-- Modelo 65 = NFC-e -->
      <serie>${config.serie_nfce || 1}</serie>
      <nNF>${nfce.numero_sequencial}</nNF>
      <dhEmi>${dataEmissao}</dhEmi>
      <tpNF>1</tpNF><!-- 1=Saída -->
      <idDest>1</idDest><!-- 1=Operação interna -->
      <cMunFG>${config.codigo_municipio}</cMunFG>
      <tpImp>4</tpImp><!-- 4=DANFE NFC-e -->
      <tpEmis>1</tpEmis><!-- 1=Emissão normal -->
      <cDV>${nfce.chave_acesso.substr(43, 1)}</cDV>
      <tpAmb>${config.ambiente === 'PRODUCAO' ? '1' : '2'}</tpAmb>
      <finNFe>1</finNFe><!-- 1=NF-e normal -->
      <indFinal>1</indFinal><!-- 1=Consumidor final -->
      <indPres>1</indPres><!-- 1=Operação presencial -->
      <procEmi>0</procEmi><!-- 0=Emissão com aplicativo do contribuinte -->
      <verProc>NEXUS-1.0</verProc>
    </ide>`;
  }

  /**
   * Dados do Emitente (Grupo EMIT)
   */
  static gerarEmitente(config) {
    const cnpj = (config.cnpj || '').replace(/\D/g, '');

    return `    <emit>
      <CNPJ>${cnpj}</CNPJ>
      <xNome>${this.escape(config.razao_social)}</xNome>
      <xFant>${this.escape(config.nome_fantasia || config.razao_social)}</xFant>
      <enderEmit>
        <xLgr>${this.escape(config.logradouro)}</xLgr>
        <nro>${this.escape(config.numero)}</nro>
        ${config.complemento ? `<xCpl>${this.escape(config.complemento)}</xCpl>` : ''}
        <xBairro>${this.escape(config.bairro)}</xBairro>
        <cMun>${config.codigo_municipio}</cMun>
        <xMun>${this.escape(config.municipio)}</xMun>
        <UF>${config.uf}</UF>
        <CEP>${(config.cep || '').replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
        ${config.telefone ? `<fone>${(config.telefone || '').replace(/\D/g, '')}</fone>` : ''}
      </enderEmit>
      <IE>${(config.inscricao_estadual || '').replace(/\D/g, '')}</IE>
      <CRT>${config.regime_tributario || '1'}</CRT><!-- 1=Simples Nacional, 3=Normal -->
    </emit>`;
  }

  /**
   * Dados do Destinatário (Grupo DEST) - Opcional
   */
  static gerarDestinatario(dest) {
    if (!dest || !dest.cpf_cnpj) return '';

    const doc = (dest.cpf_cnpj || '').replace(/\D/g, '');
    const tipoDoc = doc.length === 11 ? 'CPF' : 'CNPJ';

    return `    <dest>
      <${tipoDoc}>${doc}</${tipoDoc}>
      ${dest.nome ? `<xNome>${this.escape(dest.nome)}</xNome>` : ''}
      ${dest.endereco ? `<enderDest>
        <xLgr>${this.escape(dest.endereco)}</xLgr>
        <nro>S/N</nro>
        <xBairro>CENTRO</xBairro>
        <cMun>5300108</cMun>
        <xMun>BRASILIA</xMun>
        <UF>DF</UF>
        <CEP>70000000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>` : ''}
      <indIEDest>9</indIEDest><!-- 9=Não Contribuinte -->
    </dest>`;
  }

  /**
   * Itens da Nota (Grupo DET)
   */
  static gerarItens(itens) {
    return itens.map((item, index) => {
      const nItem = index + 1;
      const cProd = item.codigo_produto || item.codigo || `ITEM${nItem}`;
      const cEAN = item.codigo_barras || item.gtin || 'SEM GTIN';
      const cfop = item.cfop || '5102';
      const uCom = item.unidade || 'UN';
      const qCom = parseFloat(item.quantidade || 1).toFixed(4);
      const vUnCom = parseFloat(item.valor_unitario || 0).toFixed(10);
      const vProd = parseFloat(item.valor_total || 0).toFixed(2);

      // ICMS
      const vBC = parseFloat(item.base_icms || 0).toFixed(2);
      const pICMS = parseFloat(item.aliquota_icms || 0).toFixed(2);
      const vICMS = parseFloat(item.valor_icms || 0).toFixed(2);
      const cst = item.cst_icms || item.situacao_tributaria || '00';
      const orig = item.origem_produto || '0';

      // PIS
      const cstPIS = item.cst_pis || '01';
      const vBCPIS = parseFloat(item.base_pis || 0).toFixed(2);
      const pPIS = parseFloat(item.aliquota_pis || 0).toFixed(4);
      const vPIS = parseFloat(item.valor_pis || 0).toFixed(2);

      // COFINS
      const cstCOFINS = item.cst_cofins || '01';
      const vBCCOFINS = parseFloat(item.base_cofins || 0).toFixed(2);
      const pCOFINS = parseFloat(item.aliquota_cofins || 0).toFixed(4);
      const vCOFINS = parseFloat(item.valor_cofins || 0).toFixed(2);

      return `    <det nItem="${nItem}">
      <prod>
        <cProd>${this.escape(cProd)}</cProd>
        <cEAN>${cEAN}</cEAN>
        <xProd>${this.escape(item.descricao_produto || item.descricao)}</xProd>
        <NCM>${item.ncm || '00000000'}</NCM>
        <CFOP>${cfop}</CFOP>
        <uCom>${uCom}</uCom>
        <qCom>${qCom}</qCom>
        <vUnCom>${vUnCom}</vUnCom>
        <vProd>${vProd}</vProd>
        <cEANTrib>${cEAN}</cEANTrib>
        <uTrib>${uCom}</uTrib>
        <qTrib>${qCom}</qTrib>
        <vUnTrib>${vUnCom}</vUnTrib>
        <indTot>1</indTot><!-- 1=Compõe total da NF -->
      </prod>
      <imposto>
        <ICMS>
          <ICMS${cst}>
            <orig>${orig}</orig>
            <CST>${cst}</CST>
            ${cst !== '40' && cst !== '41' ? `<vBC>${vBC}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${vICMS}</vICMS>` : ''}
          </ICMS${cst}>
        </ICMS>
        <PIS>
          <PISAliq>
            <CST>${cstPIS}</CST>
            <vBC>${vBCPIS}</vBC>
            <pPIS>${pPIS}</pPIS>
            <vPIS>${vPIS}</vPIS>
          </PISAliq>
        </PIS>
        <COFINS>
          <COFINSAliq>
            <CST>${cstCOFINS}</CST>
            <vBC>${vBCCOFINS}</vBC>
            <pCOFINS>${pCOFINS}</pCOFINS>
            <vCOFINS>${vCOFINS}</vCOFINS>
          </COFINSAliq>
        </COFINS>
      </imposto>
    </det>`;
    }).join('\n');
  }

  /**
   * Totalizadores (Grupo TOTAL)
   */
  static gerarTotais(nfce) {
    const vBC = parseFloat(nfce.base_icms || 0).toFixed(2);
    const vICMS = parseFloat(nfce.valor_icms || 0).toFixed(2);
    const vProd = parseFloat(nfce.valor_produtos || nfce.valor_total || 0).toFixed(2);
    const vDesc = parseFloat(nfce.valor_desconto || 0).toFixed(2);
    const vNF = parseFloat(nfce.valor_total || 0).toFixed(2);
    const vPIS = parseFloat(nfce.valor_pis || 0).toFixed(2);
    const vCOFINS = parseFloat(nfce.valor_cofins || 0).toFixed(2);

    return `    <total>
      <ICMSTot>
        <vBC>${vBC}</vBC>
        <vICMS>${vICMS}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${vProd}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${vDesc}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${vPIS}</vPIS>
        <vCOFINS>${vCOFINS}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${vNF}</vNF>
      </ICMSTot>
    </total>`;
  }

  /**
   * Transporte (Grupo TRANSP) - Sem transporte para NFC-e
   */
  static gerarTransporte() {
    return `    <transp>
      <modFrete>9</modFrete><!-- 9=Sem frete -->
    </transp>`;
  }

  /**
   * Pagamento (Grupo PAG)
   */
  static gerarPagamento(pagamentos, valorTotal) {
    if (!pagamentos || pagamentos.length === 0) {
      // Pagamento padrão: dinheiro
      return `    <pag>
      <detPag>
        <tPag>01</tPag><!-- 01=Dinheiro -->
        <vPag>${parseFloat(valorTotal).toFixed(2)}</vPag>
      </detPag>
    </pag>`;
    }

    const detPags = pagamentos.map(pag => {
      const tPag = this.mapearFormaPagamento(pag.forma_pagamento);
      const vPag = parseFloat(pag.valor || 0).toFixed(2);

      return `      <detPag>
        <tPag>${tPag}</tPag>
        <vPag>${vPag}</vPag>
      </detPag>`;
    }).join('\n');

    return `    <pag>
${detPags}
    </pag>`;
  }

  /**
   * Informações Adicionais (Grupo INFADIC)
   */
  static gerarInformacoesAdicionais(nfce) {
    const infAdic = [];

    if (nfce.observacoes) {
      infAdic.push(nfce.observacoes);
    }

    // Informação obrigatória sobre tributos
    const totalTributos = parseFloat(nfce.valor_icms || 0) + 
                          parseFloat(nfce.valor_pis || 0) + 
                          parseFloat(nfce.valor_cofins || 0);
    
    if (totalTributos > 0) {
      infAdic.push(`Valor Aproximado dos Tributos: R$ ${totalTributos.toFixed(2)} (${((totalTributos / nfce.valor_total) * 100).toFixed(2)}%)`);
    }

    const infCpl = infAdic.join(' | ');

    return infCpl ? `    <infAdic>
      <infCpl>${this.escape(infCpl)}</infCpl>
    </infAdic>` : '';
  }

  /**
   * Mapear forma de pagamento para código SEFAZ
   */
  static mapearFormaPagamento(forma) {
    const mapa = {
      'DINHEIRO': '01',
      'CHEQUE': '02',
      'CARTAO_CREDITO': '03',
      'CARTAO_DEBITO': '04',
      'CREDITO_LOJA': '05',
      'PIX': '17',
      'TRANSFERENCIA': '18',
      'OUTROS': '99'
    };

    return mapa[forma] || '01';
  }

  /**
   * Gerar código numérico (8 dígitos)
   */
  static gerarCodigoNumerico(numeroNota) {
    return String(numeroNota).padStart(8, '0');
  }

  /**
   * Escapar caracteres especiais XML
   */
  static escape(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Formatar XML com indentação
   */
  static formatarXML(xml) {
    // Remove espaços em branco extras
    return xml
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Validar dados obrigatórios
   */
  static validarDados(dados) {
    const erros = [];

    if (!dados.nfce) erros.push('Dados da NFC-e não fornecidos');
    if (!dados.itens || dados.itens.length === 0) erros.push('Nenhum item na nota');
    if (!dados.config) erros.push('Configurações fiscais não fornecidas');
    if (!dados.config.cnpj) erros.push('CNPJ do emitente obrigatório');
    if (!dados.config.inscricao_estadual) erros.push('Inscrição Estadual obrigatória');
    if (!dados.nfce.chave_acesso) erros.push('Chave de acesso obrigatória');

    if (erros.length > 0) {
      throw new Error('Validação falhou: ' + erros.join(', '));
    }
  }

  /**
   * Gerar QR Code URL (para DANFE NFC-e)
   */
  static gerarURLQRCode(chaveAcesso, ambiente, valorTotal) {
    const url = ambiente === 'PRODUCAO' 
      ? 'https://dec.fazenda.df.gov.br/ConsultarNFCe.aspx'
      : 'https://dec.fazenda.df.gov.br/ConsultarNFCe.aspx';

    return `${url}?chNFe=${chaveAcesso}&nVersao=100&tpAmb=${ambiente === 'PRODUCAO' ? '1' : '2'}&cDest=&dhEmi=${moment().format('YYYYMMDDHHmmss')}&vNF=${parseFloat(valorTotal).toFixed(2)}&vICMS=0.00&digVal=&cIdToken=000001&cHashQRCode=`;
  }
}

module.exports = NFCeXMLGenerator;
