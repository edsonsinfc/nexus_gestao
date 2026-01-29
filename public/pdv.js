// public/pdv.js - Sistema PDV Offline/Online
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Estado da aplicação
let isOnline = navigator.onLine;
let currentCliente = null;
let currentCaixa = null;
let carrinho = [];
let produtos = [];
let vendedores = [];
let vendasPendentes = 0;
let operacaoAtual = 'VENDA'; // VENDA, DEVOLUCAO, TROCA, CANCELAMENTO
let vendaOriginal = null;

// Configurações
const DB_NAME = 'nexus_pdv';
const DB_VERSION = 1;
let db = null;

// Verificar autenticação
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/';
}

// Headers para requisições
const apiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await initDatabase();
  await loadData();
  setupEventListeners();
  setupOperacoesButtons();
  updateUI();
  startSync();
});

// Adicionar botões de operações
function setupOperacoesButtons() {
  const searchBar = document.querySelector('.search-bar');
  const operacoesDiv = document.createElement('div');
  operacoesDiv.className = 'pdv-operacoes';
  operacoesDiv.innerHTML = `
    <div class="btn-group">
      <button class="btn btn-warning" onclick="iniciarDevolucao()">
        <i class="fas fa-undo"></i> Devolução
      </button>
      <button class="btn btn-info" onclick="iniciarTroca()">
        <i class="fas fa-exchange-alt"></i> Troca
      </button>
      <button class="btn btn-danger" onclick="iniciarCancelamento()">
        <i class="fas fa-times"></i> Cancelar Venda
      </button>
    </div>
  `;
  searchBar.after(operacoesDiv);
}

// Inicializar IndexedDB
async function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store de produtos
      if (!db.objectStoreNames.contains('produtos')) {
        const produtosStore = db.createObjectStore('produtos', { keyPath: 'id' });
        produtosStore.createIndex('codigo', 'codigo', { unique: true });
        produtosStore.createIndex('descricao', 'descricao');
      }
      
      // Store de vendas
      if (!db.objectStoreNames.contains('vendas')) {
        const vendasStore = db.createObjectStore('vendas', { keyPath: 'id', autoIncrement: true });
        vendasStore.createIndex('numero', 'numero', { unique: true });
        vendasStore.createIndex('offline', 'offline');
        vendasStore.createIndex('sincronizado', 'sincronizado');
      }
      
      // Store de clientes
      if (!db.objectStoreNames.contains('clientes')) {
        const clientesStore = db.createObjectStore('clientes', { keyPath: 'id' });
        clientesStore.createIndex('codigo', 'codigo', { unique: true });
        clientesStore.createIndex('nome', 'nome_razao_social');
      }
      
      // Store de vendedores
      if (!db.objectStoreNames.contains('vendedores')) {
        const vendedoresStore = db.createObjectStore('vendedores', { keyPath: 'id' });
        vendedoresStore.createIndex('codigo', 'codigo', { unique: true });
      }
    };
  });
}

// Carregar dados
async function loadData() {
  try {
    showMessage('Carregando dados...', 'info');
    if (isOnline) {
      await loadFromAPI();
    } else {
      await loadFromIndexedDB();
    }
    console.log('Produtos carregados:', produtos); // Debug
    renderProducts();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showMessage('Erro ao carregar dados. Usando dados offline.', 'error');
    await loadFromIndexedDB();
    renderProducts();
  }
}

// Carregar dados da API
async function loadFromAPI() {
  try {
  // Buscar produtos
  const produtosRes = await fetch('/api/produtos/ativos', { 
    headers: apiHeaders 
  });
  
  if (!produtosRes.ok) {
    throw new Error('Erro ao carregar produtos');
  }
  
  const produtosData = await produtosRes.json();
  produtos = produtosData.data || produtosData;
  
  // Se não houver produtos, adicionar alguns para teste
  if (!produtos || produtos.length === 0) {
    produtos = [
      { id: 1, codigo: '001', descricao: 'Produto Teste 1', preco_venda: 29.90, estoque_atual: 10 },
      { id: 2, codigo: '002', descricao: 'Produto Teste 2', preco_venda: 49.90, estoque_atual: 5 },
      { id: 3, codigo: '003', descricao: 'Produto Teste 3', preco_venda: 99.90, estoque_atual: 15 }
    ];
  }
  
  console.log('Produtos carregados:', produtos);
  await saveToIndexedDB('produtos', produtos);    // Buscar clientes
    const clientesRes = await fetch('/api/vendas/clientes-ativos', {
      headers: apiHeaders
    });
    
    if (clientesRes.ok) {
      const clientesData = await clientesRes.json();
      const clientes = clientesData.data || clientesData;
      await saveToIndexedDB('clientes', clientes);
    }

    // Buscar vendedores
    const vendedoresRes = await fetch('/api/vendas/vendedores-ativos', {
      headers: apiHeaders
    });
    
    if (vendedoresRes.ok) {
      const vendedoresData = await vendedoresRes.json();
      vendedores = vendedoresData.data || vendedoresData;
      await saveToIndexedDB('vendedores', vendedores);
    }

    showMessage('Dados carregados com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao carregar dados da API:', error);
    showMessage('Erro ao carregar dados: ' + error.message, 'error');
    throw error;
  }
}

// Carregar dados do IndexedDB
async function loadFromIndexedDB() {
  produtos = await getFromIndexedDB('produtos');
  vendedores = await getFromIndexedDB('vendedores');
  await loadVendasPendentes();
}

// Salvar no IndexedDB
async function saveToIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Limpar store existente
    store.clear();
    
    // Adicionar novos dados
    data.forEach(item => store.add(item));
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Obter do IndexedDB
async function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Configurar event listeners
function setupEventListeners() {
  // Status de conexão
  window.addEventListener('online', () => {
    isOnline = true;
    updateConnectionStatus();
    startSync();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    updateConnectionStatus();
  });

  // Busca de produtos
  const searchInput = $('#product-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      console.log('Evento de busca:', e.target.value); // Debug
      filterProducts(e.target.value);
    });
  } else {
    console.error('Campo de busca não encontrado');
  }

  // Busca de clientes
  $('#cliente-search').addEventListener('input', (e) => {
    searchClientes(e.target.value);
  });
}

// Atualizar UI
function updateUI() {
  renderProducts();
  renderCart();
  updateConnectionStatus();
  loadVendedores();
}

// Renderizar produtos
function renderProducts(filtro = '') {
  const grid = $('#products-grid');
  grid.innerHTML = '';

  const produtosFiltrados = produtos.filter(produto => 
    (produto.ativo !== false) && 
    (filtro === '' || 
     produto.descricao?.toLowerCase().includes(filtro.toLowerCase()) ||
     produto.codigo?.toLowerCase().includes(filtro.toLowerCase()))
  );

  if (produtosFiltrados.length === 0) {
    grid.innerHTML = `
      <div class="no-products">
        <i class="fas fa-search"></i>
        <p>Nenhum produto encontrado</p>
      </div>
    `;
    return;
  }

  produtosFiltrados.forEach(produto => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const estoque = produto.estoque_atual || 0;
    const estoqueClass = estoque > 0 ? 'in-stock' : 'out-of-stock';
    const estoqueText = estoque > 0 ? 
      `<i class="fas fa-box"></i> ${estoque} unidades em estoque` : 
      `<i class="fas fa-box-open"></i> Fora de estoque`;
    
    // Usar imagem do produto se disponível, ou placeholder
    const imagemUrl = produto.imagem_url || 'https://via.placeholder.com/150?text=Sem+Foto';
    
    card.innerHTML = `
      <div class="product-info">
        <div class="product-code">${produto.codigo || 'Sem código'}</div>
        <div class="product-name">${produto.descricao}</div>
      </div>
      
      <div class="product-highlight">
        <div class="product-price">R$ ${parseFloat(produto.preco_venda || 0).toFixed(2)}</div>
        <div class="product-stock ${estoqueClass}">
          ${estoqueText}
        </div>
      </div>

      <button class="btn btn-add-cart" onclick="addToCart(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
        <i class="fas fa-cart-plus"></i>
        Adicionar ao Carrinho
      </button>
    `;
    
    grid.appendChild(card);
  });
}
}

// Filtrar produtos
function filterProducts(search) {
  console.log('Buscando produtos:', search); // Debug
  const searchLower = search.toLowerCase();
  
  const filtered = produtos.filter(produto => 
    produto.descricao?.toLowerCase().includes(searchLower) ||
    produto.codigo?.toLowerCase().includes(searchLower)
  );
  
  console.log('Produtos encontrados:', filtered.length); // Debug
  renderProducts(search);
}

// Adicionar ao carrinho
function addToCart(produto) {
  const existingItem = carrinho.find(item => item.produto_id === produto.id);
  
  if (existingItem) {
    existingItem.quantidade += 1;
  } else {
    carrinho.push({
      produto_id: produto.id,
      codigo: produto.codigo,
      descricao: produto.descricao,
      preco_unitario: parseFloat(produto.preco_venda),
      quantidade: 1,
      valor_total: parseFloat(produto.preco_venda)
    });
  }
  
  updateCartTotals();
  renderCart();
}

// Renderizar carrinho
function renderCart() {
  const container = $('#cart-items');
  container.innerHTML = '';

  carrinho.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    
    cartItem.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.descricao}</div>
        <div class="item-details">
          <span class="item-code">${item.codigo || 'Sem código'}</span>
          <span class="item-price">R$ ${item.preco_unitario.toFixed(2)} un</span>
        </div>
      </div>
      <div class="item-controls">
        <button class="qty-btn" onclick="updateQuantity(${index}, -1)">
          <i class="fas fa-minus"></i>
        </button>
        <input type="number" class="qty-input" value="${item.quantidade}" min="1" 
               onchange="updateQuantity(${index}, 0, this.value)">
        <button class="qty-btn" onclick="updateQuantity(${index}, 1)">
          <i class="fas fa-plus"></i>
        </button>
        <button class="qty-btn remove-btn" onclick="removeFromCart(${index})" title="Remover item">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="item-total">R$ ${item.valor_total.toFixed(2)}</div>
    `;
    
    container.appendChild(cartItem);
  });
}

// Atualizar quantidade
function updateQuantity(index, change, newValue = null) {
  const item = carrinho[index];
  
  if (newValue !== null) {
    item.quantidade = parseInt(newValue) || 1;
  } else {
    item.quantidade = Math.max(1, item.quantidade + change);
  }
  
  item.valor_total = item.preco_unitario * item.quantidade;
  updateCartTotals();
  renderCart();
}

// Remover do carrinho
function removeFromCart(index) {
  carrinho.splice(index, 1);
  updateCartTotals();
  renderCart();
}

// Atualizar totais do carrinho
function updateCartTotals() {
  const total = carrinho.reduce((sum, item) => sum + item.valor_total, 0);
  const count = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  
  $('#cart-total').textContent = `R$ ${total.toFixed(2)}`;
  $('#cart-count').textContent = `${count} itens`;
}

// Limpar carrinho
function limparCarrinho() {
  if (carrinho.length === 0) return;
  
  if (confirm('Tem certeza que deseja limpar o carrinho?')) {
    carrinho = [];
    updateCartTotals();
    renderCart();
  }
}

// Finalizar venda
function finalizarVenda() {
  if (carrinho.length === 0) {
    alert('Carrinho vazio!');
    return;
  }
  
  $('#modal-finalizar').classList.add('active');
}

// Confirmar venda
async function confirmarVenda() {
  const formaPagamento = $('#forma-pagamento').value;
  const vendedorId = $('#vendedor').value;
  const observacoes = $('#observacoes').value;
  
  if (!vendedorId) {
    alert('Selecione um vendedor!');
    return;
  }
  
  const venda = {
    numero: generateVendaNumber(),
    cliente_id: currentCliente?.id || null,
    vendedor_id: parseInt(vendedorId),
    caixa_id: currentCaixa?.id || null,
    data_venda: new Date().toISOString(),
    valor_total: carrinho.reduce((sum, item) => sum + item.valor_total, 0),
    desconto: 0,
    valor_final: carrinho.reduce((sum, item) => sum + item.valor_total, 0),
    forma_pagamento: formaPagamento,
    observacoes: observacoes,
    offline: !isOnline,
    sincronizado: isOnline ? 1 : 0,
    itens: carrinho.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: 0,
      valor_total: item.valor_total
    }))
  };
  
  try {
    if (isOnline) {
      await enviarVendaOnline(venda);
    } else {
      await salvarVendaOffline(venda);
    }
    
    // Limpar carrinho
    carrinho = [];
    updateCartTotals();
    renderCart();
    
    fecharModal('modal-finalizar');
    showMessage('Venda finalizada com sucesso!', 'success');
    
  } catch (error) {
    console.error('Erro ao finalizar venda:', error);
    showMessage('Erro ao finalizar venda: ' + error.message, 'error');
  }
}

// Enviar venda online
async function enviarVendaOnline(venda) {
  const response = await fetch('/api/vendas', {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(venda)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao enviar venda');
  }
}

// Salvar venda offline
async function salvarVendaOffline(venda) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['vendas'], 'readwrite');
    const store = transaction.objectStore('vendas');
    
    store.add(venda).onsuccess = () => {
      vendasPendentes++;
      updateSyncStatus();
      resolve();
    };
    
    store.add(venda).onerror = () => reject(store.add(venda).error);
  });
}

// Gerar número da venda
function generateVendaNumber() {
  const timestamp = Date.now();
  return `VEN${timestamp.toString().slice(-6)}`;
}

// Sincronizar vendas pendentes
async function startSync() {
  if (!isOnline) return;
  
  setSyncStatus('syncing', 'Sincronizando...');
  
  try {
    const vendasOffline = await getFromIndexedDB('vendas');
    const vendasPendentes = vendasOffline.filter(v => !v.sincronizado);
    
    if (vendasPendentes.length > 0) {
      const response = await fetch('/api/vendas/sincronizar', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ vendas: vendasPendentes })
      });
      
      if (response.ok) {
        // Marcar como sincronizadas
        await marcarComoSincronizadas(vendasPendentes);
        vendasPendentes = 0;
        updateSyncStatus();
      }
    }
    
    setSyncStatus('synced', 'Sincronizado');
    
  } catch (error) {
    console.error('Erro na sincronização:', error);
    setSyncStatus('error', 'Erro na sincronização');
  }
}

// Marcar vendas como sincronizadas
async function marcarComoSincronizadas(vendas) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['vendas'], 'readwrite');
    const store = transaction.objectStore('vendas');
    
    vendas.forEach(venda => {
      venda.sincronizado = 1;
      store.put(venda);
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Carregar vendas pendentes
async function loadVendasPendentes() {
  const vendas = await getFromIndexedDB('vendas');
  vendasPendentes = vendas.filter(v => !v.sincronizado).length;
  updateSyncStatus();
}

// Atualizar status de sincronização
function updateSyncStatus() {
  $('#vendas-pendentes').textContent = `${vendasPendentes} vendas pendentes`;
}

// Definir status de sincronização
function setSyncStatus(status, text) {
  const indicator = $('#sync-indicator');
  const textEl = $('#sync-text');
  
  indicator.className = `sync-indicator ${status}`;
  textEl.textContent = text;
}

// Atualizar status de conexão
function updateConnectionStatus() {
  const indicator = $('#offline-indicator');
  const status = $('#connection-status');
  
  if (isOnline) {
    indicator.classList.add('online');
    status.textContent = 'Online';
  } else {
    indicator.classList.remove('online');
    status.textContent = 'Offline';
  }
}

// Modal functions
function abrirModalCliente() {
  console.log('Abrindo modal de cliente'); // Debug
  const modal = $('#modal-cliente');
  if (modal) {
    modal.classList.add('active');
    // Adicionar alguns clientes de teste
    const clientesTeste = [
      { id: 1, nome_razao_social: 'Cliente Teste 1', cpf_cnpj: '123.456.789-00' },
      { id: 2, nome_razao_social: 'Cliente Teste 2', cpf_cnpj: '987.654.321-00' }
    ];
    const container = $('#clientes-lista');
    if (container) {
      container.innerHTML = clientesTeste.map(cliente => `
        <div class="cliente-item" onclick="selecionarCliente(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">
          <div class="cliente-info">
            <div class="cliente-nome">${cliente.nome_razao_social}</div>
            <div class="cliente-documento">CPF: ${cliente.cpf_cnpj}</div>
          </div>
          <div class="cliente-selecionar">
            <i class="fas fa-chevron-right"></i>
          </div>
        </div>
      `).join('');
    }
  } else {
    console.error('Modal de cliente não encontrado');
  }
}

function abrirModalCaixa() {
  const modal = $('#modal-caixa');
  if (modal) {
    modal.classList.add('active');
    loadCaixaInfo();
  }
}

function fecharModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Buscar clientes
async function searchClientes(search) {
  try {
    let clientes;
    if (isOnline) {
      // Tentar buscar da API primeiro
      const response = await fetch(`/api/vendas/clientes-ativos?search=${encodeURIComponent(search)}`, {
        headers: apiHeaders
      });
      
      if (response.ok) {
        const data = await response.json();
        clientes = data.data || data;
      } else {
        throw new Error('Erro ao buscar clientes');
      }
    } else {
      // Fallback para IndexedDB
      clientes = await getFromIndexedDB('clientes');
    }
    
    // Filtrar clientes
    const filtered = clientes.filter(cliente => 
      cliente.nome_razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      (cliente.cpf_cnpj && cliente.cpf_cnpj.includes(search))
    );
    
    // Renderizar lista
    const container = $('#clientes-lista');
    container.innerHTML = filtered.length ? '' : '<div class="no-results">Nenhum cliente encontrado</div>';
    
    filtered.forEach(cliente => {
      const item = document.createElement('div');
      item.className = 'cliente-item';
      item.onclick = () => selecionarCliente(cliente);
      
      const tipo = cliente.cpf_cnpj?.length === 11 ? 'CPF' : 'CNPJ';
      
      item.innerHTML = `
        <div class="cliente-info">
          <div class="cliente-nome">${cliente.nome_razao_social || 'Nome não informado'}</div>
          <div class="cliente-documento">
            <span class="documento-tipo">${tipo}:</span>
            <span class="documento-numero">${cliente.cpf_cnpj || 'Não informado'}</span>
          </div>
        </div>
        <div class="cliente-selecionar">
          <i class="fas fa-chevron-right"></i>
        </div>
      `;
      
      container.appendChild(item);
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    showMessage('Erro ao buscar clientes: ' + error.message, 'error');
  }
}
}

// Selecionar cliente
function selecionarCliente(cliente) {
  currentCliente = cliente;
  fecharModal('modal-cliente');
  updateUI();
}

// Carregar informações do caixa
async function loadCaixaInfo() {
  // Implementar busca de caixa ativo
  $('#caixa-status').textContent = 'Não implementado';
  $('#caixa-valor').textContent = 'R$ 0,00';
}

// Carregar vendedores
function loadVendedores() {
  const select = $('#vendedor');
  select.innerHTML = '';
  
  vendedores.forEach(vendedor => {
    const option = document.createElement('option');
    option.value = vendedor.id;
    option.textContent = vendedor.nome;
    select.appendChild(option);
  });
}

// Utilitários
function showMessage(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Adicionar classe para animar entrada
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remover após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-times-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'info': return 'fa-info-circle';
    default: return 'fa-info-circle';
  }
}

// Toggle caixa
function toggleCaixa() {
  // Implementar abertura/fechamento de caixa
  alert('Funcionalidade em desenvolvimento');
}

// Operações do PDV
function iniciarDevolucao() {
  operacaoAtual = 'DEVOLUCAO';
  const numeroVenda = prompt('Digite o número da venda:');
  if (numeroVenda) {
    buscarVendaParaOperacao(numeroVenda);
  }
}

function iniciarTroca() {
  operacaoAtual = 'TROCA';
  const numeroVenda = prompt('Digite o número da venda:');
  if (numeroVenda) {
    buscarVendaParaOperacao(numeroVenda);
  }
}

function iniciarCancelamento() {
  operacaoAtual = 'CANCELAMENTO';
  const numeroVenda = prompt('Digite o número da venda:');
  if (numeroVenda) {
    buscarVendaParaOperacao(numeroVenda);
  }
}

async function buscarVendaParaOperacao(numero) {
  try {
    const response = await fetch(`/api/vendas/${numero}`, {
      headers: apiHeaders
    });

    if (!response.ok) {
      throw new Error('Venda não encontrada');
    }

    vendaOriginal = await response.json();

    if (vendaOriginal.status === 'CANCELADO') {
      throw new Error('Esta venda já está cancelada');
    }

    // Para cancelamento, confirmar direto
    if (operacaoAtual === 'CANCELAMENTO') {
      const motivo = prompt('Informe o motivo do cancelamento:');
      if (motivo) {
        await cancelarVenda(motivo);
      }
      return;
    }

    // Para devolução/troca, mostrar produtos
    mostrarProdutosParaDevolucao();

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function mostrarProdutosParaDevolucao() {
  limparCarrinho();
  
  const grid = $('#products-grid');
  grid.innerHTML = '';
  
  vendaOriginal.itens.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    card.innerHTML = `
      <div class="product-name">${item.produto.descricao}</div>
      <div class="product-price">R$ ${item.valor_unitario.toFixed(2)}</div>
      <div class="item-controls">
        <input type="number" class="form-control" 
               min="0" max="${item.quantidade}" value="0"
               onchange="addToDevolution(${item.produto_id}, this.value, ${item.valor_unitario})">
        <input type="text" class="form-control" 
               placeholder="Motivo"
               onchange="updateDevolutionReason(${item.produto_id}, this.value)">
      </div>
    `;
    
    grid.appendChild(card);
  });

  if (operacaoAtual === 'TROCA') {
    $('#product-search').style.display = 'block';
    showMessage('Selecione os produtos a devolver e depois adicione os novos produtos', 'info');
  } else {
    $('#product-search').style.display = 'none';
  }
}

function addToDevolution(produtoId, quantidade, valorUnitario) {
  const index = carrinho.findIndex(item => item.produto_id === produtoId);
  
  if (quantidade > 0) {
    if (index === -1) {
      carrinho.push({
        produto_id: produtoId,
        quantidade: Number(quantidade),
        valor_unitario: valorUnitario,
        valor_total: quantidade * valorUnitario,
        tipo: 'DEVOLUCAO'
      });
    } else {
      carrinho[index].quantidade = Number(quantidade);
      carrinho[index].valor_total = quantidade * valorUnitario;
    }
  } else if (index !== -1) {
    carrinho.splice(index, 1);
  }
  
  updateCartTotals();
  renderCart();
}

function updateDevolutionReason(produtoId, motivo) {
  const item = carrinho.find(item => item.produto_id === produtoId);
  if (item) {
    item.motivo = motivo;
  }
}

async function processarDevolucaoOuTroca() {
  if (carrinho.length === 0) {
    showMessage('Selecione ao menos um item para devolver', 'warning');
    return;
  }

  const itensDevolucao = carrinho
    .filter(item => item.tipo === 'DEVOLUCAO')
    .map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      motivo: item.motivo || 'Não informado'
    }));

  if (operacaoAtual === 'TROCA') {
    const itensNovos = carrinho
      .filter(item => !item.tipo || item.tipo === 'NOVO')
      .map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario
      }));

    const valorDevolucao = itensDevolucao.reduce((total, item) => 
      total + (item.quantidade * item.valor_unitario), 0);
    
    const valorNovos = itensNovos.reduce((total, item) =>
      total + (item.quantidade * item.valor_unitario), 0);

    const valorDiferenca = valorNovos - valorDevolucao;

    const dados = {
      venda_id: vendaOriginal.id,
      tipo_operacao: 'TROCA',
      forma_ressarcimento: 'TROCA',
      valor_total: valorDevolucao,
      valor_diferenca: valorDiferenca,
      forma_pagamento_diferenca: valorDiferenca > 0 ? 'DINHEIRO' : null,
      itens: itensDevolucao,
      itens_novos: itensNovos,
      motivo: 'Troca via PDV'
    };

    try {
      const response = await fetch('/api/devolucoes', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        throw new Error('Erro ao processar troca');
      }

      const result = await response.json();
      
      if (valorDiferenca > 0) {
        await processarPagamento(valorDiferenca);
      }

      showMessage('Troca realizada com sucesso!', 'success');
      
      if (confirm('Deseja imprimir o comprovante?')) {
        await imprimirComprovante(result.devolucaoId);
      }

      resetarPDV();

    } catch (error) {
      showMessage(error.message, 'error');
    }

  } else {
    // Processar devolução simples
    const dados = {
      venda_id: vendaOriginal.id,
      tipo_operacao: 'DEVOLUCAO',
      forma_ressarcimento: 'CREDITO',
      valor_total: itensDevolucao.reduce((total, item) => 
        total + (item.quantidade * item.valor_unitario), 0),
      itens: itensDevolucao,
      motivo: 'Devolução via PDV'
    };

    try {
      const response = await fetch('/api/devolucoes', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        throw new Error('Erro ao processar devolução');
      }

      const result = await response.json();
      showMessage('Devolução realizada com sucesso!', 'success');
      
      if (confirm('Deseja imprimir o comprovante?')) {
        await imprimirComprovante(result.devolucaoId);
      }

      resetarPDV();

    } catch (error) {
      showMessage(error.message, 'error');
    }
  }
}

async function cancelarVenda(motivo) {
  try {
    const response = await fetch('/api/devolucoes/cancelar', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        venda_id: vendaOriginal.id,
        motivo: motivo
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao cancelar venda');
    }

    showMessage('Venda cancelada com sucesso!', 'success');
    resetarPDV();

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function imprimirComprovante(id) {
  try {
    const response = await fetch(`/api/devolucoes/${id}/imprimir`, {
      headers: apiHeaders
    });
    
    if (!response.ok) {
      throw new Error('Erro ao gerar comprovante');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    showMessage('Erro ao imprimir comprovante: ' + error.message, 'error');
  }
}

function resetarPDV() {
  operacaoAtual = 'VENDA';
  vendaOriginal = null;
  carrinho = [];
  updateCartTotals();
  renderCart();
  document.querySelector('.page-title').textContent = 'PDV - Ponto de Venda';
  $('#product-search').style.display = 'block';
  renderProducts();
}
