// Gestor Dashboard - Sistema Nexus B2B
(function() {
  const tokenKey = 'nexus_b2b_token';
  
  // Utilitários
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  
  function getToken() { return localStorage.getItem(tokenKey); }
  
  function ensureAuth() {
    const token = getToken();
    if (!token) {
      window.location.href = '/login.html';
      return null;
    }
    return token;
  }
  
  function parseJwt(token) {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }
  
  async function api(path, options = {}) {
    const token = ensureAuth();
    if (!token) throw new Error('No token');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    try {
      const response = await fetch(path, { ...options, headers });
      
      if (response.status === 401) {
        localStorage.removeItem(tokenKey);
        window.location.href = '/login.html';
        return;
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Erro ao fazer parse do JSON:', jsonError);
        throw new Error(`Erro no servidor - Status: ${response.status}`);
      }
      
      if (!response.ok) {
        console.error('Erro da API:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          data: data
        });
        throw new Error(data.error || `Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  }
  
  function showMessage(text, type = 'success') {
    // Remove mensagens existentes
    $$('.message').forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
      ${text}
    `;
    
    const activeTab = $('.tab-content.active');
    activeTab.insertBefore(message, activeTab.firstChild);
    
    setTimeout(() => message.remove(), 5000);
  }
  
  function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
  
  function formatDate(date) {
    try {
      return new Date(date).toLocaleString('pt-BR');
    } catch {
      return date;
    }
  }
  
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }
  
  // Sistema de Tabs
  function initTabs() {
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Atualizar tabs ativas
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Mostrar conteúdo da tab
        $$('.tab-content').forEach(content => content.classList.remove('active'));
        $(`#tab-${targetTab}`).classList.add('active');
        
        // Carregar dados da tab
        loadTabData(targetTab);
      });
    });
  }
  
  function loadTabData(tab) {
    switch (tab) {
      case 'equipes':
        carregarEquipes();
        break;
      case 'produtos':
        carregarProdutos();
        break;
      case 'pedidos':
        carregarPedidos();
        break;
      case 'usuarios':
        carregarUsuarios();
        break;
    }
  }
  
  // === EQUIPES ===
  async function carregarEquipes() {
    try {
      const data = await api('/api/equipes');
      const tbody = $('#tbodyEquipes');
      tbody.innerHTML = '';
      
      // Atualizar select de saldo
      const selectSaldo = $('#selEquipeSaldo');
      selectSaldo.innerHTML = '<option value="">Selecione uma equipe...</option>';
      
      (data.equipes || []).forEach(equipe => {
        // Adicionar à tabela
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${equipe.id}</td>
          <td>
            <input type="text" class="form-input" data-id="${equipe.id}" 
                   data-field="nome" value="${escapeHtml(equipe.nome)}">
          </td>
          <td>
            <input type="number" class="form-input" data-id="${equipe.id}" 
                   data-field="limite_total" step="0.01" value="${Number(equipe.limite_total).toFixed(2)}">
          </td>
          <td>${formatMoney(equipe.saldo_atual)}</td>
          <td>
            <span class="status ${equipe.status === 'ATIVA' ? 'success' : 'danger'}">
              ${equipe.status}
            </span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="salvarEquipe(${equipe.id})">
              <i class="fas fa-save"></i> Salvar
            </button>
          </td>
        `;
        tbody.appendChild(tr);
        
        // Adicionar ao select
        const option = document.createElement('option');
        option.value = equipe.id;
        option.textContent = `#${equipe.id} - ${equipe.nome}`;
        selectSaldo.appendChild(option);
      });
    } catch (error) {
      showMessage('Erro ao carregar equipes: ' + error.message, 'error');
    }
  }
  
  window.salvarEquipe = async function(id) {
    try {
      const nome = $(`input[data-id="${id}"][data-field="nome"]`).value.trim();
      const limite_total = Number($(`input[data-id="${id}"][data-field="limite_total"]`).value);
      
      if (!nome) {
        throw new Error('Nome da equipe é obrigatório');
      }
      
      await api(`/api/equipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, limite_total })
      });
      
      showMessage('Equipe atualizada com sucesso!');
      carregarEquipes();
    } catch (error) {
      showMessage('Erro ao salvar equipe: ' + error.message, 'error');
    }
  };
  
  window.verSaldo = async function() {
    try {
      const equipeId = $('#selEquipeSaldo').value;
      if (!equipeId) {
        showMessage('Selecione uma equipe', 'error');
        return;
      }
      
      const data = await api(`/api/equipes/${equipeId}/saldo`);
      const resultDiv = $('#saldoResult');
      resultDiv.className = 'message success';
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <i class="fas fa-wallet"></i>
        Saldo atual: ${formatMoney(data.saldo_atual)} | 
        Limite total: ${formatMoney(data.limite_total)}
      `;
    } catch (error) {
      showMessage('Erro ao consultar saldo: ' + error.message, 'error');
    }
  };
  
  // Form nova equipe
  $('#formNovaEquipe').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const nome = $('#nomeEquipe').value.trim();
      const limite_total = Number($('#limiteEquipe').value);
      
      if (!nome) throw new Error('Nome da equipe é obrigatório');
      if (limite_total <= 0) throw new Error('Limite deve ser maior que zero');
      
      const token = getToken();
      const payload = parseJwt(token);
      const gestor_id = payload?.id;
      
      await api('/api/equipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, gestor_id, limite_total })
      });
      
      showMessage('Equipe criada com sucesso!');
      $('#formNovaEquipe').reset();
      carregarEquipes();
    } catch (error) {
      showMessage('Erro ao criar equipe: ' + error.message, 'error');
    }
  });
  
  // === PRODUTOS ===
  let produtosState = { page: 1, pageSize: 20, search: '', categoria: '', totalPages: 1 };
  
  async function carregarProdutos(resetPage = false) {
    try {
      if (resetPage) produtosState.page = 1;
      
      const params = new URLSearchParams({
        page: produtosState.page,
        pageSize: produtosState.pageSize
      });
      
      if (produtosState.search) params.set('search', produtosState.search);
      if (produtosState.categoria) params.set('categoria', produtosState.categoria);
      
      const data = await api(`/api/produtos?${params}`);
      const tbody = $('#tbodyProdutos');
      tbody.innerHTML = '';
      
      (data.produtos || []).forEach(produto => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(produto.codprod)}</td>
          <td>${escapeHtml(produto.descricao)}</td>
          <td>${produto.unidade}</td>
          <td>${produto.multiplos}</td>
          <td>${Number(produto.estoque).toLocaleString('pt-BR')}</td>
          <td>${formatMoney(produto.preco)}</td>
          <td>
            <span class="status info">${produto.categoria}</span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="editarProduto(${produto.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="excluirProduto(${produto.id})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      // Atualizar paginação
      const pagination = data.pagination || {};
      produtosState.totalPages = pagination.totalPages || 1;
      
      $('#produtosPaginaInfo').textContent = 
        `Página ${pagination.page || 1} de ${produtosState.totalPages} (${pagination.total || 0} produtos)`;
      
      $('#produtosPrev').disabled = produtosState.page <= 1;
      $('#produtosNext').disabled = produtosState.page >= produtosState.totalPages;
      
    } catch (error) {
      showMessage('Erro ao carregar produtos: ' + error.message, 'error');
    }
  }
  
  window.buscarProdutos = function() {
    produtosState.search = $('#searchProdutos').value;
    produtosState.categoria = $('#filterCategoria').value;
    carregarProdutos(true);
  };
  
  window.editarProduto = async function(id) {
    try {
      const produto = await api(`/api/produtos/${id}`);
      
      // Preencher modal
      $('#editProdutoId').value = produto.id;
      $('#editCodprod').value = produto.codprod;
      $('#editDescricao').value = produto.descricao;
      $('#editUnidade').value = produto.unidade;
      $('#editMultiplos').value = produto.multiplos;
      $('#editEstoque').value = produto.estoque;
      $('#editPreco').value = produto.preco;
      $('#editNcm').value = produto.ncm || '';
      $('#editCategoria').value = produto.categoria;
      $('#editFoto').value = produto.foto || '';
      $('#editObservacoes').value = produto.observacoes || '';
      
      $('#modalEditarProduto').style.display = 'flex';
    } catch (error) {
      showMessage('Erro ao carregar produto: ' + error.message, 'error');
    }
  };
  
  window.fecharModalProduto = function() {
    $('#modalEditarProduto').style.display = 'none';
  };
  
  window.salvarEdicaoProduto = async function() {
    try {
      const id = $('#editProdutoId').value;
      const dados = {
        codprod: $('#editCodprod').value,
        descricao: $('#editDescricao').value,
        unidade: $('#editUnidade').value,
        multiplos: Number($('#editMultiplos').value),
        estoque: Number($('#editEstoque').value),
        preco: Number($('#editPreco').value),
        ncm: $('#editNcm').value,
        categoria: $('#editCategoria').value,
        foto: $('#editFoto').value,
        observacoes: $('#editObservacoes').value
      };
      
      await api(`/api/produtos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      
      showMessage('Produto atualizado com sucesso!');
      fecharModalProduto();
      carregarProdutos();
    } catch (error) {
      showMessage('Erro ao atualizar produto: ' + error.message, 'error');
    }
  };
  
  window.excluirProduto = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      await api(`/api/produtos/${id}`, { method: 'DELETE' });
      showMessage('Produto excluído com sucesso!');
      carregarProdutos();
    } catch (error) {
      showMessage('Erro ao excluir produto: ' + error.message, 'error');
    }
  };
  
  // Form novo produto
  $('#formNovoProduto').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const dados = {
        codprod: $('#codprod').value,
        descricao: $('#descricao').value,
        unidade: $('#unidade').value,
        multiplos: Number($('#multiplos').value),
        estoque: Number($('#estoque').value),
        preco: Number($('#preco').value),
        ncm: $('#ncm').value,
        categoria: $('#categoria').value,
        foto: $('#foto').value,
        observacoes: $('#observacoes').value
      };
      
      await api('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      
      showMessage('Produto criado com sucesso!');
      $('#formNovoProduto').reset();
      carregarProdutos();
    } catch (error) {
      showMessage('Erro ao criar produto: ' + error.message, 'error');
    }
  });
  
  // Paginação produtos
  $('#produtosPrev').addEventListener('click', () => {
    if (produtosState.page > 1) {
      produtosState.page--;
      carregarProdutos();
    }
  });
  
  $('#produtosNext').addEventListener('click', () => {
    if (produtosState.page < produtosState.totalPages) {
      produtosState.page++;
      carregarProdutos();
    }
  });
  
  // === PEDIDOS ===
  let pedidosState = { page: 1, pageSize: 10, status: 'AGUARDANDO', totalPages: 1 };
  
  async function carregarPedidos() {
    try {
      const params = new URLSearchParams({
        page: pedidosState.page,
        pageSize: pedidosState.pageSize,
        status: pedidosState.status
      });
      
      const data = await api(`/api/pedidos?${params}`);
      const tbody = $('#tbodyPedidos');
      tbody.innerHTML = '';
      
      (data.pedidos || []).forEach(pedido => {
        const tr = document.createElement('tr');
        const canApprove = pedido.status === 'AGUARDANDO';
        const canCancel = pedido.status === 'AGUARDANDO';
        
        tr.innerHTML = `
          <td>${pedido.id}</td>
          <td>${escapeHtml(pedido.equipe_nome || '#' + pedido.equipe_id)}</td>
          <td>${formatMoney(pedido.valor_total)}</td>
          <td>${formatDate(pedido.data)}</td>
          <td>
            <span class="status ${pedido.status === 'APROVADO' ? 'success' : 
                                 pedido.status === 'CANCELADO' ? 'danger' : 'warning'}">
              ${pedido.status}
            </span>
          </td>
          <td>
            ${canApprove ? `<button class="btn btn-success btn-sm" onclick="aprovarPedido(${pedido.id})">
              <i class="fas fa-check"></i> Aprovar
            </button>` : ''}
            ${canCancel ? `<button class="btn btn-danger btn-sm" onclick="cancelarPedido(${pedido.id})">
              <i class="fas fa-times"></i> Cancelar
            </button>` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      // Atualizar paginação
      const pagination = data.pagination || {};
      pedidosState.totalPages = pagination.totalPages || 1;
      
      $('#pedidosPaginaInfo').textContent = 
        `Página ${pagination.page || 1} de ${pedidosState.totalPages} (${pagination.total || 0} pedidos)`;
        
    } catch (error) {
      showMessage('Erro ao carregar pedidos: ' + error.message, 'error');
    }
  }
  
  window.aprovarPedido = async function(id) {
    if (!confirm('Aprovar e enviar este pedido?')) return;
    
    try {
      await api(`/api/pedidos/${id}/aprovar`, { method: 'POST' });
      showMessage('Pedido aprovado com sucesso!');
      carregarPedidos();
    } catch (error) {
      showMessage('Erro ao aprovar pedido: ' + error.message, 'error');
    }
  };
  
  window.cancelarPedido = async function(id) {
    if (!confirm('Cancelar este pedido? O saldo será estornado.')) return;
    
    try {
      await api(`/api/pedidos/${id}/cancelar`, { method: 'POST' });
      showMessage('Pedido cancelado com sucesso!');
      carregarPedidos();
    } catch (error) {
      showMessage('Erro ao cancelar pedido: ' + error.message, 'error');
    }
  };
  
  // === USUÁRIOS ===
  let usuariosState = { page: 1, pageSize: 10, search: '', perfil: '', totalPages: 1 };
  let equipesCache = [];
  
  async function carregarUsuarios() {
    try {
      const params = new URLSearchParams({
        page: usuariosState.page,
        pageSize: usuariosState.pageSize
      });
      
      if (usuariosState.search) params.set('q', usuariosState.search);
      if (usuariosState.perfil) params.set('perfil', usuariosState.perfil);
      
      const data = await api(`/api/usuarios?${params}`);
      const tbody = $('#tbodyUsuarios');
      tbody.innerHTML = '';
      
      (data.usuarios || []).forEach(usuario => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${usuario.id}</td>
          <td>
            <input type="text" class="form-input" data-id="${usuario.id}" 
                   data-field="nome" value="${escapeHtml(usuario.nome)}">
          </td>
          <td>
            <input type="email" class="form-input" data-id="${usuario.id}" 
                   data-field="email" value="${escapeHtml(usuario.email)}">
          </td>
          <td>
            <input type="password" class="form-input" data-id="${usuario.id}" 
                   data-field="senha" placeholder="(deixe vazio para manter)">
          </td>
          <td>
            <select class="form-input" data-id="${usuario.id}" data-field="perfil">
              <option value="gestor" ${usuario.perfil === 'gestor' ? 'selected' : ''}>Gestor</option>
              <option value="equipe" ${usuario.perfil === 'equipe' ? 'selected' : ''}>Equipe</option>
            </select>
          </td>
          <td>
            <select class="form-input" data-id="${usuario.id}" data-field="equipe_id">
              <option value="">(sem equipe)</option>
              ${equipesCache.map(eq => 
                `<option value="${eq.id}" ${usuario.equipe_id === eq.id ? 'selected' : ''}>
                  #${eq.id} - ${eq.nome}
                </option>`
              ).join('')}
            </select>
          </td>
          <td>
            <span class="status ${usuario.ativo ? 'success' : 'danger'}">
              ${usuario.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="salvarUsuario(${usuario.id})">
              <i class="fas fa-save"></i> Salvar
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      // Atualizar paginação
      const pagination = data.pagination || {};
      usuariosState.totalPages = pagination.totalPages || 1;
      
      $('#usuariosPaginaInfo').textContent = 
        `Página ${pagination.page || 1} de ${usuariosState.totalPages} (${pagination.total || 0} usuários)`;
        
    } catch (error) {
      showMessage('Erro ao carregar usuários: ' + error.message, 'error');
    }
  }
  
  async function carregarEquipesParaSelects() {
    try {
      const data = await api('/api/equipes');
      equipesCache = data.equipes || [];
      
      // Atualizar select do formulário de novo usuário
      const selectEquipe = $('#novoEquipe');
      selectEquipe.innerHTML = '<option value="">(sem equipe)</option>';
      
      equipesCache.forEach(equipe => {
        const option = document.createElement('option');
        option.value = equipe.id;
        option.textContent = `#${equipe.id} - ${equipe.nome}`;
        selectEquipe.appendChild(option);
      });
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
    }
  }
  
  window.salvarUsuario = async function(id) {
    try {
      const dados = {
        nome: $(`input[data-id="${id}"][data-field="nome"]`).value,
        email: $(`input[data-id="${id}"][data-field="email"]`).value,
        perfil: $(`select[data-id="${id}"][data-field="perfil"]`).value,
        equipe_id: $(`select[data-id="${id}"][data-field="equipe_id"]`).value || null
      };
      
      const senha = $(`input[data-id="${id}"][data-field="senha"]`).value;
      if (senha) dados.senha = senha;
      
      await api(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      
      showMessage('Usuário atualizado com sucesso!');
      carregarUsuarios();
    } catch (error) {
      showMessage('Erro ao salvar usuário: ' + error.message, 'error');
    }
  };
  
  window.buscarUsuarios = function() {
    usuariosState.search = $('#usrBusca').value;
    usuariosState.perfil = $('#selFiltroPerfil').value;
    usuariosState.page = 1;
    carregarUsuarios();
  };
  
  // Form novo usuário
  $('#formNovoUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const dados = {
        nome: $('#novoNome').value,
        email: $('#novoEmail').value,
        senha: $('#novoSenha').value,
        perfil: $('#novoPerfil').value,
        equipe_id: $('#novoEquipe').value || null,
        ativo: true
      };
      
      await api('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      
      showMessage('Usuário criado com sucesso!');
      $('#formNovoUsuario').reset();
      carregarUsuarios();
    } catch (error) {
      showMessage('Erro ao criar usuário: ' + error.message, 'error');
    }
  });
  
  // === LOGOUT ===
  window.logout = function() {
    localStorage.removeItem(tokenKey);
    window.location.href = '/login.html';
  };
  
  // === INICIALIZAÇÃO ===
  document.addEventListener('DOMContentLoaded', () => {
    ensureAuth();
    
    // Mostrar saudação do usuário
    const token = getToken();
    const payload = parseJwt(token);
    if (payload) {
      $('#userGreeting').textContent = `Olá, ${payload.nome}!`;
    }
    
    initTabs();
    carregarEquipesParaSelects().then(() => {
      loadTabData('equipes'); // Carregar dados da tab inicial
    });
    
    // Fechar modal ao clicar fora
    $('#modalEditarProduto').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        fecharModalProduto();
      }
    });
  });
  
})();