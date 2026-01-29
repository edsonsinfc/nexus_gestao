// Nexus B2B - Interface da Equipe
var app = {
  produtos: [],
  categorias: [],
  carrinho: [],
  currentPage: 1,
  totalPages: 1,
  currentFilters: { search: '', categoria: '' },
  
  init: function() {
    console.log('🚀 Iniciando aplicação da equipe...');
    
    // Verificar se usuário está logado
    var token = localStorage.getItem('nexus_b2b_token');
    console.log('🔑 Token encontrado:', token ? 'SIM' : 'NÃO');
    
    if (!token) {
      console.log('❌ Sem token, redirecionando para login...');
      window.location.href = '/login.html';
      return;
    }
    
    console.log('✅ Usuário logado, continuando...');
    
    // Carregar carrinho do localStorage
    var savedCart = localStorage.getItem('nexus_b2b_cart');
    if (savedCart) {
      try {
        this.carrinho = JSON.parse(savedCart);
        console.log('🛒 Carrinho carregado:', this.carrinho.length, 'itens');
      } catch (e) {
        console.error('Erro ao carregar carrinho:', e);
        this.carrinho = [];
      }
    }
    
    this.setupEventListeners();
    this.loadCategories();
    this.loadProducts();
    this.updateCartDisplay();
  },
  
  setupEventListeners: function() {
    var self = this;
    
    // Busca
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        clearTimeout(self.searchTimeout);
        self.searchTimeout = setTimeout(function() { 
          self.currentFilters.search = searchInput.value.trim();
          self.currentPage = 1;
          self.loadProducts();
        }, 500);
      });
    }
    
    var categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', function() { 
        self.handleCategoryFilter(); 
      });
    }
    
    var clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', function() { 
        self.clearFilters(); 
      });
    }
    
    var prevPage = document.getElementById('prevPage');
    if (prevPage) {
      prevPage.addEventListener('click', function() { 
        self.goToPage(self.currentPage - 1); 
      });
    }
    
    var nextPage = document.getElementById('nextPage');
    if (nextPage) {
      nextPage.addEventListener('click', function() { 
        self.goToPage(self.currentPage + 1); 
      });
    }
    
    // Carrinho agora é fixo, não precisa de toggle
    var cartSummary = document.getElementById('cartSummary');
    if (cartSummary) {
      cartSummary.addEventListener('click', function() { 
        // Scroll suave para o carrinho em mobile
        if (window.innerWidth <= 768) {
          var cartSection = document.querySelector('.cart-section');
          if (cartSection) {
            cartSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }
    
    var checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function() { 
        self.checkout(); 
      });
    }
    
    var btnSair = document.getElementById('btnSair');
    if (btnSair) {
      btnSair.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('nexus_b2b_token');
        window.location.href = '/login.html';
      });
    }
  },
  
  api: function(url, options) {
    options = options || {};
    var token = localStorage.getItem('nexus_b2b_token');
    
    var headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
    
    if (options.headers) {
      for (var key in options.headers) {
        headers[key] = options.headers[key];
      }
    }
    
    var fetchOptions = {
      headers: headers
    };
    
    for (var key in options) {
      if (key !== 'headers') {
        fetchOptions[key] = options[key];
      }
    }
    
    return fetch(url, fetchOptions).then(function(response) {
      if (response.status === 401) {
        localStorage.removeItem('nexus_b2b_token');
        window.location.href = '/login.html';
        return;
      }
      return response;
    });
  },
  
  loadCategories: function() {
    var self = this;
    this.api('/api/produtos/categorias')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        self.categorias = data.categorias || [];
        self.renderCategoryFilter();
      })
      .catch(function(error) {
        console.error('Erro ao carregar categorias:', error);
      });
  },
  
  renderCategoryFilter: function() {
    var select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">Todas as categorias</option>';
    
    for (var i = 0; i < this.categorias.length; i++) {
      var categoria = this.categorias[i];
      var option = document.createElement('option');
      option.value = categoria;
      option.textContent = categoria;
      select.appendChild(option);
    }
  },
  
  loadProducts: function() {
    var self = this;
    console.log('📦 Carregando produtos...');
    this.showLoading(true);
    
    var params = new URLSearchParams({
      page: this.currentPage,
      pageSize: 20
    });
    
    if (this.currentFilters.search) params.append('search', this.currentFilters.search);
    if (this.currentFilters.categoria) params.append('categoria', this.currentFilters.categoria);
    
    console.log('🔗 URL da API:', '/api/produtos?' + params);
    
    this.api('/api/produtos?' + params)
      .then(function(response) { 
        console.log('📡 Resposta da API:', response.status);
        return response.json(); 
      })
      .then(function(data) {
        console.log('📊 Dados recebidos:', data);
        self.produtos = data.produtos || [];
        self.totalPages = data.pagination ? data.pagination.totalPages : 1;
        console.log('✅ Produtos carregados:', self.produtos.length);
        self.renderProducts();
        self.updatePagination();
      })
      .catch(function(error) {
        console.error('❌ Erro ao carregar produtos:', error);
        self.showError('Erro ao carregar produtos');
      })
      .finally(function() {
        self.showLoading(false);
      });
  },
  
  renderProducts: function() {
    var grid = document.getElementById('productsGrid');
    var emptyState = document.getElementById('emptyState');
    
    if (!grid) {
      console.error('❌ Elemento productsGrid não encontrado');
      return;
    }
    
    if (this.produtos.length === 0) {
      grid.style.display = 'none';
      if (emptyState) {
        emptyState.style.display = 'block';
      } else {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #999;">Nenhum produto encontrado</div>';
        grid.style.display = 'grid';
      }
      return;
    }
    
    grid.style.display = 'grid';
    if (emptyState) {
      emptyState.style.display = 'none';
    }
    
    var html = '';
    for (var i = 0; i < this.produtos.length; i++) {
      html += this.renderProductCard(this.produtos[i]);
    }
    grid.innerHTML = html;
    
    this.bindProductEvents();
  },
  
  renderProductCard: function(produto) {
    var hasImage = produto.foto && produto.foto.trim();
    var imageContent = hasImage 
      ? '<img src="' + produto.foto + '" alt="' + produto.descricao + '">'
      : '<i class="fas fa-box-open"></i>';
    
    var multiplos = produto.multiplos || 1;
    var multiploText = multiplos > 1 ? ' (múltiplos de ' + multiplos + ')' : '';
    
    return '<div class="product-card" data-produto-id="' + produto.id + '">' +
      '<div class="product-image">' + imageContent + '</div>' +
      '<div class="product-info">' +
        '<h3 class="product-title">' + produto.descricao + '</h3>' +
        '<div class="product-code">Cód: ' + produto.codprod + '</div>' +
        '<div class="product-unit">Unidade: ' + produto.unidade + multiploText + '</div>' +
        (produto.observacoes ? '<div class="product-description">' + produto.observacoes + '</div>' : '') +
        '<div class="quantity-controls">' +
          '<button class="quantity-btn" onclick="app.decreaseQuantity(' + produto.id + ')">-</button>' +
          '<input type="number" class="quantity-input" value="' + multiplos + '" ' +
            'min="' + multiplos + '" step="' + multiplos + '" data-multiplos="' + multiplos + '">' +
          '<button class="quantity-btn" onclick="app.increaseQuantity(' + produto.id + ')">+</button>' +
        '</div>' +
        '<button class="add-to-cart" onclick="app.addProductToCart(' + produto.id + ')">' +
          '<i class="fas fa-cart-plus"></i> Adicionar' +
        '</button>' +
      '</div>' +
    '</div>';
  },
  
  bindProductEvents: function() {
    var self = this;
    var grid = document.getElementById('productsGrid');
    
    var buttons = grid.querySelectorAll('.btn-add-cart');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function(e) {
        var produtoId = parseInt(e.target.dataset.produtoId);
        var productCard = e.target.closest('.product-card');
        var qtyInput = productCard.querySelector('.qty-input');
        var quantidade = parseInt(qtyInput.value) || 1;
        
        self.addToCart(produtoId, quantidade);
        qtyInput.value = 1;
      });
    }
  },
  
  // Funções auxiliares para quantidade
  decreaseQuantity: function(produtoId) {
    var input = document.querySelector('[data-produto-id="' + produtoId + '"] .quantity-input');
    if (input) {
      var multiplos = parseInt(input.dataset.multiplos) || 1;
      var currentValue = parseInt(input.value) || multiplos;
      var newValue = Math.max(multiplos, currentValue - multiplos);
      input.value = newValue;
    }
  },
  
  increaseQuantity: function(produtoId) {
    var input = document.querySelector('[data-produto-id="' + produtoId + '"] .quantity-input');
    if (input) {
      var multiplos = parseInt(input.dataset.multiplos) || 1;
      var currentValue = parseInt(input.value) || 0;
      input.value = currentValue + multiplos;
    }
  },
  
  addProductToCart: function(produtoId) {
    var input = document.querySelector('[data-produto-id="' + produtoId + '"] .quantity-input');
    if (input) {
      var quantidade = parseInt(input.value) || 1;
      this.addToCart(produtoId, quantidade);
      
      // Reset para múltiplo mínimo após adicionar
      var multiplos = parseInt(input.dataset.multiplos) || 1;
      input.value = multiplos;
    }
  },

  addToCart: function(produtoId, quantidade) {
    var produto = null;
    for (var i = 0; i < this.produtos.length; i++) {
      if (this.produtos[i].id === produtoId) {
        produto = this.produtos[i];
        break;
      }
    }
    
    if (!produto) return;
    
    // Validar múltiplos
    var multiplos = produto.multiplos || 1;
    if (quantidade % multiplos !== 0) {
      var qtdSugerida = Math.ceil(quantidade / multiplos) * multiplos;
      alert('Este produto deve ser pedido em múltiplos de ' + multiplos + ' unidades.\n' +
            'Quantidade atual: ' + quantidade + '\n' +
            'Quantidade sugerida: ' + qtdSugerida);
      
      // Atualizar o input com a quantidade sugerida
      var qtyInput = document.querySelector('[data-produto-id="' + produtoId + '"] .quantity-input');
      if (qtyInput) {
        qtyInput.value = qtdSugerida;
      }
      return;
    }
    
    var existingItem = null;
    for (var i = 0; i < this.carrinho.length; i++) {
      if (this.carrinho[i].id === produtoId) {
        existingItem = this.carrinho[i];
        break;
      }
    }
    
    if (existingItem) {
      existingItem.quantidade += quantidade;
    } else {
      this.carrinho.push({
        id: produto.id,
        codprod: produto.codprod,
        descricao: produto.descricao,
        unidade: produto.unidade || 'UN',
        multiplos: produto.multiplos || 1,
        quantidade: quantidade,
        preco: produto.preco || 0
      });
    }
    
    // Salvar carrinho no localStorage
    localStorage.setItem('nexus_b2b_cart', JSON.stringify(this.carrinho));
    
    this.updateCartDisplay();
    this.showSuccess(produto.descricao + ' adicionado ao carrinho!');
  },
  
  removeFromCart: function(produtoId) {
    var newCarrinho = [];
    for (var i = 0; i < this.carrinho.length; i++) {
      if (this.carrinho[i].id !== produtoId) {
        newCarrinho.push(this.carrinho[i]);
      }
    }
    this.carrinho = newCarrinho;
    this.updateCartDisplay();
  },
  
  updateCartQuantity: function(produtoId, novaQuantidade) {
    for (var i = 0; i < this.carrinho.length; i++) {
      if (this.carrinho[i].id === produtoId) {
        if (novaQuantidade > 0) {
          this.carrinho[i].quantidade = novaQuantidade;
        } else {
          this.removeFromCart(produtoId);
        }
        break;
      }
    }
    this.updateCartDisplay();
  },
  
  updateCartDisplay: function() {
    var headerCartCount = document.getElementById('cartCount');
    var cartContent = document.getElementById('cartItems');
    var cartTotal = document.getElementById('cartTotal');
    var checkoutBtn = document.getElementById('checkoutBtn');
    
    var totalItems = 0;
    for (var i = 0; i < this.carrinho.length; i++) {
      totalItems += this.carrinho[i].quantidade;
    }
    
    if (headerCartCount) {
      headerCartCount.textContent = totalItems;
    }
    
    if (!cartContent || !cartTotal) {
      console.warn('⚠️ Elementos do carrinho não encontrados');
      return;
    }
    
    if (this.carrinho.length === 0) {
      cartContent.innerHTML = '<div class="cart-empty">' +
        '<div class="cart-empty-icon">🛒</div>' +
        '<p>Carrinho vazio</p>' +
        '<small>Adicione produtos para começar</small>' +
      '</div>';
      cartTotal.textContent = 'Total: 0 itens';
      cartTotal.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      var html = '';
      for (var i = 0; i < this.carrinho.length; i++) {
        var item = this.carrinho[i];
        html += '<div class="cart-item">' +
          '<div class="cart-item-info">' +
            '<div class="cart-item-name">' + item.descricao + '</div>' +
            '<div class="cart-item-code">Cód: ' + item.codprod + '</div>' +
            '<div class="cart-item-qty">Qtd: ' + item.quantidade + ' ' + item.unidade + '</div>' +
            (item.multiplos > 1 ? '<div class="cart-item-multiplos">Múltiplos de ' + item.multiplos + '</div>' : '') +
          '</div>' +
          '<div class="cart-item-actions">' +
            '<button class="remove-item" onclick="app.removeFromCart(' + item.id + ')">×</button>' +
          '</div>' +
        '</div>';
      }
      cartContent.innerHTML = html;
      
      // Atualizar contador de itens (não usar textContent para não apagar o botão)
      var totalItemsSpan = document.getElementById('totalItems');
      if (totalItemsSpan) {
        totalItemsSpan.textContent = totalItems;
      }
      
      cartTotal.style.display = 'block';
      if (checkoutBtn) checkoutBtn.disabled = false;
    }
  },
  
  checkout: function() {
    var self = this;
    if (this.carrinho.length === 0) {
      self.showError('Carrinho vazio!');
      return;
    }
    
    var checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Finalizando...';
    }
    
    // Preparar itens do pedido com os campos corretos
    var itens = [];
    for (var i = 0; i < this.carrinho.length; i++) {
      var item = this.carrinho[i];
      itens.push({
        codprod: item.codprod,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.preco || 0
      });
    }
    
    // Obter equipe_id do token JWT
    var token = localStorage.getItem('nexus_b2b_token');
    var payload = null;
    if (token) {
      try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        payload = JSON.parse(atob(base64));
      } catch (e) {
        console.error('Erro ao decodificar token:', e);
      }
    }
    
    if (!payload || !payload.equipe_id) {
      self.showError('Erro: equipe não identificada. Faça login novamente.');
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Finalizar Pedido';
      }
      return;
    }
    
    var pedidoData = {
      equipe_id: payload.equipe_id,
      itens: itens
    };
    
    console.log('📦 Enviando pedido:', pedidoData);
    
    this.api('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify(pedidoData)
    })
    .then(function(response) {
      console.log('📡 Resposta recebida:', response.status, response.statusText);
      if (!response) {
        throw new Error('Sem resposta do servidor');
      }
      return response.json().then(function(data) {
        console.log('📄 Dados da resposta:', data);
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao finalizar pedido');
        }
        return data;
      }).catch(function(jsonError) {
        console.error('❌ Erro ao fazer parse do JSON:', jsonError);
        throw new Error('Resposta inválida do servidor');
      });
    })
    .then(function(data) {
      console.log('✅ Pedido criado com sucesso:', data);
      self.carrinho = [];
      localStorage.setItem('nexus_b2b_cart', JSON.stringify(self.carrinho));
      self.updateCartDisplay();
      self.showSuccess('✅ Pedido enviado com sucesso! O gestor foi notificado por email.');
    })
    .catch(function(error) {
      console.error('❌ Erro no checkout:', error);
      console.error('❌ Stack trace:', error.stack);
      self.showError('Erro: ' + error.message);
    })
    .finally(function() {
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Finalizar Pedido';
      }
    });
  },
  
  // Carrinho agora é fixo na lateral - funções de toggle removidas
  
  handleSearch: function() {
    this.currentFilters.search = document.getElementById('searchInput').value.trim();
    this.currentPage = 1;
    this.loadProducts();
  },
  
  handleCategoryFilter: function() {
    this.currentFilters.categoria = document.getElementById('categoryFilter').value;
    this.currentPage = 1;
    this.loadProducts();
  },
  
  clearFilters: function() {
    document.getElementById('headerSearch').value = '';
    document.getElementById('categoryFilter').value = '';
    this.currentFilters = { search: '', categoria: '' };
    this.currentPage = 1;
    this.loadProducts();
  },
  
  goToPage: function(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  },
  
  updatePagination: function() {
    var pagination = document.getElementById('pagination');
    var pageInfo = document.getElementById('pageInfo');
    var prevBtn = document.getElementById('prevPage');
    var nextBtn = document.getElementById('nextPage');
    
    if (!pagination || !pageInfo || !prevBtn || !nextBtn) {
      console.warn('⚠️ Elementos de paginação não encontrados');
      return;
    }
    
    if (this.totalPages <= 1) {
      pagination.style.display = 'none';
    } else {
      pagination.style.display = 'flex';
      pageInfo.textContent = 'Página ' + this.currentPage + ' de ' + this.totalPages;
      prevBtn.disabled = this.currentPage <= 1;
      nextBtn.disabled = this.currentPage >= this.totalPages;
    }
  },
  
  showLoading: function(show) {
    var loading = document.getElementById('loadingProducts');
    var grid = document.getElementById('productsGrid');
    
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
    
    if (grid) {
      grid.style.display = show ? 'none' : 'grid';
    }
  },
  
  showSuccess: function(message) {
    this.showNotification(message, '#10b981');
  },
  
  showError: function(message) {
    this.showNotification(message, '#ef4444');
  },
  
  showNotification: function(message, color) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' + color + 
      '; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 1000; max-width: 300px;';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  app.init();
});
