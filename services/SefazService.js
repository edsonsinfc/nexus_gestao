const https = require('https');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const soap = require('soap');

class SefazService {
  constructor() {
    this.ambiente = process.env.SEFAZ_AMBIENTE || '2'; // 1=Produção, 2=Homologação
    this.uf = process.env.SEFAZ_UF || 'SP';
    this.cnpj = process.env.EMPRESA_CNPJ;
    
    // Configurações de certificado
    this.certPath = process.env.CERT_PATH || './certificados/certificado.pfx';
    this.certPassword = process.env.CERT_PASSWORD;
    
    // URLs dos webservices (Ambiente 2 - Homologação)
    this.urls = {
      consultaNFe: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx?wsdl',
      distribuicaoDFe: 'https://www1-hom.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx?wsdl',
      manifestacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NFeRecepcaoEvento/NFeRecepcaoEvento4.asmx?wsdl'
    };

    // Se produção, usar URLs de produção
    if (this.ambiente === '1') {
      this.urls = {
        consultaNFe: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx?wsdl',
        distribuicaoDFe: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
        manifestacao: 'https://nfe.svrs.rs.gov.br/ws/NFeRecepcaoEvento/NFeRecepcaoEvento4.asmx?wsdl'
      };
    }
  }

  // Carregar certificado digital
  async carregarCertificado() {
    try {
      // Verificar se certificado existe
      const certExists = await fs.access(this.certPath).then(() => true).catch(() => false);
      
      if (!certExists) {
        throw new Error(
          `Certificado digital não encontrado em: ${this.certPath}\n\n` +
          `Configure o certificado no arquivo .env:\n` +
          `SEFAZ_CERT_PATH=./certificados/seu-certificado.pfx\n` +
          `SEFAZ_CERT_PASSWORD=sua_senha`
        );
      }

      const pfx = await fs.readFile(this.certPath);
      return {
        pfx: pfx,
        passphrase: this.certPassword
      };
    } catch (error) {
      throw new Error(`Erro ao carregar certificado: ${error.message}`);
    }
  }

  // Consultar notas pendentes na SEFAZ (Distribuição DFe)
  async consultarNotasPendentes(ultNSU = '0') {
    try {
      const cert = await this.carregarCertificado();
      
      const httpsAgent = new https.Agent({
        pfx: cert.pfx,
        passphrase: cert.passphrase,
        rejectUnauthorized: false
      });

      const client = await soap.createClientAsync(this.urls.distribuicaoDFe, {
        httpsAgent: httpsAgent
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${this.ambiente}</tpAmb>
          <cUFAutor>35</cUFAutor>
          <CNPJ>${this.cnpj}</CNPJ>
          <distNSU>
            <ultNSU>${ultNSU.padStart(15, '0')}</ultNSU>
          </distNSU>
        </distDFeInt>`;

      const [result] = await client.nfeDistDFeInteresseAsync({ nfeDadosMsg: xml });
      
      return this.processarRetornoDistribuicao(result);
    } catch (error) {
      console.error('Erro ao consultar SEFAZ:', error);
      throw new Error(`Erro na consulta SEFAZ: ${error.message}`);
    }
  }

  // Processar retorno da distribuição
  async processarRetornoDistribuicao(resultado) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(resultado.nfeDistDFeInteresseResult);
    
    const retorno = parsed['nfeDistDFeInteresse']['retDistDFeInt'];
    
    if (retorno.cStat !== '138') { // 138 = Documento localizado
      return {
        sucesso: false,
        mensagem: retorno.xMotivo,
        notas: []
      };
    }

    const documentos = Array.isArray(retorno.loteDistDFeInt.docZip) 
      ? retorno.loteDistDFeInt.docZip 
      : [retorno.loteDistDFeInt.docZip];

    const notas = [];

    for (const doc of documentos) {
      // Descompactar e processar cada documento
      const xmlContent = Buffer.from(doc._, 'base64').toString('utf-8');
      const docParsed = await parser.parseStringPromise(xmlContent);
      
      if (docParsed.nfeProc) {
        // É uma NFe completa
        const nfe = docParsed.nfeProc.NFe.infNFe;
        notas.push({
          tipo: 'NFe',
          chave: nfe.$.Id.replace('NFe', ''),
          nsu: doc.$.NSU,
          numero: nfe.ide.nNF,
          serie: nfe.ide.serie,
          dataEmissao: nfe.ide.dhEmi,
          cnpjEmitente: nfe.emit.CNPJ,
          nomeEmitente: nfe.emit.xNome,
          valorTotal: parseFloat(nfe.total.ICMSTot.vNF),
          xmlCompleto: xmlContent,
          situacao: 'PENDENTE_MANIFESTACAO'
        });
      } else if (docParsed.resNFe) {
        // É apenas um resumo
        const resumo = docParsed.resNFe;
        notas.push({
          tipo: 'RESUMO',
          chave: resumo.chNFe,
          nsu: doc.$.NSU,
          numero: resumo.nNF,
          serie: resumo.serie,
          dataEmissao: resumo.dhEmi,
          cnpjEmitente: resumo.CNPJ,
          nomeEmitente: resumo.xNome,
          valorTotal: parseFloat(resumo.vNF),
          situacao: 'PENDENTE_DOWNLOAD'
        });
      }
    }

    return {
      sucesso: true,
      ultNSU: retorno.ultNSU,
      maxNSU: retorno.maxNSU,
      notas: notas
    };
  }

  // Download de XML completo por chave
  async downloadXMLPorChave(chaveNFe) {
    try {
      const cert = await this.carregarCertificado();
      
      const httpsAgent = new https.Agent({
        pfx: cert.pfx,
        passphrase: cert.passphrase,
        rejectUnauthorized: false
      });

      const client = await soap.createClientAsync(this.urls.consultaNFe, {
        httpsAgent: httpsAgent
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <tpAmb>${this.ambiente}</tpAmb>
          <xServ>CONSULTAR</xServ>
          <chNFe>${chaveNFe}</chNFe>
        </consSitNFe>`;

      const [result] = await client.nfeConsultaNF2Async({ nfeDadosMsg: xml });
      
      return result.nfeConsultaNF2Result;
    } catch (error) {
      throw new Error(`Erro ao baixar XML: ${error.message}`);
    }
  }

  // Manifestar destinatário (Ciência, Confirmação, Desconhecimento, Não Realizada)
  async manifestarDestinatario(chaveNFe, tipoEvento, justificativa = '') {
    try {
      const cert = await this.carregarCertificado();
      
      const httpsAgent = new https.Agent({
        pfx: cert.pfx,
        passphrase: cert.passphrase,
        rejectUnauthorized: false
      });

      // Tipos de evento:
      // 210210 = Ciência da Operação
      // 210200 = Confirmação da Operação
      // 210220 = Desconhecimento da Operação
      // 210240 = Operação não Realizada
      
      const tpEventos = {
        'CIENCIA': '210210',
        'CONFIRMACAO': '210200',
        'DESCONHECIMENTO': '210220',
        'NAO_REALIZADA': '210240'
      };

      const tpEvento = tpEventos[tipoEvento];
      if (!tpEvento) {
        throw new Error('Tipo de evento inválido');
      }

      const dhEvento = new Date().toISOString();
      const nSeqEvento = '1';
      const idEvento = `ID${tpEvento}${chaveNFe}${nSeqEvento.padStart(2, '0')}`;

      let descEvento = '';
      let xJust = '';

      switch (tipoEvento) {
        case 'CIENCIA':
          descEvento = 'Ciencia da Operacao';
          break;
        case 'CONFIRMACAO':
          descEvento = 'Confirmacao da Operacao';
          break;
        case 'DESCONHECIMENTO':
          descEvento = 'Desconhecimento da Operacao';
          xJust = justificativa || 'Operacao desconhecida';
          break;
        case 'NAO_REALIZADA':
          descEvento = 'Operacao nao Realizada';
          xJust = justificativa || 'Operacao nao realizada';
          break;
      }

      const xmlEvento = `<?xml version="1.0" encoding="UTF-8"?>
        <envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
          <idLote>1</idLote>
          <evento versao="1.00">
            <infEvento Id="${idEvento}">
              <cOrgao>91</cOrgao>
              <tpAmb>${this.ambiente}</tpAmb>
              <CNPJ>${this.cnpj}</CNPJ>
              <chNFe>${chaveNFe}</chNFe>
              <dhEvento>${dhEvento}</dhEvento>
              <tpEvento>${tpEvento}</tpEvento>
              <nSeqEvento>${nSeqEvento}</nSeqEvento>
              <verEvento>1.00</verEvento>
              <detEvento versao="1.00">
                <descEvento>${descEvento}</descEvento>
                ${xJust ? `<xJust>${xJust}</xJust>` : ''}
              </detEvento>
            </infEvento>
          </evento>
        </envEvento>`;

      const client = await soap.createClientAsync(this.urls.manifestacao, {
        httpsAgent: httpsAgent
      });

      const [result] = await client.nfeRecepcaoEventoAsync({ nfeDadosMsg: xmlEvento });
      
      return this.processarRetornoEvento(result.nfeRecepcaoEventoResult);
    } catch (error) {
      throw new Error(`Erro ao manifestar: ${error.message}`);
    }
  }

  // Processar retorno do evento
  async processarRetornoEvento(resultado) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(resultado);
    
    const retEvento = parsed.retEnvEvento.retEvento.infEvento;
    
    return {
      sucesso: retEvento.cStat === '135' || retEvento.cStat === '136', // 135=Evento registrado, 136=já registrado
      codigo: retEvento.cStat,
      mensagem: retEvento.xMotivo,
      protocolo: retEvento.nProt,
      dataRegistro: retEvento.dhRegEvento
    };
  }

  // Salvar XML no servidor
  async salvarXML(chaveNFe, xmlContent) {
    const xmlDir = path.join(__dirname, '../uploads/nfe-entrada');
    await fs.mkdir(xmlDir, { recursive: true });
    
    const xmlPath = path.join(xmlDir, `${chaveNFe}.xml`);
    await fs.writeFile(xmlPath, xmlContent, 'utf-8');
    
    return xmlPath;
  }

  // Verificar status do certificado
  async verificarCertificado() {
    try {
      const cert = await this.carregarCertificado();
      return {
        valido: true,
        mensagem: 'Certificado carregado com sucesso'
      };
    } catch (error) {
      return {
        valido: false,
        mensagem: error.message
      };
    }
  }
}

module.exports = new SefazService();
