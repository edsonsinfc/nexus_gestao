// PDV - Sistema de Vendas
console.log('🚀🚀🚀 ==================== PDV SCRIPT CARREGADO ==================== 🚀🚀🚀');

// Estado da aplicação
let produtos = [];
let carrinho = [];
let cliente = null;
let vendedores = [];
let clientes = [];
let desconto = {
    tipo: 'percentual', // 'percentual' ou 'valor'
    valor: 0
};
let limiteDesconto = 10; // Limite padrão de 10%
let usuarioLogado = null;

// Token de autenticação
console.log('🔑 Verificando token no localStorage...');
const token = localStorage.getItem('token');
console.log('🔑 Token encontrado:', token ? 'SIM (' + token.substring(0, 50) + '...)' : '❌ NÃO');

if (!token) {
    console.error('❌ Token não encontrado! Redirecionando para login...');
    alert('Você precisa fazer login primeiro!');
    window.location.href = '/';
}

// Headers para requisições
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// Configurações de tempo do PIX (ajustáveis via localStorage)
// localStorage keys opcionais:
//  - pix_timeout_ms (padrão: 600000 = 10min)
//  - pix_poll_ms (padrão: 3000ms)
//  - pix_progress_ms (padrão: 500ms)
const PIX_TIMEOUT_MS = Number(localStorage.getItem('pix_timeout_ms')) || (10 * 60 * 1000);
const PIX_POLL_INTERVAL_MS = Number(localStorage.getItem('pix_poll_ms')) || 3000;
const PIX_PROGRESS_TICK_MS = Number(localStorage.getItem('pix_progress_ms')) || 500;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado');
    loadInitialData();
    setupEventListeners();
    loadUserPermissions();
    
    // Debug: verificar se elementos existem
    setTimeout(() => {
        const valorDescontoInput = document.getElementById('valor-desconto');
        console.log('🔍 Input de desconto:', valorDescontoInput ? 'ENCONTRADO' : '❌ NÃO ENCONTRADO');
        if (valorDescontoInput) {
            console.log('   - Disabled:', valorDescontoInput.disabled);
            console.log('   - ReadOnly:', valorDescontoInput.readOnly);
            console.log('   - Value:', valorDescontoInput.value);
        }
    }, 2000);
});

// Carregamento inicial
async function loadInitialData() {
    console.log('🚀 ==================== CARREGANDO DADOS ====================');
    showToast('Carregando dados...', 'info');
    
    try {
        // Buscar produtos do banco
        console.log('1️⃣ Carregando produtos...');
        await loadProdutos();
        console.log('✅ Produtos carregados!');
        
        // Buscar vendedores do banco
        console.log('2️⃣ Carregando vendedores...');
        await loadVendedores();
        console.log('✅ Vendedores carregados!');
        
        // Buscar clientes do banco
        console.log('3️⃣ Carregando clientes...');
        await loadClientes();
        console.log('✅ Clientes carregados!');
        
        // Não renderizar produtos inicialmente - apenas quando buscar
        renderEmptyState();
        console.log('🎉 ==================== CARREGAMENTO COMPLETO ====================');
        showToast('Dados carregados com sucesso!', 'success');
    } catch (error) {
        console.error('❌ ==================== ERRO NO CARREGAMENTO ====================');
        console.error('Erro ao carregar dados:', error);
        console.error('Stack:', error.stack);
        showToast('Erro ao carregar dados: ' + error.message, 'error');
    }
}

// Renderizar estado vazio (antes da busca)
function renderEmptyState() {
    // Não faz nada - grid está oculto
}

function filterProducts(search) {
    // Função antiga - não mais usada
    // Mantida para compatibilidade
}

// Buscar produtos da API
async function loadProdutos() {
    try {
        const response = await fetch('/api/produtos', { headers });
        
        if (!response.ok) {
            throw new Error('Erro ao buscar produtos');
        }
        
        const data = await response.json();
        console.log('Resposta da API produtos:', data);
        
        // Tentar diferentes estruturas de resposta
        let todosProdutos = [];
        if (Array.isArray(data)) {
            todosProdutos = data;
        } else if (data.data && Array.isArray(data.data)) {
            todosProdutos = data.data;
        } else if (data.produtos && Array.isArray(data.produtos)) {
            todosProdutos = data.produtos;
        } else {
            console.error('Estrutura de dados inesperada:', data);
            throw new Error('Formato de resposta inválido');
        }
        
    // Filtrar apenas produtos ativos; assume ativo quando campo não vier preenchido
    produtos = todosProdutos.filter(p => ![0, '0', false].includes(p.ativo));
        
        console.log('✅ Produtos carregados:', produtos.length, 'de', todosProdutos.length, 'total');
        if (produtos.length > 0) {
            console.log('📦 Exemplo de produto:', produtos[0]);
            console.log('💰 Campos de preço disponíveis:', {
                preco: produtos[0].preco,
                preco_venda: produtos[0].preco_venda,
                preco_custo: produtos[0].preco_custo
            });
        }
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        throw error;
    }
}

// Buscar vendedores da API
async function loadVendedores() {
    console.log('⚡ ==================== LOAD VENDEDORES INICIADO ====================');
    console.log('⚡ Token:', token ? 'EXISTE' : '❌ NÃO EXISTE');
    console.log('⚡ Headers:', JSON.stringify(headers));
    
    try {
        console.log('🔍 Iniciando busca de vendedores...');
        console.log('📡 URL:', '/api/vendedores');
        console.log('🔑 Headers:', headers);
        
        const response = await fetch('/api/vendedores', { headers });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na API vendedores:', errorText);
            throw new Error(`Erro ao buscar vendedores: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📦 Resposta RAW da API:', data);
        console.log('📦 Tipo da resposta:', typeof data);
        console.log('📦 É array?', Array.isArray(data));
        
        // Tentar diferentes estruturas de resposta
        let todosVendedores = [];
        if (Array.isArray(data)) {
            console.log('✅ Resposta é um array direto');
            todosVendedores = data;
        } else if (data.data && Array.isArray(data.data)) {
            console.log('✅ Resposta tem data.data[]');
            todosVendedores = data.data;
        } else if (data.vendedores && Array.isArray(data.vendedores)) {
            console.log('✅ Resposta tem data.vendedores[]');
            todosVendedores = data.vendedores;
        } else {
            console.error('❌ Estrutura inesperada de vendedores:', data);
            console.log('🔍 Keys disponíveis:', Object.keys(data));
            todosVendedores = [];
        }
        
        console.log('📊 Total de vendedores na resposta:', todosVendedores.length);
        
        // DEBUG: Ver todos os vendedores antes do filtro
        console.log('🔍 TODOS OS VENDEDORES (antes do filtro):');
        todosVendedores.forEach((v, i) => {
            console.log(`   [${i}] ID=${v.id}, Nome=${v.nome}, Ativo=${v.ativo} (tipo: ${typeof v.ativo})`);
        });
        
        // Filtrar apenas vendedores ativos
        const vendedoresAtivos = todosVendedores.filter(v => {
            const ativo = v.ativo === 1 || v.ativo === true || v.ativo === '1';
            console.log(`   Vendedor ${v.nome}: ativo=${v.ativo} (tipo: ${typeof v.ativo}) - ${ativo ? 'INCLUÍDO' : 'IGNORADO'}`);
            return ativo;
        });
        
        vendedores = vendedoresAtivos;
        
        console.log('✅ Vendedores ATIVOS carregados:', vendedores.length, 'de', todosVendedores.length, 'total');
        if (vendedores.length > 0) {
            console.log('👤 Exemplo de vendedor:', vendedores[0]);
            console.log('📋 Campos do vendedor:', Object.keys(vendedores[0]));
        } else {
            console.warn('⚠️ Nenhum vendedor ativo encontrado!');
        }
        
        // Atualizar select de vendedores
        const select = document.getElementById('vendedor');
        console.log('🔍 Select de vendedor:', select ? 'ENCONTRADO' : '❌ NÃO ENCONTRADO');
        
        if (select) {
            const options = '<option value="">Selecione um vendedor</option>' + 
                vendedores.map(v => {
                    console.log(`   Criando option: ID=${v.id}, Nome=${v.nome}`);
                    return `<option value="${v.id}">${v.nome}</option>`;
                }).join('');
            
            select.innerHTML = options;
            console.log('✅ Select atualizado com', vendedores.length, 'vendedores');
            console.log('📊 HTML do select:', select.innerHTML.substring(0, 200) + '...');
        } else {
            console.error('❌ Select de vendedor NÃO ENCONTRADO no DOM!');
            console.log('🔍 Verificando se modal existe...');
            const modal = document.getElementById('modal-finalizar');
            console.log('   Modal finalizar:', modal ? 'EXISTE' : 'NÃO EXISTE');
        }
    } catch (error) {
        console.error('❌ Erro COMPLETO ao carregar vendedores:', error);
        throw error;
    }
}

// Buscar clientes da API
async function loadClientes() {
    try {
        console.log('Iniciando busca de clientes...');
        const response = await fetch('/api/clientes', { headers });
        
        console.log('Response clientes status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na API clientes:', errorText);
            throw new Error(`Erro ao buscar clientes: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta COMPLETA da API clientes:', JSON.stringify(data, null, 2));
        
        // Tentar diferentes estruturas de resposta
        if (Array.isArray(data)) {
            clientes = data;
        } else if (data.data && Array.isArray(data.data)) {
            clientes = data.data;
        } else if (data.clientes && Array.isArray(data.clientes)) {
            clientes = data.clientes;
        } else {
            console.error('Estrutura inesperada de clientes:', data);
            clientes = [];
        }
        
        // Filtrar apenas clientes ativos
        clientes = clientes.filter(c => c.ativo === 1 || c.ativo === true);
        
        console.log('Clientes carregados:', clientes.length);
        if (clientes.length > 0) {
            console.log('Exemplo de cliente:', clientes[0]);
        }
    } catch (error) {
        console.error('Erro COMPLETO ao carregar clientes:', error);
        // Não joga erro para não bloquear o PDV
    }
}

// Event Listeners
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Busca de produtos
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const search = e.target.value;
            console.log('Busca:', search);
            searchProducts(search);
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                hideSearchResults();
            }
        });
        
        console.log('Event listener de busca configurado');
    } else {
        console.error('Campo de busca não encontrado!');
    }

    // Busca de clientes
    const clienteSearch = document.getElementById('cliente-search');
    if (clienteSearch) {
        clienteSearch.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            filterClientes(search);
        });
    }
}

// Buscar produtos e mostrar dropdown
function searchProducts(search) {
    const resultsDiv = document.getElementById('search-results');
    if (!resultsDiv) return;

    // Se estiver vazio, esconder
    if (search.trim() === '') {
        hideSearchResults();
        return;
    }

    // Se menos de 2 caracteres, mostrar hint
    if (search.length < 2) {
        resultsDiv.innerHTML = `
            <div class="search-hint">
                <i class="fas fa-keyboard"></i>
                Digite pelo menos 2 caracteres
            </div>
        `;
        resultsDiv.classList.add('show');
        return;
    }

    // Filtrar produtos
    const filterLower = search.toLowerCase();
    const filteredProducts = produtos.filter(produto => {
        const descricao = (produto.descricao || '').toLowerCase();
        const codigo = (produto.codigo_principal || '').toLowerCase();
        const gtin = (produto.gtin || '').toLowerCase();
        
        return descricao.includes(filterLower) || 
               codigo.includes(filterLower) || 
               gtin.includes(filterLower);
    });

    console.log('Produtos encontrados:', filteredProducts.length);

    // Mostrar resultados
    if (filteredProducts.length === 0) {
        resultsDiv.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
    } else {
        resultsDiv.innerHTML = filteredProducts.slice(0, 10).map(produto => {
            const estoque = parseFloat(produto.estoque || produto.estoque_atual || 0);
            const estoqueIcon = estoque > 10 ? 'fa-check-circle' : estoque > 0 ? 'fa-exclamation-triangle' : 'fa-times-circle';
            const estoqueColor = estoque > 10 ? '#16a34a' : estoque > 0 ? '#f59e0b' : '#dc2626';
            
            return `
                <div class="search-result-item" onclick="addToCartFromSearch(${produto.id})">
                    <div class="result-info">
                        <div class="result-code">${produto.codigo_principal || produto.codigo || 'Sem código'}</div>
                        <div class="result-name">${produto.descricao}</div>
                        <div class="result-price">R$ ${parseFloat(produto.preco || produto.preco_venda || 0).toFixed(2)}</div>
                    </div>
                    <div class="result-stock" style="color: ${estoqueColor};">
                        <i class="fas ${estoqueIcon}"></i>
                        ${estoque.toFixed(2)} ${produto.unidade || 'UN'}
                    </div>
                </div>
            `;
        }).join('');
        
        if (filteredProducts.length > 10) {
            resultsDiv.innerHTML += `
                <div class="search-hint">
                    Mostrando 10 de ${filteredProducts.length} produtos. Refine sua busca.
                </div>
            `;
        }
    }

    resultsDiv.classList.add('show');
}

// Esconder resultados da busca
function hideSearchResults() {
    const resultsDiv = document.getElementById('search-results');
    if (resultsDiv) {
        resultsDiv.classList.remove('show');
    }
}

// Adicionar ao carrinho a partir da busca
function addToCartFromSearch(produtoId) {
    addToCart(produtoId);
    
    // Limpar busca e esconder resultados
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.value = '';
    }
    hideSearchResults();
    
    // Focar no input novamente
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 100);
}

// Filtrar clientes no modal
function filterClientes(search) {
    const filteredClientes = clientes.filter(cliente => {
        const nome = (cliente.nome_razao_social || cliente.nome || '').toLowerCase();
        const doc = (cliente.cpf_cnpj || '').toLowerCase();
        return nome.includes(search) || doc.includes(search);
    });

    const container = document.getElementById('clientes-lista');
    if (!container) return;

    if (filteredClientes.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>Nenhum cliente encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredClientes.map(cliente => `
        <div class="cliente-item" onclick='selecionarCliente(${JSON.stringify(cliente).replace(/'/g, "&#39;")})'>
            <div class="cliente-info">
                <div class="cliente-nome">${cliente.nome_razao_social || cliente.nome}</div>
                <div class="cliente-documento">${cliente.cpf_cnpj || 'Sem documento'}</div>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}

// Funções de UI
function updateUI() {
    console.log('Atualizando UI...');
    renderProducts();
    renderCart();
}

function renderProducts(filter = '') {
    console.log('Renderizando produtos... filtro:', filter);
    
    const grid = document.getElementById('products-grid');
    if (!grid) {
        console.error('Grid de produtos não encontrado!');
        return;
    }

    // Se não tiver filtro, mostrar estado vazio
    if (filter.trim() === '') {
        renderEmptyState();
        return;
    }

    // Filtrar produtos (mínimo 2 caracteres para buscar)
    if (filter.length < 2) {
        grid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-keyboard"></i>
                <p>Digite pelo menos 2 caracteres para buscar</p>
            </div>
        `;
        return;
    }

    const filterLower = filter.toLowerCase();
    const filteredProducts = produtos.filter(produto => {
        const descricao = (produto.descricao || '').toLowerCase();
        const codigo = (produto.codigo_principal || '').toLowerCase();
        const gtin = (produto.gtin || '').toLowerCase();
        
        return descricao.includes(filterLower) || 
               codigo.includes(filterLower) || 
               gtin.includes(filterLower);
    });

    console.log('Produtos filtrados:', filteredProducts.length);

    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado para "${filter}"</p>
                <p style="font-size: 14px; color: var(--text-secondary); margin-top: 8px;">
                    Tente buscar por nome ou código
                </p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredProducts.map(produto => {
        const estoque = parseFloat(produto.estoque || produto.estoque_atual || 0);
        const estoqueClass = estoque > 10 ? 'stock-ok' : estoque > 0 ? 'stock-low' : 'stock-out';
        const estoqueIcon = estoque > 10 ? 'fa-check-circle' : estoque > 0 ? 'fa-exclamation-triangle' : 'fa-times-circle';
        const estoqueColor = estoque > 10 ? '#16a34a' : estoque > 0 ? '#f59e0b' : '#dc2626';
        
        return `
        <div class="product-card">
            <div class="product-info">
                <div class="product-code">${produto.codigo_principal || produto.codigo || 'Sem código'}</div>
                <div class="product-name">${produto.descricao}</div>
                <div class="product-price">R$ ${parseFloat(produto.preco || produto.preco_venda || 0).toFixed(2)}</div>
                <div class="product-stock" style="color: ${estoqueColor};">
                    <i class="fas ${estoqueIcon}"></i>
                    Estoque: ${estoque.toFixed(2)} ${produto.unidade || 'UN'}
                </div>
            </div>
            <button class="btn btn-add-cart" onclick="addToCart(${produto.id})" ${estoque <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                <i class="fas fa-cart-plus"></i>
                ${estoque > 0 ? 'Adicionar' : 'Sem Estoque'}
            </button>
        </div>
    `;
    }).join('');
    
    console.log('Produtos renderizados com sucesso');
}

function filterProducts(search) {
    console.log('Filtrando produtos:', search);
    renderProducts(search);
}

// Funções do Carrinho
function addToCart(produtoId) {
    console.log('Adicionando produto ao carrinho:', produtoId);
    
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
        console.error('Produto não encontrado:', produtoId);
        return;
    }

    console.log('Produto encontrado:', produto);
    console.log('Preço do produto:', produto.preco || produto.preco_venda, 'Tipo:', typeof (produto.preco || produto.preco_venda));

    const itemExistente = carrinho.find(item => item.produto_id === produtoId);
    
    if (itemExistente) {
        itemExistente.quantidade++;
        
        // Recalcular com desconto (mantendo tipo)
        recalcularValorItem(itemExistente);
    } else {
        const precoUnitario = parseFloat(produto.preco || produto.preco_venda || 0);
        console.log('Preço unitário parseado:', precoUnitario);
        
        const novoItem = {
            produto_id: produto.id,
            codigo: produto.codigo_principal || produto.gtin || 'SEM CÓDIGO',
            descricao: produto.descricao,
            preco_unitario: precoUnitario,
            quantidade: 1,
            desconto: 0, // Desconto individual do item (%) - para exibição
            desconto_tipo: 'percentual', // Tipo de desconto
            desconto_valor: 0, // Valor do desconto
            valor_total: precoUnitario
        };
        
        console.log('Novo item criado:', novoItem);
        carrinho.push(novoItem);
    }

    console.log('Carrinho atualizado:', carrinho);
    renderCart();
    showToast('Produto adicionado ao carrinho', 'success');
}

function renderCart() {
    console.log('Renderizando carrinho...');
    console.log('Itens no carrinho:', carrinho);
    
    const container = document.getElementById('cart-items');
    if (!container) {
        console.error('Container do carrinho não encontrado!');
        return;
    }

    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrinho vazio</p>
            </div>
        `;
        updateCartTotals();
        return;
    }

    container.innerHTML = carrinho.map((item, index) => {
        console.log(`Item ${index}:`, item);
        console.log(`  - Preço unitário: ${item.preco_unitario} (${typeof item.preco_unitario})`);
        console.log(`  - Valor total: ${item.valor_total} (${typeof item.valor_total})`);
        
        const precoDisplay = item.preco_unitario > 0 
            ? `R$ ${item.preco_unitario.toFixed(2)}` 
            : '<span style="color: var(--warning);">⚠️ Sem preço</span>';
        
        const descontoItem = item.desconto || 0;
        const descontoClass = descontoItem > 0 ? 'has-discount' : '';
        
        return `
        <div class="cart-item ${descontoClass}">
            <div class="item-info">
                <div class="item-name">${item.descricao}</div>
                <div class="item-price-row">
                    <div class="item-price">${precoDisplay}</div>
                    ${descontoItem > 0 ? `<div class="item-discount-badge">-${descontoItem}%</div>` : ''}
                </div>
            </div>
            <div class="item-controls">
                <button class="qty-btn" onclick="updateQuantity(${index}, -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" class="qty-input" value="${item.quantidade}" 
                       min="1" onchange="updateQuantity(${index}, null, this.value)">
                <button class="qty-btn" onclick="updateQuantity(${index}, 1)">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-icon-small" onclick="openDescontoItem(${index})" title="Aplicar Desconto">
                    <i class="fas fa-percentage"></i>
                </button>
                <button class="remove-btn" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="item-total">
                R$ ${item.valor_total.toFixed(2)}
            </div>
        </div>
    `;
    }).join('');

    updateCartTotals();
}

function updateQuantity(index, change, newValue = null) {
    console.log('Atualizando quantidade:', index, change, newValue);
    
    const item = carrinho[index];
    if (!item) return;

    if (newValue !== null) {
        item.quantidade = parseInt(newValue) || 1;
    } else {
        item.quantidade = Math.max(1, item.quantidade + change);
    }

    // Recalcular com desconto do item
    recalcularValorItem(item);
    
    renderCart();
}

// Função auxiliar para recalcular valor do item com desconto
function recalcularValorItem(item) {
    const valorSemDesconto = item.quantidade * item.preco_unitario;
    
    let descontoValor = 0;
    if (item.desconto_tipo === 'percentual') {
        descontoValor = (valorSemDesconto * (item.desconto_valor || 0)) / 100;
    } else if (item.desconto_tipo === 'valor') {
        descontoValor = item.desconto_valor || 0;
    }
    
    item.valor_total = Math.max(0, valorSemDesconto - descontoValor);
}

function removeFromCart(index) {
    console.log('Removendo item do carrinho:', index);
    
    carrinho.splice(index, 1);
    renderCart();
    showToast('Item removido do carrinho', 'info');
}

function updateCartTotals() {
    const subtotal = carrinho.reduce((total, item) => total + item.valor_total, 0);
    
    // Calcular desconto
    let valorDesconto = 0;
    if (desconto.valor > 0) {
        if (desconto.tipo === 'percentual') {
            valorDesconto = (subtotal * desconto.valor) / 100;
        } else {
            valorDesconto = desconto.valor;
        }
    }
    
    const total = Math.max(0, subtotal - valorDesconto);

    const subtotalEl = document.getElementById('cart-subtotal');
    const descontoEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');
    const countEl = document.getElementById('cart-count');

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    if (descontoEl) {
        descontoEl.textContent = `R$ ${valorDesconto.toFixed(2)}`;
        // Adicionar badge se tiver desconto
        if (valorDesconto > 0) {
            descontoEl.style.color = 'var(--warning)';
            descontoEl.style.fontWeight = '600';
        } else {
            descontoEl.style.color = '';
            descontoEl.style.fontWeight = '';
        }
    }
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
    if (countEl) countEl.textContent = `${carrinho.length} itens`;
}

// Funções do Modal
function openModal(id) {
    console.log('Abrindo modal:', id);
    
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        
        // Se for modal de cliente, carregar clientes
        if (id === 'modal-cliente') {
            loadClientesModal();
        }
        
        // Se for modal de finalização, atualizar vendedores
        if (id === 'modal-finalizar') {
            console.log('📋 Modal de finalização aberto, atualizando vendedores...');
            const select = document.getElementById('vendedor');
            
            if (!select) {
                console.error('❌ Select de vendedor não encontrado!');
                return;
            }
            
            if (vendedores.length === 0) {
                console.error('❌ Nenhum vendedor cadastrado!');
                select.innerHTML = '<option value="">⚠️ Nenhum vendedor cadastrado</option>';
                showToast('ATENÇÃO: Nenhum vendedor ativo cadastrado no sistema!', 'error');
                
                // Mostrar alerta
                setTimeout(() => {
                    alert('⚠️ ATENÇÃO!\n\nNenhum vendedor ativo encontrado no sistema.\n\nPara finalizar vendas, você precisa:\n1. Cadastrar vendedores no sistema\n2. Garantir que estejam com status ATIVO\n\nVá em Menu > Vendedores para cadastrar.');
                }, 500);
            } else {
                select.innerHTML = '<option value="">Selecione um vendedor</option>' + 
                    vendedores.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
                console.log('✅ Select de vendedores atualizado no modal:', vendedores.length, 'opções');
            }
        }
        
        // Se for modal de desconto, atualizar preview
        if (id === 'modal-desconto') {
            // Se não tem item selecionado, é desconto total
            if (itemDescontoIndex === null) {
                // Restaurar título
                const modalTitle = document.querySelector('#modal-desconto .modal-title');
                if (modalTitle) modalTitle.textContent = 'Aplicar Desconto';
                
                // Habilitar todos os tipos
                document.querySelectorAll('input[name="tipo-desconto"]').forEach(radio => {
                    radio.disabled = false;
                    radio.checked = radio.value === desconto.tipo;
                });
                
                document.getElementById('valor-desconto').value = desconto.valor || '';
                updateDescontoPreview();
            }
            // Se tem item, updateDescontoItemPreview já foi chamado em openDescontoItem
            
            document.getElementById('desconto-erro').style.display = 'none';
        }
    } else {
        console.error('Modal não encontrado:', id);
    }
}

function closeModal(id) {
    console.log('Fechando modal:', id);
    
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        
        // Se estiver fechando modal de desconto, resetar itemDescontoIndex
        if (id === 'modal-desconto') {
            itemDescontoIndex = null;
            // Restaurar título
            const modalTitle = document.querySelector('#modal-desconto .modal-title');
            if (modalTitle) modalTitle.textContent = 'Aplicar Desconto';
        }
    }
}

function loadClientesModal() {
    console.log('Carregando clientes no modal...');
    
    const container = document.getElementById('clientes-lista');
    if (!container) {
        console.error('Container de clientes não encontrado!');
        return;
    }
    
    if (clientes.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>Nenhum cliente cadastrado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = clientes.map(cliente => `
        <div class="cliente-item" onclick='selecionarCliente(${JSON.stringify(cliente).replace(/'/g, "&#39;")})'>
            <div class="cliente-info">
                <div class="cliente-nome">${cliente.nome_razao_social || cliente.nome}</div>
                <div class="cliente-documento">${cliente.cpf_cnpj || 'Sem documento'}</div>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}

function selecionarCliente(clienteData) {
    console.log('Cliente selecionado:', clienteData);
    
    cliente = clienteData;
    closeModal('modal-cliente');
    
    // Atualizar botão com nome do cliente
    const clienteBtn = document.getElementById('cliente-nome');
    if (clienteBtn) {
        clienteBtn.textContent = clienteData.nome_razao_social || clienteData.nome;
    }
    
    showToast(`Cliente: ${clienteData.nome_razao_social || clienteData.nome}`, 'success');
}

// Finalização de Venda
function finalizarVenda() {
    console.log('Iniciando finalização de venda...');
    
    if (carrinho.length === 0) {
        showToast('Adicione produtos ao carrinho', 'warning');
        return;
    }

    openModal('modal-finalizar');
}

async function confirmarVenda() {
    console.log('Confirmando venda...');
    
    const formaPagamento = document.getElementById('forma-pagamento')?.value;
    const vendedorId = document.getElementById('vendedor')?.value;
    const observacoes = document.getElementById('observacoes')?.value;
    
    if (!vendedorId) {
        showToast('Selecione um vendedor', 'warning');
        return;
    }

    // Calcular valores
    const valorTotal = carrinho.reduce((total, item) => total + item.valor_total, 0);
    
    let valorDesconto = 0;
    if (desconto.valor > 0) {
        if (desconto.tipo === 'percentual') {
            valorDesconto = (valorTotal * desconto.valor) / 100;
        } else {
            valorDesconto = desconto.valor;
        }
    }
    
    const valorFinal = Math.max(0, valorTotal - valorDesconto);

    const venda = {
        cliente_id: cliente?.id || null,
        vendedor_id: parseInt(vendedorId),
        itens: carrinho.map(item => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto: item.desconto || 0, // Desconto individual do item (%)
            valor_total: item.valor_total
        })),
        forma_pagamento: formaPagamento,
        observacoes: observacoes,
        valor_total: valorTotal,
        desconto: valorDesconto,
        valor_final: valorFinal,
        status: 'FINALIZADO'
    };

    console.log('Enviando venda:', venda);

    try {
        // Se for PIX, primeiro gerar QR e aguardar confirmação antes de criar a venda
        if ((formaPagamento || '').toUpperCase() === 'PIX') {
            await processarPagamentoPIX(venda);
            return; // fluxo PIX cuida do restante
        }

        await criarVendaEEmitirDocumento(venda, observacoes);
    } catch (error) {
        console.error('Erro ao finalizar venda:', error);
        showToast('Erro ao finalizar venda: ' + error.message, 'error');
    }
}

// Utilidades
function showToast(message, type = 'info') {
    console.log('Toast:', message, type);
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// ==================== OPERAÇÕES DE DEVOLUÇÃO/TROCA/CANCELAMENTO ====================

// Iniciar Devolução
function iniciarDevolucao() {
    const numeroVenda = prompt('Digite o número da venda para devolução:');
    if (!numeroVenda) return;
    
    buscarVendaParaOperacao(numeroVenda, 'DEVOLUCAO');
}

// Iniciar Troca
function iniciarTroca() {
    const numeroVenda = prompt('Digite o número da venda para troca:');
    if (!numeroVenda) return;
    
    buscarVendaParaOperacao(numeroVenda, 'TROCA');
}

// Iniciar Cancelamento
function iniciarCancelamento() {
    const numeroVenda = prompt('Digite o número da venda para cancelar:');
    if (!numeroVenda) return;
    
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;
    
    cancelarVenda(numeroVenda, motivo);
}

// Buscar venda para operação
async function buscarVendaParaOperacao(numero, operacao) {
    try {
        showToast('Buscando venda...', 'info');
        
        // Buscar venda por número
        const response = await fetch(`/api/vendas`, { headers });
        
        if (!response.ok) {
            throw new Error('Erro ao buscar vendas');
        }
        
        const vendas = await response.json();
        const venda = vendas.data?.find(v => v.numero === numero) || vendas.find(v => v.numero === numero);
        
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        if (venda.status === 'CANCELADO') {
            throw new Error('Esta venda já está cancelada');
        }
        
        showToast('Venda encontrada!', 'success');
        
        if (operacao === 'DEVOLUCAO') {
            mostrarProdutosParaDevolucao(venda);
        } else if (operacao === 'TROCA') {
            mostrarProdutosParaTroca(venda);
        }
        
    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        showToast('Erro: ' + error.message, 'error');
    }
}

// Mostrar produtos para devolução
function mostrarProdutosParaDevolucao(venda) {
    // Limpar carrinho
    carrinho = [];
    
    // Criar modal para seleção de itens
    const html = `
        <div class="modal active" id="modal-devolucao">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Devolução - Venda ${venda.numero}</h3>
                    <button class="btn" onclick="closeModal('modal-devolucao')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="form-grid">
                    <p><strong>Cliente:</strong> ${venda.cliente?.nome_razao_social || 'Venda Avulsa'}</p>
                    <p><strong>Valor Total:</strong> R$ ${parseFloat(venda.valor_total).toFixed(2)}</p>
                    
                    <h4>Selecione os itens para devolução:</h4>
                    
                    <div id="itens-devolucao">
                        ${venda.itens.map((item, index) => `
                            <div class="item-devolucao" style="background: var(--background); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <strong>${item.produto?.descricao || 'Produto'}</strong>
                                    <span>R$ ${parseFloat(item.preco_unitario).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; gap: 12px; align-items: center;">
                                    <label style="flex: 1;">
                                        <span style="font-size: 12px; color: var(--text-secondary);">Quantidade (máx: ${item.quantidade})</span>
                                        <input type="number" 
                                               id="qtd-dev-${index}" 
                                               class="qty-input" 
                                               min="0" 
                                               max="${item.quantidade}" 
                                               value="0"
                                               style="width: 100%; padding: 8px;">
                                    </label>
                                    <label style="flex: 2;">
                                        <span style="font-size: 12px; color: var(--text-secondary);">Motivo</span>
                                        <input type="text" 
                                               id="motivo-dev-${index}" 
                                               placeholder="Ex: Produto com defeito"
                                               style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--background); color: var(--text);">
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn btn-success btn-full" onclick="processarDevolucao(${JSON.stringify(venda).replace(/"/g, '&quot;')})">
                        <i class="fas fa-check"></i>
                        Confirmar Devolução
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// Processar devolução
async function processarDevolucao(venda) {
    const itens = [];
    
    venda.itens.forEach((item, index) => {
        const qtd = parseInt(document.getElementById(`qtd-dev-${index}`)?.value || 0);
        const motivo = document.getElementById(`motivo-dev-${index}`)?.value || '';
        
        if (qtd > 0) {
            itens.push({
                produto_id: item.produto_id,
                quantidade: qtd,
                valor_unitario: item.preco_unitario,
                motivo: motivo
            });
        }
    });
    
    if (itens.length === 0) {
        showToast('Selecione ao menos um item para devolver', 'warning');
        return;
    }
    
    const valorTotal = itens.reduce((total, item) => 
        total + (item.quantidade * item.valor_unitario), 0);
    
    const dados = {
        venda_id: venda.id,
        tipo_operacao: 'DEVOLUCAO',
        forma_ressarcimento: 'CREDITO',
        valor_total: valorTotal,
        itens: itens,
        motivo: 'Devolução via PDV'
    };
    
    try {
        showToast('Processando devolução...', 'info');
        
        const response = await fetch('/api/devolucoes', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao processar devolução');
        }
        
        showToast('Devolução processada com sucesso!', 'success');
        closeModal('modal-devolucao');
        document.getElementById('modal-devolucao')?.remove();
        
        alert(`Devolução concluída!\nValor: R$ ${valorTotal.toFixed(2)}\nCrédito gerado para o cliente.`);
        
    } catch (error) {
        console.error('Erro ao processar devolução:', error);
        showToast('Erro: ' + error.message, 'error');
    }
}

// Cancelar venda
async function cancelarVenda(numero, motivo) {
    try {
        showToast('Cancelando venda...', 'info');
        
        // Buscar venda por número para pegar o ID
        const responseVendas = await fetch(`/api/vendas`, { headers });
        if (!responseVendas.ok) {
            throw new Error('Erro ao buscar vendas');
        }
        
        const vendas = await responseVendas.json();
        const venda = vendas.data?.find(v => v.numero === numero) || vendas.find(v => v.numero === numero);
        
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        const response = await fetch(`/api/vendas/${venda.id}/cancelar`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ motivo })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao cancelar venda');
        }
        
        showToast('Venda cancelada com sucesso!', 'success');
        alert(`Venda ${numero} cancelada com sucesso!\nMotivo: ${motivo}`);
        
    } catch (error) {
        console.error('Erro ao cancelar venda:', error);
        showToast('Erro: ' + error.message, 'error');
    }
}

// ==================== SISTEMA DE DESCONTO ====================

// Carregar permissões do usuário
async function loadUserPermissions() {
    try {
        // Por enquanto, usar limite padrão
        // TODO: Implementar endpoint /api/auth/me e buscar do perfil
        limiteDesconto = 10;
        
        // Atualizar interface
        const limiteElement = document.getElementById('limite-desconto');
        if (limiteElement) {
            limiteElement.textContent = `${limiteDesconto}%`;
        }
        
        console.log('✅ Limite de desconto configurado:', limiteDesconto + '%');
    } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        limiteDesconto = 10; // Fallback para 10%
    }
}

// Alternar tipo de desconto
function toggleDescontoType() {
    const tipo = document.querySelector('input[name="tipo-desconto"]:checked').value;
    const label = document.getElementById('label-desconto');
    const input = document.getElementById('valor-desconto');
    
    if (tipo === 'percentual') {
        label.textContent = 'Desconto (%)';
        input.placeholder = '0.00';
        input.max = limiteDesconto;
    } else {
        label.textContent = 'Desconto (R$)';
        input.placeholder = '0.00';
        input.max = '';
    }
    
    input.value = '';
    updateDescontoPreview();
}

// Atualizar preview do desconto
function updateDescontoPreview() {
    const tipo = document.querySelector('input[name="tipo-desconto"]:checked').value;
    const valorInput = parseFloat(document.getElementById('valor-desconto').value) || 0;
    
    const subtotal = carrinho.reduce((sum, item) => sum + item.valor_total, 0);
    
    let valorDesconto = 0;
    if (tipo === 'percentual') {
        valorDesconto = (subtotal * valorInput) / 100;
    } else {
        valorDesconto = valorInput;
    }
    
    const total = Math.max(0, subtotal - valorDesconto);
    
    document.getElementById('preview-subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('preview-desconto').textContent = `- R$ ${valorDesconto.toFixed(2)}`;
    document.getElementById('preview-total').textContent = `R$ ${total.toFixed(2)}`;
}

// Event listener para atualizar preview em tempo real
document.addEventListener('DOMContentLoaded', () => {
    const valorDescontoInput = document.getElementById('valor-desconto');
    if (valorDescontoInput) {
        valorDescontoInput.addEventListener('input', () => {
            // Se tem item selecionado, atualiza preview do item
            if (itemDescontoIndex !== null) {
                updateDescontoItemPreview();
            } else {
                // Senão, atualiza preview do total
                updateDescontoPreview();
            }
        });
    }
});

// Aplicar desconto
function aplicarDesconto() {
    // Se tem um item selecionado, aplicar desconto no item
    if (itemDescontoIndex !== null) {
        aplicarDescontoItem();
        return;
    }
    
    // Caso contrário, aplicar desconto no total
    const tipo = document.querySelector('input[name="tipo-desconto"]:checked').value;
    const valorInput = parseFloat(document.getElementById('valor-desconto').value) || 0;
    const erroDiv = document.getElementById('desconto-erro');
    const erroTexto = document.getElementById('desconto-erro-texto');
    
    // Resetar erro
    erroDiv.style.display = 'none';
    
    // Validar valor
    if (valorInput <= 0) {
        erroTexto.textContent = 'Informe um valor de desconto válido!';
        erroDiv.style.display = 'flex';
        return;
    }
    
    const subtotal = carrinho.reduce((sum, item) => sum + item.valor_total, 0);
    
    // Validar limite de desconto
    if (tipo === 'percentual') {
        if (valorInput > limiteDesconto) {
            erroTexto.textContent = `Desconto de ${valorInput}% está acima do limite permitido de ${limiteDesconto}%!`;
            erroDiv.style.display = 'flex';
            return;
        }
    } else {
        // Para desconto em valor, calcular o percentual equivalente
        const percentualEquivalente = (valorInput / subtotal) * 100;
        if (percentualEquivalente > limiteDesconto) {
            erroTexto.textContent = `Este desconto equivale a ${percentualEquivalente.toFixed(2)}%, que está acima do limite de ${limiteDesconto}%!`;
            erroDiv.style.display = 'flex';
            return;
        }
        
        if (valorInput > subtotal) {
            erroTexto.textContent = 'Desconto não pode ser maior que o subtotal!';
            erroDiv.style.display = 'flex';
            return;
        }
    }
    
    // Aplicar desconto
    desconto.tipo = tipo;
    desconto.valor = valorInput;
    
    // Atualizar carrinho
    updateCartTotals();
    
    // Fechar modal
    closeModal('modal-desconto');
    
    showToast(`Desconto de ${tipo === 'percentual' ? valorInput + '%' : 'R$ ' + valorInput.toFixed(2)} aplicado!`, 'success');
}

// Limpar desconto
function limparDesconto() {
    desconto.tipo = 'percentual';
    desconto.valor = 0;
    updateCartTotals();
    showToast('Desconto removido', 'info');
}

// ==================== DESCONTO POR ITEM ====================

let itemDescontoIndex = null;

// Abrir modal de desconto para item específico
function openDescontoItem(index) {
    console.log('🔹 Abrindo desconto para item:', index);
    itemDescontoIndex = index;
    const item = carrinho[index];
    
    if (!item) {
        console.error('❌ Item não encontrado:', index);
        return;
    }
    
    console.log('📦 Item:', item);
    
    // Atualizar título do modal
    const modalTitle = document.querySelector('#modal-desconto .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Desconto - ${item.descricao}`;
    }
    
    // Preencher valores atuais
    const valorInput = document.getElementById('valor-desconto');
    if (valorInput) {
        valorInput.value = item.desconto_valor || item.desconto || '';
        valorInput.disabled = false; // Garantir que não está desabilitado
        console.log('✅ Input de valor configurado:', valorInput.value);
    } else {
        console.error('❌ Input valor-desconto não encontrado!');
    }
    
    // Permitir ambos os tipos de desconto para itens
    document.querySelectorAll('input[name="tipo-desconto"]').forEach(radio => {
        radio.disabled = false; // Habilitar ambos os tipos
        // Selecionar o tipo atual do item
        if (item.desconto_tipo) {
            radio.checked = radio.value === item.desconto_tipo;
        } else {
            // Padrão: percentual
            radio.checked = radio.value === 'percentual';
        }
    });
    
    console.log('📊 Atualizando preview...');
    // Atualizar preview
    updateDescontoItemPreview();
    
    // Abrir modal
    console.log('🔓 Abrindo modal...');
    openModal('modal-desconto');
}

// Atualizar preview do desconto do item
function updateDescontoItemPreview() {
    if (itemDescontoIndex === null) return;
    
    const item = carrinho[itemDescontoIndex];
    if (!item) return;
    
    const tipo = document.querySelector('input[name="tipo-desconto"]:checked')?.value || 'percentual';
    const valorInput = parseFloat(document.getElementById('valor-desconto').value) || 0;
    
    const valorSemDesconto = item.quantidade * item.preco_unitario;
    
    let descontoValor = 0;
    if (tipo === 'percentual') {
        descontoValor = (valorSemDesconto * valorInput) / 100;
    } else {
        descontoValor = valorInput;
    }
    
    const total = Math.max(0, valorSemDesconto - descontoValor);
    
    document.getElementById('preview-subtotal').textContent = `R$ ${valorSemDesconto.toFixed(2)}`;
    document.getElementById('preview-desconto').textContent = `- R$ ${descontoValor.toFixed(2)}`;
    document.getElementById('preview-total').textContent = `R$ ${total.toFixed(2)}`;
}

// Aplicar desconto no item
function aplicarDescontoItem() {
    if (itemDescontoIndex === null) return;
    
    const item = carrinho[itemDescontoIndex];
    if (!item) return;
    
    const tipo = document.querySelector('input[name="tipo-desconto"]:checked')?.value || 'percentual';
    const valorInput = parseFloat(document.getElementById('valor-desconto').value) || 0;
    const erroDiv = document.getElementById('desconto-erro');
    const erroTexto = document.getElementById('desconto-erro-texto');
    
    // Resetar erro
    erroDiv.style.display = 'none';
    
    if (valorInput < 0) {
        erroTexto.textContent = 'Desconto não pode ser negativo!';
        erroDiv.style.display = 'flex';
        return;
    }
    
    const valorSemDesconto = item.quantidade * item.preco_unitario;
    
    // Validar limite de desconto
    if (tipo === 'percentual') {
        if (valorInput > limiteDesconto) {
            erroTexto.textContent = `Desconto de ${valorInput}% está acima do limite permitido de ${limiteDesconto}%!`;
            erroDiv.style.display = 'flex';
            return;
        }
    } else {
        // Para desconto em R$, validar se não ultrapassa o valor do item
        if (valorInput > valorSemDesconto) {
            erroTexto.textContent = 'Desconto não pode ser maior que o valor do item!';
            erroDiv.style.display = 'flex';
            return;
        }
        
        // Calcular percentual equivalente e validar limite
        const percentualEquivalente = (valorInput / valorSemDesconto) * 100;
        if (percentualEquivalente > limiteDesconto) {
            erroTexto.textContent = `Este desconto equivale a ${percentualEquivalente.toFixed(2)}%, que está acima do limite de ${limiteDesconto}%!`;
            erroDiv.style.display = 'flex';
            return;
        }
    }
    
    // Salvar tipo e valor do desconto
    item.desconto_tipo = tipo;
    item.desconto_valor = valorInput;
    
    // Para exibição no badge, sempre converter para %
    if (tipo === 'percentual') {
        item.desconto = valorInput; // Já é %
    } else {
        item.desconto = (valorInput / valorSemDesconto) * 100; // Converter R$ para %
    }
    
    // Recalcular valor total do item
    let descontoValor = 0;
    if (tipo === 'percentual') {
        descontoValor = (valorSemDesconto * valorInput) / 100;
    } else {
        descontoValor = valorInput;
    }
    item.valor_total = valorSemDesconto - descontoValor;
    
    // Atualizar carrinho
    renderCart();
    
    // Fechar modal
    closeModal('modal-desconto');
    itemDescontoIndex = null;
    
    // Restaurar título do modal
    const modalTitle = document.querySelector('#modal-desconto .modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Aplicar Desconto';
    }
    
    const descontoTexto = tipo === 'percentual' ? `${valorInput}%` : `R$ ${valorInput.toFixed(2)}`;
    showToast(`Desconto de ${descontoTexto} aplicado no item!`, 'success');
}

// Mostrar produtos para troca
function mostrarProdutosParaTroca(venda) {
    showToast('Funcionalidade de troca em desenvolvimento', 'info');
    // TODO: Implementar lógica de troca completa
}

// ============================================================================
// FUNÇÕES DE NFC-e
// ============================================================================

// Gerar NFC-e para uma venda
async function gerarNFCe(vendaId, observacoes = '') {
  try {
    console.log('🧾 [gerarNFCe] Iniciando geração...');
    console.log('🧾 [gerarNFCe] Venda ID:', vendaId);
    console.log('🧾 [gerarNFCe] Observações:', observacoes);
    console.log('🧾 [gerarNFCe] Headers:', headers);
    
    const requestBody = {
      venda_id: vendaId,
      observacoes: observacoes
    };
    console.log('🧾 [gerarNFCe] Request body:', requestBody);
    
    console.log('🧾 [gerarNFCe] Enviando requisição para /api/nfce/gerar...');
    const response = await fetch('/api/nfce/gerar', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    console.log('🧾 [gerarNFCe] Response status:', response.status);
    console.log('🧾 [gerarNFCe] Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [gerarNFCe] Erro da API:', errorText);
      
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }
      
      throw new Error(errorMessage || 'Erro ao gerar NFC-e');
    }

    const result = await response.json();
    console.log('✅ [gerarNFCe] Resposta da API:', result);
    console.log('✅ [gerarNFCe] NFC-e gerada:', result.nfce);
    showToast('NFC-e gerada com sucesso!', 'success');
    
    // Oferecer opção de imprimir
    if (confirm('NFC-e gerada com sucesso! Deseja imprimir o cupom fiscal?')) {
      await imprimirCupomNFCe(result.nfce.id);
    }
    
    return result.nfce;
    
  } catch (error) {
    console.error('❌ [gerarNFCe] Erro completo:', error);
    console.error('❌ [gerarNFCe] Stack:', error.stack);
    throw error;
  }
}

// Autorizar NFC-e (SEFAZ) - stub
async function autorizarNFCe(vendaId, observacoes = '') {
    try {
        console.log('🧾 [autorizarNFCe] Iniciando autorização fiscal...', vendaId);
        const response = await fetch('/api/nfce/autorizar', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ venda_id: vendaId, observacoes })
        });

        if (!response.ok) {
            const text = await response.text();
            let msg = text;
            try {
                const json = JSON.parse(text);
                msg = json.error || text;
            } catch {}
            throw new Error(msg);
        }

        const result = await response.json();
        showToast('Venda fiscal autorizada!', 'success');
        return result;
    } catch (error) {
        showToast('Autorização fiscal indisponível: ' + error.message, 'warning');
        throw error;
    }
}

// Modal para escolher tipo de emissão (fiscal vs não fiscal)
function escolherTipoEmissao() {
    return new Promise((resolve) => {
        // Preferência salva? usa direto
        const pref = localStorage.getItem('preferencia_emissao') || 'nao_fiscal';
        if (pref === 'nao_fiscal' || pref === 'fiscal') {
            console.log('🧾 Preferência de emissão encontrada:', pref);
            return resolve(pref);
        }

        // Cria modal simples (sem preferência salva ainda)
        const id = 'modal-tipo-emissao';
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const html = `
                    <div class="modal active" id="${id}">
                <div class="modal-content" style="max-width: 520px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Tipo de Emissão</h3>
                        <button class="btn" onclick="document.getElementById('${id}').remove();">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="form-grid" style="gap:16px;">
                        <p>Escolha como deseja emitir o documento:</p>
                        <div style="display:flex; gap:12px; flex-wrap:wrap;">
                                    <button id="btn-emissao-fiscal" class="btn btn-success" style="flex:1; min-width:220px;">
                                <i class="fas fa-file-invoice"></i> Venda Fiscal (SEFAZ)
                            </button>
                                    <button id="btn-emissao-nao-fiscal" class="btn" style="flex:1; min-width:220px; background:#64748b; color:#fff;">
                                <i class="fas fa-receipt"></i> Venda Não Fiscal
                            </button>
                        </div>
                                <label style="display:flex; align-items:center; gap:8px;">
                                    <input id="lembrar-emissao" type="checkbox" checked />
                                    <span>Lembrar minha escolha como padrão (recomendado)</span>
                                </label>
                                <small style="color:var(--text-secondary)">Padrão recomendado: Não Fiscal. A opção Fiscal exige certificado A1 e CSC configurados.</small>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        const modal = document.getElementById(id);

        modal.querySelector('#btn-emissao-fiscal').addEventListener('click', () => {
                    const lembrar = modal.querySelector('#lembrar-emissao')?.checked;
                    if (lembrar) localStorage.setItem('preferencia_emissao', 'fiscal');
                    modal.remove();
            resolve('fiscal');
        });
        modal.querySelector('#btn-emissao-nao-fiscal').addEventListener('click', () => {
                    const lembrar = modal.querySelector('#lembrar-emissao')?.checked;
                    if (lembrar) localStorage.setItem('preferencia_emissao', 'nao_fiscal');
                    modal.remove();
            resolve('nao_fiscal');
        });
    });
}
// Imprimir cupom fiscal da NFC-e
async function imprimirCupomNFCe(nfceId) {
    console.log('🖨️ Imprimindo cupom NFC-e ID:', nfceId);

    // Abrir a janela imediatamente para não perder o gesto do usuário (evita bloqueio de pop-up)
    const janelaCupom = window.open('', '_blank', 'width=420,height=680,scrollbars=yes');
    if (!janelaCupom) {
        alert('Permita pop-ups para visualizar o cupom fiscal.');
        throw new Error('Popup bloqueado pelo navegador');
    }

    // Esqueleto de carregamento
    try {
        janelaCupom.document.write(`
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Carregando cupom...</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
                        .loading { text-align:center; margin-top: 40px; color:#444; }
                    </style>
                </head>
                <body>
                    <div class="loading">Gerando cupom fiscal...</div>
                </body>
            </html>
        `);
        janelaCupom.document.close();
    } catch (e) {
        console.warn('Não foi possível escrever o placeholder de carregamento na janela do cupom:', e);
    }

    try {
        const response = await fetch(`/api/nfce/${nfceId}/cupom`, { headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Erro ao gerar cupom');
        }

        const result = await response.json();

        // Escrever o HTML final do cupom
        janelaCupom.document.open();
        janelaCupom.document.write(result.cupom_html);
        janelaCupom.document.close();
        janelaCupom.focus();

        console.log('✅ Cupom aberto para impressão');
        return result;
    } catch (error) {
        console.error('❌ Erro ao imprimir cupom:', error);
        try {
            janelaCupom.document.open();
            janelaCupom.document.write(`<pre style="padding:16px; font-family: monospace; white-space: pre-wrap;">Erro ao gerar cupom: ${error.message}</pre>`);
            janelaCupom.document.close();
        } catch {}
        showToast('Erro ao imprimir cupom: ' + error.message, 'error');
        throw error;
    }
}

// Visualizar cupom de uma NFC-e existente
async function visualizarCupomNFCe(nfceId) {
  try {
    await imprimirCupomNFCe(nfceId);
  } catch (error) {
    showToast('Erro ao visualizar cupom: ' + error.message, 'error');
  }
}

// Cancelar uma NFC-e
async function cancelarNFCe(nfceId, motivo) {
  try {
    const response = await fetch(`/api/nfce/${nfceId}/cancelar`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ motivo })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cancelar NFC-e');
    }

    showToast('NFC-e cancelada com sucesso!', 'success');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao cancelar NFC-e:', error);
    showToast('Erro ao cancelar NFC-e: ' + error.message, 'error');
    throw error;
  }
}

// Buscar NFC-e de uma venda
async function buscarNFCeVenda(vendaId) {
  try {
    const response = await fetch(`/api/nfce?venda_id=${vendaId}`, {
      headers: headers
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
    console.error('❌ Erro ao buscar NFC-e:', error);
    return null;
  }
}

console.log('✅ Todas as funções carregadas, incluindo NFC-e!');

// ==============================================================
// Fluxo PIX: criar cobrança, aguardar confirmação e concluir venda
// ==============================================================

async function processarPagamentoPIX(vendaPayload) {
    try {
        // Abre modal PIX
        openModal('modal-pix');
        const statusEl = document.getElementById('pix-status');
        const qrEl = document.getElementById('pix-qrcode');
        const copiaEl = document.getElementById('pix-copiacola');
        const btnCancelar = document.getElementById('btn-pix-cancelar');
        const btnConfirmar = document.getElementById('btn-pix-confirmar');
        const progress = document.getElementById('pix-progress');
        const progressBar = document.getElementById('pix-progress-bar');
        const progressRemaining = document.getElementById('pix-progress-remaining');

        statusEl.textContent = 'Gerando cobrança PIX...';
        qrEl.src = '';
        copiaEl.value = '';
        if (progress) progress.style.display = 'none';
        if (progressRemaining) progressRemaining.style.display = 'none';

        // Cria a cobrança PIX
        const resp = await fetch('/api/pagamentos/pix/cobranca', {
            method: 'POST',
            headers,
            body: JSON.stringify({ valor: vendaPayload.valor_final, descricao: 'Pagamento de venda no PDV' })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Falha ao criar cobrança PIX');
        }
        const cobranca = await resp.json();
        // Preenche modal
        qrEl.src = cobranca.qr_code_base64;
        copiaEl.value = cobranca.copia_cola;
        statusEl.textContent = 'Aguardando pagamento...';
        if (progress) progress.style.display = '';
        if (progressRemaining) progressRemaining.style.display = '';

    let cancelado = false;
    let confirmado = false;
        // Função para atualizar barra/tempo restante
    const inicio = Date.now();
    const timeoutMs = PIX_TIMEOUT_MS; // 10 min padrão
        const fmt = (ms) => {
            const total = Math.max(0, Math.ceil(ms / 1000));
            const m = Math.floor(total / 60).toString().padStart(2, '0');
            const s = (total % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };
        const updateProgress = () => {
            const elapsed = Date.now() - inicio;
            const pct = Math.min(100, (elapsed / timeoutMs) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            const remaining = timeoutMs - elapsed;
            if (progressRemaining) progressRemaining.textContent = `${fmt(remaining)} restantes`;
        };
    try { clearInterval(window.__pixProgressTimer); } catch {}
    window.__pixProgressTimer = setInterval(updateProgress, PIX_PROGRESS_TICK_MS);
        updateProgress();

        window.__pixCancelar = async () => {
            try {
                cancelado = true;
                await fetch(`/api/pagamentos/pix/${cobranca.id}/cancelar`, { method: 'POST', headers });
            } catch {}
            try { clearInterval(window.__pixProgressTimer); } catch {}
            closeModal('modal-pix');
            showToast('Cobrança PIX cancelada.', 'info');
        };

        // Botão de confirmar manualmente (para testes), usa endpoint de simulação
        window.__pixConfirmarManual = async () => {
            try {
                await fetch(`/api/pagamentos/pix/${cobranca.id}/simular-pago`, { method: 'POST', headers });
                showToast('Pagamento confirmado (manual)', 'success');
            } catch (e) { console.warn(e); }
        };
        btnConfirmar.style.display = '';

        // Polling de status
        while (!cancelado && Date.now() - inicio < timeoutMs) {
            await new Promise(r => setTimeout(r, PIX_POLL_INTERVAL_MS));
            const s = await fetch(`/api/pagamentos/pix/${cobranca.id}/status`, { headers });
            if (!s.ok) continue;
            const dados = await s.json();
            if (dados.status === 'CONFIRMADO') {
                statusEl.textContent = 'Pagamento confirmado! Finalizando venda...';
                confirmado = true;
                break;
            }
            if (dados.status === 'CANCELADO') {
                statusEl.textContent = 'Cobrança cancelada.';
                showToast('Cobrança PIX cancelada.', 'info');
                try { clearInterval(window.__pixProgressTimer); } catch {}
                return;
            }
            if (dados.status === 'EXPIRADO') {
                statusEl.textContent = 'Cobrança expirada.';
                showToast('Cobrança PIX expirada.', 'warning');
                try { clearInterval(window.__pixProgressTimer); } catch {}
                return;
            }
        }

        if (cancelado) return;
        if (!confirmado) {
            statusEl.textContent = 'Tempo esgotado aguardando pagamento.';
            showToast('Tempo esgotado aguardando pagamento PIX.', 'warning');
            try { clearInterval(window.__pixProgressTimer); } catch {}
            return;
        }

        // Concluir a venda após confirmação PIX
        await criarVendaEEmitirDocumento(vendaPayload, vendaPayload.observacoes || '');
    closeModal('modal-pix');
    } catch (error) {
        console.error('❌ Erro no fluxo PIX:', error);
        closeModal('modal-pix');
        showToast('Erro no PIX: ' + error.message, 'error');
    } finally {
        // Limpa handlers globais
        delete window.__pixCancelar;
        delete window.__pixConfirmarManual;
        try { clearInterval(window.__pixProgressTimer); } catch {}
    }
}

// Cria a venda no backend e realiza a emissão (fiscal ou não fiscal)
async function criarVendaEEmitirDocumento(venda, observacoes) {
    const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(venda)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao salvar venda');
    }

    const result = await response.json();
    console.log('🎯 Venda salva:', result);

    // Escolher se é venda fiscal (SEFAZ) ou não fiscal (cupom local)
    const tipo = await escolherTipoEmissao();
    console.log('🧾 Tipo de emissão escolhido:', tipo);

    if (tipo === 'fiscal') {
        try {
            const resp = await autorizarNFCe(result.id, observacoes || '');
            console.log('🧾 Autorização SEFAZ (stub):', resp);
        } catch (err) {
            console.error('❌ Falha ao autorizar NFC-e:', err);
            const fallback = confirm('Não foi possível autorizar na SEFAZ agora. Deseja gerar um cupom NÃO FISCAL?');
            if (fallback) {
                await gerarNFCe(result.id, observacoes || '');
            }
        }
    } else {
        try {
            await gerarNFCe(result.id, observacoes || '');
        } catch (err) {
            console.error('❌ Erro ao gerar cupom não fiscal:', err);
            showToast('Erro ao gerar cupom não fiscal: ' + err.message, 'error');
        }
    }

    // Limpar carrinho e fechar modal
    carrinho = [];
    cliente = null;
    desconto = { tipo: 'percentual', valor: 0 };
    closeModal('modal-finalizar');
    renderCart();

    showToast('Venda finalizada com sucesso!', 'success');
    alert(`Venda Finalizada!\nNúmero: ${result.numero || result.data?.numero || 'N/A'}\nCliente: ${cliente?.nome_razao_social || cliente?.nome || 'Venda Avulsa'}\nTotal: R$ ${venda.valor_final.toFixed(2)}\nForma de Pagamento: ${venda.forma_pagamento}`);

    // Recarregar produtos para atualizar estoque
    await loadProdutos();
    renderProducts();
}