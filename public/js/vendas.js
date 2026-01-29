// public/js/vendas.js

// Garantir que as variáveis globais sejam únicas mesmo que o script seja importado mais de uma vez
window.vendaAtual = window.vendaAtual || {
  itens: [],
  subtotal: 0,
  desconto_geral: 0,
  valor_frete: 0,
  valor_despesas: 0,
  valor_total: 0
};

window.produtosSelecionados = window.produtosSelecionados || new Set();

const vendaAtual = window.vendaAtual;
const produtosSelecionados = window.produtosSelecionados;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarClientes();
  carregarVendedores();
  carregarCondicoesPagamento();
  carregarFormasPagamento();
  carregarProdutos();
  
  // Event listeners
  document.getElementById('tipo-venda').addEventListener('change', atualizarCamposVenda);
  document.getElementById('modo-entrega').addEventListener('change', atualizarCamposEntrega);
  document.getElementById('desconto-geral').addEventListener('change', recalcularTotais);
  document.getElementById('valor-frete').addEventListener('change', recalcularTotais);
  document.getElementById('valor-despesas').addEventListener('change', recalcularTotais);
  
  // Form principal
  document.getElementById('form-venda').addEventListener('submit', salvarVenda);
  
  // Form de entrega
  document.getElementById('form-entrega').addEventListener('submit', registrarEntrega);
  
  // Inicializar campos de data com a data atual
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data-venda').value = hoje;
  document.getElementById('data-entrega').value = hoje;
});

// Funções de carregamento de dados
async function carregarClientes() {
  try {
    const response = await fetch('/api/vendas/clientes-ativos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar clientes');
    
    const clientes = await response.json();
    const select = document.getElementById('cliente');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    clientes.forEach(cliente => {
      const opt = document.createElement('option');
      opt.value = cliente.id;
      opt.textContent = `${cliente.nome_razao_social} (${cliente.cpf_cnpj})`;
      select.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
    showMessage('Erro ao carregar clientes', 'error');
  }
}

async function carregarVendedores() {
  try {
    const response = await fetch('/api/vendas/vendedores-ativos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar vendedores');
    
    const vendedores = await response.json();
    const select = document.getElementById('vendedor');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    vendedores.forEach(vendedor => {
      const opt = document.createElement('option');
      opt.value = vendedor.id;
      opt.textContent = vendedor.nome;
      select.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar vendedores:', error);
    showMessage('Erro ao carregar vendedores', 'error');
  }
}

async function carregarCondicoesPagamento() {
  try {
    const response = await fetch('/api/vendas/condicoes-pagamento', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar condições de pagamento');
    
    const condicoes = await response.json();
    const select = document.getElementById('condicao-pagamento');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    condicoes.forEach(condicao => {
      const opt = document.createElement('option');
      opt.value = condicao.id;
      opt.textContent = condicao.descricao;
      select.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar condições de pagamento:', error);
    showMessage('Erro ao carregar condições de pagamento', 'error');
  }
}

async function carregarFormasPagamento() {
  try {
    const response = await fetch('/api/vendas/formas-pagamento', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar formas de pagamento');
    
    const formas = await response.json();
    const select = document.getElementById('forma-pagamento');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    formas.forEach(forma => {
      const opt = document.createElement('option');
      opt.value = forma.id;
      opt.textContent = forma.descricao;
      select.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar formas de pagamento:', error);
    showMessage('Erro ao carregar formas de pagamento', 'error');
  }
}

async function carregarProdutos() {
  try {
    const response = await fetch('/api/vendas/produtos-ativos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar produtos');
    
    const produtos = await response.json();
    const select = document.getElementById('produto');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    produtos.forEach(produto => {
      const opt = document.createElement('option');
      opt.value = produto.id;
      opt.textContent = `${produto.codigo_principal} - ${produto.descricao}`;
      opt.dataset.preco = produto.preco_venda;
      opt.dataset.unidade = produto.unidade;
      select.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    showMessage('Erro ao carregar produtos', 'error');
  }
}

// Funções de manipulação de itens
function adicionarItem() {
  const produtoSelect = document.getElementById('produto');
  const quantidade = document.getElementById('quantidade').value;
  const precoUnitario = document.getElementById('preco-unitario').value;
  const desconto = document.getElementById('desconto-item').value || 0;
  
  if (!produtoSelect.value || !quantidade || !precoUnitario) {
    showMessage('Preencha todos os campos do item', 'error');
    return;
  }
  
  const produtoId = produtoSelect.value;
  
  // Verificar se produto já foi adicionado
  if (produtosSelecionados.has(produtoId)) {
    showMessage('Este produto já foi adicionado', 'error');
    return;
  }
  
  const produto = produtoSelect.options[produtoSelect.selectedIndex];
  const subtotal = (quantidade * precoUnitario) * (1 - desconto/100);
  
  const item = {
    produto_id: produtoId,
    produto_codigo: produto.textContent.split(' - ')[0],
    produto_descricao: produto.textContent.split(' - ')[1],
    quantidade: parseFloat(quantidade),
    preco_unitario: parseFloat(precoUnitario),
    desconto_percentual: parseFloat(desconto),
    unidade: produto.dataset.unidade,
    subtotal
  };
  
  vendaAtual.itens.push(item);
  produtosSelecionados.add(produtoId);
  
  renderizarItens();
  recalcularTotais();
  limparFormItem();
}

function removerItem(index) {
  const item = vendaAtual.itens[index];
  produtosSelecionados.delete(item.produto_id);
  vendaAtual.itens.splice(index, 1);
  renderizarItens();
  recalcularTotais();
}

function renderizarItens() {
  const tbody = document.querySelector('#itens-table tbody');
  tbody.innerHTML = '';
  
  vendaAtual.itens.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.produto_codigo}</td>
      <td>${item.produto_descricao}</td>
      <td>${item.quantidade.toFixed(3)} ${item.unidade}</td>
      <td>R$ ${item.preco_unitario.toFixed(2)}</td>
      <td>${item.desconto_percentual.toFixed(2)}%</td>
      <td>R$ ${item.subtotal.toFixed(2)}</td>
      <td>
        <button type="button" class="btn btn-danger btn-sm" onclick="removerItem(${index})">
          Remover
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function limparFormItem() {
  document.getElementById('produto').value = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('preco-unitario').value = '';
  document.getElementById('desconto-item').value = '';
}

// Funções de cálculo
function recalcularTotais() {
  const descontoGeral = parseFloat(document.getElementById('desconto-geral').value) || 0;
  const valorFrete = parseFloat(document.getElementById('valor-frete').value) || 0;
  const valorDespesas = parseFloat(document.getElementById('valor-despesas').value) || 0;
  
  vendaAtual.subtotal = vendaAtual.itens.reduce((total, item) => total + item.subtotal, 0);
  vendaAtual.desconto_geral = descontoGeral;
  vendaAtual.valor_frete = valorFrete;
  vendaAtual.valor_despesas = valorDespesas;
  
  const valorComDesconto = vendaAtual.subtotal * (1 - descontoGeral/100);
  vendaAtual.valor_total = valorComDesconto + valorFrete + valorDespesas;
  
  // Atualizar campos na tela
  document.getElementById('subtotal').textContent = `R$ ${vendaAtual.subtotal.toFixed(2)}`;
  document.getElementById('valor-total').textContent = `R$ ${vendaAtual.valor_total.toFixed(2)}`;
}

// Funções de controle de campos
function atualizarCamposVenda() {
  const tipoVenda = document.getElementById('tipo-venda').value;
  const camposFiscais = document.querySelectorAll('.campo-fiscal');
  
  camposFiscais.forEach(campo => {
    campo.style.display = tipoVenda === 'FISCAL' ? 'block' : 'none';
    
    // Se for campo obrigatório em venda fiscal
    const input = campo.querySelector('input, select');
    if (input) {
      input.required = tipoVenda === 'FISCAL';
    }
  });
}

function atualizarCamposEntrega() {
  const modoEntrega = document.getElementById('modo-entrega').value;
  const camposEntrega = document.querySelectorAll('.campo-entrega');
  
  camposEntrega.forEach(campo => {
    campo.style.display = modoEntrega === 'PARCIAL' ? 'block' : 'none';
  });
}

// Funções de salvamento
async function salvarVenda(e) {
  e.preventDefault();
  
  if (vendaAtual.itens.length === 0) {
    showMessage('Adicione pelo menos um item à venda', 'error');
    return;
  }
  
  const formData = new FormData(e.target);
  const venda = {
    data_venda: formData.get('data_venda'),
    cliente_id: formData.get('cliente_id'),
    vendedor_id: formData.get('vendedor_id'),
    tipo_venda: formData.get('tipo_venda'),
    condicao_pagamento_id: formData.get('condicao_pagamento_id'),
    forma_pagamento_id: formData.get('forma_pagamento_id'),
    observacoes: formData.get('observacoes'),
    valor_frete: vendaAtual.valor_frete,
    valor_despesas: vendaAtual.valor_despesas,
    desconto_percentual: vendaAtual.desconto_geral,
    modo_entrega: formData.get('modo_entrega'),
    itens: vendaAtual.itens.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_percentual: item.desconto_percentual
    }))
  };
  
  try {
    const response = await fetch('/api/vendas', {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(venda)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar venda');
    }
    
    const result = await response.json();
    showMessage('Venda salva com sucesso!', 'success');
    
    // Gerar NFC-e automaticamente
    try {
      await gerarNFCe(result.id, venda.observacoes);
    } catch (error) {
      console.error('Erro ao gerar NFC-e:', error);
      showMessage('Venda salva, mas houve erro ao gerar NFC-e: ' + error.message, 'warning');
    }
    
    // Se for entrega total, registrar entrega automaticamente
    if (venda.modo_entrega === 'TOTAL') {
      await registrarEntregaTotal(result.id);
    }
    
    // Limpar formulário
    e.target.reset();
    vendaAtual = { itens: [], subtotal: 0, desconto_geral: 0, valor_frete: 0, valor_despesas: 0, valor_total: 0 };
    produtosSelecionados.clear();
    renderizarItens();
    recalcularTotais();
    
  } catch (error) {
    console.error('Erro ao salvar venda:', error);
    showMessage(error.message, 'error');
  }
}

async function registrarEntregaTotal(vendaId) {
  const entrega = {
    data_entrega: document.getElementById('data-venda').value,
    responsavel: document.getElementById('responsavel-entrega').value,
    observacoes: 'Entrega total',
    itens: vendaAtual.itens.map(item => ({
      venda_item_id: item.id,
      quantidade: item.quantidade
    }))
  };
  
  try {
    const response = await fetch(`/api/vendas/${vendaId}/entregas`, {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entrega)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao registrar entrega');
    }
    
  } catch (error) {
    console.error('Erro ao registrar entrega:', error);
    showMessage('Venda salva, mas houve erro ao registrar entrega: ' + error.message, 'warning');
  }
}

async function registrarEntrega(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const entrega = {
    data_entrega: formData.get('data_entrega'),
    responsavel: formData.get('responsavel'),
    observacoes: formData.get('observacoes'),
    itens: []
  };
  
  // Coletar quantidades dos itens
  document.querySelectorAll('[name^="quantidade_entrega_"]').forEach(input => {
    const vendaItemId = input.name.replace('quantidade_entrega_', '');
    const quantidade = parseFloat(input.value);
    
    if (quantidade > 0) {
      entrega.itens.push({
        venda_item_id: parseInt(vendaItemId),
        quantidade
      });
    }
  });
  
  if (entrega.itens.length === 0) {
    showMessage('Informe pelo menos uma quantidade para entrega', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/vendas/${formData.get('venda_id')}/entregas`, {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entrega)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao registrar entrega');
    }
    
    showMessage('Entrega registrada com sucesso!', 'success');
    document.getElementById('modal-entrega').style.display = 'none';
    
    // Recarregar lista de vendas se estiver na tela de vendas
    if (typeof loadVendas === 'function') {
      loadVendas();
    }
    
  } catch (error) {
    console.error('Erro ao registrar entrega:', error);
    showMessage(error.message, 'error');
  }
}

// Event listener para atualizar preço unitário ao selecionar produto
document.getElementById('produto')?.addEventListener('change', function() {
  const option = this.options[this.selectedIndex];
  if (option) {
    document.getElementById('preco-unitario').value = option.dataset.preco || '';
  }
});

// ============================================================================
// FUNÇÕES DE NFC-e
// ============================================================================

// Gerar NFC-e para uma venda
async function gerarNFCe(vendaId, observacoes = '') {
  try {
    const response = await fetch('/api/nfce/gerar', {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        venda_id: vendaId,
        observacoes: observacoes
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao gerar NFC-e');
    }

    const result = await response.json();
    showMessage('NFC-e gerada com sucesso!', 'success');
    
    // Oferecer opção de imprimir
    if (confirm('NFC-e gerada com sucesso! Deseja imprimir o cupom fiscal?')) {
      await imprimirCupomNFCe(result.nfce.id);
    }
    
    return result.nfce;
    
  } catch (error) {
    console.error('Erro ao gerar NFC-e:', error);
    throw error;
  }
}

// Imprimir cupom fiscal da NFC-e
async function imprimirCupomNFCe(nfceId) {
  try {
    const response = await fetch(`/api/nfce/${nfceId}/cupom`, {
      headers: apiHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao gerar cupom');
    }

    const result = await response.json();
    
    // Abrir janela com o cupom para impressão
    const janelaCupom = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
    janelaCupom.document.write(result.cupom_html);
    janelaCupom.document.close();
    
    // Auto-foco para impressão
    janelaCupom.focus();
    
    return result;
    
  } catch (error) {
    console.error('Erro ao imprimir cupom:', error);
    showMessage('Erro ao imprimir cupom: ' + error.message, 'error');
    throw error;
  }
}

// Visualizar cupom de uma NFC-e existente
async function visualizarCupomNFCe(nfceId) {
  try {
    await imprimirCupomNFCe(nfceId);
  } catch (error) {
    showMessage('Erro ao visualizar cupom: ' + error.message, 'error');
  }
}

// Cancelar uma NFC-e
async function cancelarNFCe(nfceId, motivo) {
  try {
    const response = await fetch(`/api/nfce/${nfceId}/cancelar`, {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ motivo })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cancelar NFC-e');
    }

    showMessage('NFC-e cancelada com sucesso!', 'success');
    return true;
    
  } catch (error) {
    console.error('Erro ao cancelar NFC-e:', error);
    showMessage('Erro ao cancelar NFC-e: ' + error.message, 'error');
    throw error;
  }
}

// Buscar NFC-e de uma venda
async function buscarNFCeVenda(vendaId) {
  try {
    const response = await fetch(`/api/nfce?venda_id=${vendaId}`, {
      headers: apiHeaders
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // NFC-e não encontrada
      }
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar NFC-e');
    }

    const result = await response.json();
    return result.nfces && result.nfces.length > 0 ? result.nfces[0] : null;
    
  } catch (error) {
    console.error('Erro ao buscar NFC-e:', error);
    return null;
  }
}