// public/admin.js
console.log('🚀 ==================== ADMIN.JS CARREGADO ==================== 🚀');

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let currentPage = 'dashboard';

console.log('🔑 Token:', token ? 'EXISTE' : '❌ NÃO EXISTE');

// Verificar autenticação
if (!token) {
  console.warn('Token não encontrado, redirecionando para login');
  window.location.href = '/';
}

// Dados de departamentos e categorias (agora vamos carregar do banco)
let departamentosCache = {};

// Navegação
$$('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.getAttribute('href') === '/pdv-novo.html') return;
    
    e.preventDefault();
    const page = link.dataset.page;
    if (!page) return;
    
    showPage(page);
    
    // Atualizar navegação ativa
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

function showPage(pageId) {
  $$('.page').forEach(page => page.classList.remove('active'));
  const targetPage = $(`#${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageId;
    
    // Carregar dados da página
    switch(pageId) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'produtos':
        loadProdutos();
        break;
      case 'clientes':
        loadClientes();
        break;
      case 'fornecedores':
        loadFornecedores();
        break;
      case 'vendedores':
        loadVendedores();
        break;
    }
  }
}

// Dashboard
async function loadDashboard() {
  try {
    // Carregar estatísticas
    const [produtosRes, clientesRes] = await Promise.all([
      fetch('/api/produtos?limit=1', { headers: apiHeaders }),
      fetch('/api/clientes?limit=1', { headers: apiHeaders })
    ]);

    if (produtosRes.ok) {
      const produtosData = await produtosRes.json();
      const totalProdutosEl = $('#total-produtos');
      if (totalProdutosEl) {
        totalProdutosEl.textContent = produtosData.pagination.total;
      }
    }

    if (clientesRes.ok) {
      const clientesData = await clientesRes.json();
      const totalClientesEl = $('#total-clientes');
      if (totalClientesEl) {
        totalClientesEl.textContent = clientesData.pagination.total;
      }
    }

    // Simular dados para vendas e estoque baixo
    const vendasEl = $('#vendas-hoje');
    const estoqueEl = $('#estoque-baixo');
    if (vendasEl) vendasEl.textContent = '12';
    if (estoqueEl) estoqueEl.textContent = '5';

  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}

// Produtos
async function loadProdutos() {
  try {
    const response = await fetch('/api/produtos', { headers: apiHeaders });
    
    if (!response.ok) {
      throw new Error('Erro ao carregar produtos');
    }

    const data = await response.json();
    renderProdutosTable(data.produtos);

  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    showMessage('Erro ao carregar produtos', 'error');
  }
}

function renderProdutosTable(produtos) {
  const tbody = $('#produtos-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  produtos.forEach(produto => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${produto.codigo_principal || '-'}</td>
      <td>${produto.descricao || '-'}</td>
      <td>R$ ${parseFloat(produto.preco_venda || 0).toFixed(2)}</td>
      <td>${produto.estoque_atual || 0}</td>
      <td><span class="status ${produto.ativo ? 'active' : 'inactive'}">${produto.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editarProduto(${produto.id})">Editar</button>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="excluirProduto(${produto.id})">Excluir</button>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="abrirPreviewTributacao(${produto.id})">Prévia Trib</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Clientes
async function loadClientes() {
  try {
    console.log('Carregando clientes...');
    const response = await fetch('/api/clientes', { headers: apiHeaders });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar clientes');
    }

    const data = await response.json();
    console.log('Dados recebidos:', data);
    console.log('Clientes:', data.clientes);
    
    renderClientesTable(data.clientes);

  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
    showMessage('Erro ao carregar clientes', 'error');
  }
}

function renderClientesTable(clientes) {
  console.log('Renderizando tabela de clientes...');
  console.log('Clientes recebidos:', clientes);
  
  const tbody = $('#clientes-table tbody');
  console.log('Tbody encontrado:', tbody);
  
  if (!tbody) {
    console.error('Tbody não encontrado!');
    return;
  }
  
  tbody.innerHTML = '';

  if (!Array.isArray(clientes)) {
    console.error('Clientes não é um array:', clientes);
    return;
  }

  console.log(`Renderizando ${clientes.length} clientes`);

  clientes.forEach((cliente, index) => {
    console.log(`Cliente ${index + 1}:`, cliente);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cliente.codigo || '-'}</td>
      <td>${cliente.nome_razao_social || '-'}</td>
      <td>${cliente.cpf_cnpj || '-'}</td>
      <td>${cliente.vendedor_nome || '-'}</td>
      <td><span class="status ${cliente.ativo ? 'active' : 'inactive'}">${cliente.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editarCliente(${cliente.id})">Editar</button>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="excluirCliente(${cliente.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  console.log('Tabela renderizada com sucesso');
}

// Carregar departamentos do banco
async function carregarDepartamentos() {
  try {
    const response = await fetch('/api/departamentos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar departamentos');
    
    const departamentos = await response.json();
    const select = $('#departamento');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione...</option>';
    
    departamentos.forEach(dep => {
      const opt = document.createElement('option');
      opt.value = dep.id;
      opt.textContent = dep.nome;
      opt.dataset.nome = dep.nome;
      select.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar departamentos:', error);
    showMessage('Erro ao carregar departamentos', 'error');
  }
}

// Carregar seções (categorias de produtos) baseado no departamento selecionado
async function carregarCategorias() {
  const depSelect = $('#departamento');
  const catSelect = $('#prod-categoria'); // Corrigido de #categoria para #prod-categoria
  
  if (!depSelect || !catSelect) return;
  
  const departamentoId = depSelect.value;
  catSelect.innerHTML = '<option value="">Selecione...</option>';
  
  if (!departamentoId) return;
  
  try {
    const response = await fetch(`/api/secoes?departamento_id=${departamentoId}`, { 
      headers: apiHeaders 
    });
    
    if (!response.ok) throw new Error('Erro ao carregar categorias');
    
    const categorias = await response.json();
    
    categorias.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.nome;
      catSelect.appendChild(opt);
    });
    
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    showMessage('Erro ao carregar categorias', 'error');
  }
}

// Adicionar novo departamento
async function adicionarDepartamento() {
  const nome = prompt('Nome do novo departamento:');
  if (!nome || !nome.trim()) return;
  
  try {
    const response = await fetch('/api/departamentos', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ nome: nome.trim() })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar departamento');
    }
    
    const novoDep = await response.json();
    showMessage('Departamento criado com sucesso!', 'success');
    
    // Recarregar departamentos e selecionar o novo
    await carregarDepartamentos();
    const select = $('#departamento');
    if (select) select.value = novoDep.id;
    carregarCategorias();
    
  } catch (error) {
    console.error('Erro ao criar departamento:', error);
    showMessage(error.message, 'error');
  }
}

// Adicionar nova seção (categoria de produto)
async function adicionarCategoria() {
  const depSelect = $('#departamento');
  if (!depSelect) return;
  
  const departamentoId = depSelect.value;
  if (!departamentoId) {
    alert('Selecione um departamento primeiro!');
    return;
  }
  
  const nome = prompt('Nome da nova seção (categoria):');
  if (!nome || !nome.trim()) return;
  
  try {
    const response = await fetch('/api/secoes', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ 
        nome: nome.trim(),
        departamento_id: parseInt(departamentoId)
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar seção');
    }
    
    const novaCat = await response.json();
    showMessage('Seção criada com sucesso!', 'success');
    
    // Recarregar categorias e selecionar a nova
    await carregarCategorias();
    const select = $('#prod-categoria');
    if (select) select.value = novaCat.id;
    
  } catch (error) {
    console.error('Erro ao criar seção:', error);
    showMessage(error.message, 'error');
  }
}

// Carregar vendedores do banco
async function carregarVendedores() {
  try {
    console.log('Tentando carregar vendedores...');
    console.log('Token:', token ? 'Presente' : 'Ausente');
    console.log('Headers:', apiHeaders);
    
    const response = await fetch('/api/vendedores', { headers: apiHeaders });
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Erro ao carregar vendedores:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Dados recebidos:', data);
    const vendedores = data.vendedores || data; // Adaptar para diferentes formatos de resposta
    const select = $('#vendedor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione...</option>';
    
    if (Array.isArray(vendedores)) {
      vendedores.forEach(vendedor => {
        const opt = document.createElement('option');
        opt.value = vendedor.id;
        opt.textContent = vendedor.nome;
        select.appendChild(opt);
      });
      console.log(`${vendedores.length} vendedores carregados`);
    }
    
  } catch (error) {
    console.warn('Erro ao carregar vendedores, continuando sem vendedores:', error);
    // Não mostrar erro para o usuário, apenas continuar sem vendedores
  }
}

// Adicionar novo vendedor
async function adicionarVendedor() {
  const nome = prompt('Nome do novo vendedor:');
  if (!nome || !nome.trim()) return;
  
  try {
    const response = await fetch('/api/vendedores', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ nome: nome.trim() })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar vendedor');
    }
    
    const novoVendedor = await response.json();
    showMessage('Vendedor criado com sucesso!', 'success');
    
    // Recarregar vendedores e selecionar o novo
    await carregarVendedores();
    const select = $('#vendedor');
    if (select) select.value = novoVendedor.id;
    
  } catch (error) {
    console.error('Erro ao criar vendedor:', error);
    showMessage(error.message, 'error');
  }
}

// Toggle campos baseado no tipo de pessoa
function toggleCamposPessoa() {
  const tipo = $('select[name="tipo"]').value;
  const labelNome = $('#label-nome');
  const labelDocumento = $('#label-documento');
  const campoInscricao = $('input[name="inscricao_estadual"]').parentElement;
  
  if (tipo === 'F') {
    if (labelNome) labelNome.textContent = 'Nome';
    if (labelDocumento) labelDocumento.textContent = 'CPF';
    if (campoInscricao) campoInscricao.style.display = 'none';
  } else if (tipo === 'J') {
    if (labelNome) labelNome.textContent = 'Razão Social';
    if (labelDocumento) labelDocumento.textContent = 'CNPJ';
    if (campoInscricao) campoInscricao.style.display = 'block';
  }
}

// Modal functions
function abrirModalProduto() {
  const modal = $('#modal-produto');
  const form = $('#form-produto');
  
  if (modal && form) {
    form.reset();
    carregarDepartamentos();
    modal.classList.add('active');
    
    const modalTitle = $('#modal-produto .modal-title');
    if (modalTitle) modalTitle.textContent = 'Novo Produto';
    
    // Remover atributo de edição se existir
    form.removeAttribute('data-editing-id');
  }
}

function abrirModalCliente() {
  console.log('Função abrirModalCliente chamada!');
  const modal = $('#modal-cliente');
  const form = $('#form-cliente');
  
  console.log('Modal encontrado:', modal);
  console.log('Form encontrado:', form);
  
  if (modal && form) {
    form.reset();
    carregarVendedores();
    modal.classList.add('active');
    
    const modalTitle = $('#modal-cliente .modal-title');
    if (modalTitle) modalTitle.textContent = 'Novo Cliente';
    
    // Remover atributo de edição se existir
    form.removeAttribute('data-editing-id');
    console.log('Modal aberto com sucesso!');
    
    // Adicionar listener direto no botão de submit
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      console.log('Adicionando listener direto no botão de submit');
      submitBtn.onclick = function(e) {
        e.preventDefault();
        console.log('Botão de submit clicado via onclick!');
        processarFormularioCliente(form);
      };
    }
    
  } else {
    console.error('Modal ou form não encontrado!');
  }
}

// Função para processar o formulário de cliente
async function processarFormularioCliente(form) {
  console.log('=== PROCESSANDO FORMULÁRIO DE CLIENTE ===');
  
  const formData = new FormData(form);
  const cliente = {};
  
  // Montar objeto do cliente
  formData.forEach((value, key) => {
    if (value !== '') {
      cliente[key] = value;
    }
  });
  
  console.log('Dados do formulário:', cliente);
  
  // Converter valores booleanos e numéricos
  cliente.ativo = cliente.ativo === '1' ? true : false;
  if (cliente.vendedor_id) cliente.vendedor_id = parseInt(cliente.vendedor_id);
  if (cliente.politica_precificacao_id) cliente.politica_precificacao_id = parseInt(cliente.politica_precificacao_id);
  
  try {
    console.log('Enviando cliente para o backend:', cliente);
    console.log('Headers:', apiHeaders);

    const response = await fetch('/api/clientes', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(cliente)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      alert('Erro ao salvar: ' + errorText);
      return;
    }

    const result = await response.json();
    console.log('Resposta do servidor:', result);

    alert('Cliente salvo com sucesso!');
    fecharModal('modal-cliente');
    loadClientes();

  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    alert('Erro ao salvar: ' + error.message);
  }
}


function fecharModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.style.display = 'none';
    // Limpar mensagens de erro se houver
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
    }
  }
}

// Fechar modal ao clicar fora
$$('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      fecharModal(modal.id);
    }
  });
});

// Formulário de produto - CORRIGIDO
const formProduto = $('#form-produto');
if (formProduto) {
  formProduto.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const produto = {};
    
    // Montar objeto do produto
    formData.forEach((value, key) => {
      if (value !== '') {
        produto[key] = value;
      }
    });
    
    // Converter valores numéricos
    produto.preco_custo = parseFloat(produto.preco_custo) || 0;
    produto.preco_venda = parseFloat(produto.preco_venda) || 0;
    produto.estoque_minimo = parseFloat(produto.estoque_minimo) || 0;
    produto.ativo = true;
    
    // Converter IDs de departamento e categoria para inteiros
    if (produto.departamento) produto.departamento_id = parseInt(produto.departamento);
    if (produto.categoria) produto.categoria_id = parseInt(produto.categoria);
    
    // Remover campos desnecessários
    delete produto.departamento;
    delete produto.categoria;
    
    const editingId = e.target.getAttribute('data-editing-id');
    const isEditing = editingId !== null;
    
    try {
      const url = isEditing ? `/api/produtos/${editingId}` : '/api/produtos';
      const method = isEditing ? 'PUT' : 'POST';
      
      // ADICIONE ESTA LINHA AQUI
      console.log('Enviando para o backend:', produto);

      const response = await fetch(url, {
        method: method,
        headers: apiHeaders,
        body: JSON.stringify(produto)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} produto`);
      }

      showMessage(`Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, 'success');
      fecharModal('modal-produto');
      loadProdutos();

    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      showMessage(error.message, 'error');
    }
  });
}

// Formulário de cliente - Adicionar listener quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  const formCliente = $('#form-cliente');
  if (formCliente) {
    console.log('Formulário de cliente encontrado, adicionando listener');
    formCliente.addEventListener('submit', async (e) => {
      console.log('Formulário de cliente submetido!');
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const cliente = {};
      
      // Montar objeto do cliente
      formData.forEach((value, key) => {
        if (value !== '') {
          cliente[key] = value;
        }
      });
      
      console.log('Dados do formulário:', cliente);
      
      // Converter valores booleanos e numéricos
      cliente.ativo = cliente.ativo === '1' ? true : false;
      if (cliente.vendedor_id) cliente.vendedor_id = parseInt(cliente.vendedor_id);
      if (cliente.politica_precificacao_id) cliente.politica_precificacao_id = parseInt(cliente.politica_precificacao_id);
      
      const editingId = e.target.getAttribute('data-editing-id');
      const isEditing = editingId !== null;
      
      try {
        const url = isEditing ? `/api/clientes/${editingId}` : '/api/clientes';
        const method = isEditing ? 'PUT' : 'POST';
        
        console.log('URL:', url);
        console.log('Method:', method);
        console.log('Headers:', apiHeaders);
        console.log('Enviando cliente para o backend:', cliente);

        const response = await fetch(url, {
          method: method,
          headers: apiHeaders,
          body: JSON.stringify(cliente)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro na resposta:', errorText);
          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { message: errorText };
          }
          throw new Error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} cliente`);
        }

        const result = await response.json();
        console.log('Resposta do servidor:', result);

        showMessage(`Cliente ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        fecharModal('modal-cliente');
        loadClientes();

      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        showMessage(error.message, 'error');
      }
    });
  } else {
    console.error('Formulário de cliente não encontrado!');
  }
});

// Formulário de fornecedor
document.addEventListener('DOMContentLoaded', function() {
  const formFornecedor = $('#form-fornecedor');
  if (formFornecedor) {
    console.log('Formulário de fornecedor encontrado, adicionando listener');
    formFornecedor.addEventListener('submit', async (e) => {
      console.log('Formulário de fornecedor submetido!');
      e.preventDefault();
      
      await processarFormularioFornecedor(e.target);
    });
  } else {
    console.error('Formulário de fornecedor não encontrado!');
  }
});

// Funções de ação
async function editarProduto(id) {
  try {
    const response = await fetch(`/api/produtos/${id}`, { headers: apiHeaders });
    
    if (!response.ok) throw new Error('Erro ao carregar produto');
    
    const produto = await response.json();
    const form = $('#form-produto');
    
    if (!form) return;
    
    // Carregar departamentos primeiro
    const depSelect = $('#prod-departamento');
    if (depSelect) {
      const depResponse = await fetch('/api/departamentos', { headers: apiHeaders });
      if (depResponse.ok) {
        const departamentos = await depResponse.json();
        depSelect.innerHTML = '<option value="">Todos os departamentos</option>';
        departamentos.filter(d => d.ativo).forEach(dep => {
          const opt = document.createElement('option');
          opt.value = dep.id;
          opt.textContent = dep.nome;
          depSelect.appendChild(opt);
        });
        
        // Selecionar departamento do produto se tiver
        if (produto.departamento_id) {
          depSelect.value = produto.departamento_id;
        }
      }
    }
    
    // Carregar seções (filtradas por departamento se tiver)
    const catSelect = $('#prod-categoria');
    if (catSelect) {
      try {
        const url = produto.departamento_id 
          ? `/api/secoes?departamento_id=${produto.departamento_id}`
          : '/api/secoes';
        
        const secoesResponse = await fetch(url, { headers: apiHeaders });
        if (secoesResponse.ok) {
          const secoes = await secoesResponse.json();
          catSelect.innerHTML = '<option value="">Selecione...</option>';
          secoes.forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec.id;
            opt.textContent = sec.departamento_nome ? `${sec.nome} (${sec.departamento_nome})` : sec.nome;
            catSelect.appendChild(opt);
          });
          
          // Selecionar a seção do produto
          if (produto.categoria_id) {
            catSelect.value = produto.categoria_id;
          }
        }
      } catch (error) {
        console.error('Erro ao carregar seções:', error);
      }
    }
    
    // Preencher formulário com dados do produto
    Object.keys(produto).forEach(key => {
      let input = form.querySelector(`[name="${key}"]`);
      if (input && produto[key] !== null && produto[key] !== undefined) {
        input.value = produto[key];
      }
    });

    const modal = $('#modal-produto');
    const modalTitle = $('#modal-produto .modal-title');
    
    if (modal) modal.classList.add('active');
    if (modalTitle) modalTitle.textContent = 'Editar Produto';
    
    // Marcar formulário como edição
    form.setAttribute('data-editing-id', id);

  } catch (error) {
    console.error('Erro ao carregar produto:', error);
    showMessage('Erro ao carregar produto', 'error');
  }
}

async function excluirProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;

  try {
    const response = await fetch(`/api/produtos/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir produto');
    }

    showMessage('Produto excluído com sucesso!', 'success');
    loadProdutos();

  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    showMessage(error.message, 'error');
  }
}

async function editarCliente(id) {
  try {
    const response = await fetch(`/api/clientes/${id}`, { headers: apiHeaders });
    
    if (!response.ok) throw new Error('Erro ao carregar cliente');
    
    const cliente = await response.json();
    const form = $('#form-cliente');
    
    if (!form) return;
    
    // Carregar vendedores primeiro
    await carregarVendedores();
    
    // Preencher formulário com dados do cliente
    Object.keys(cliente).forEach(key => {
      let input = form.querySelector(`[name="${key}"]`);
      if (input && cliente[key] !== null && cliente[key] !== undefined) {
        input.value = cliente[key];
      }
    });
    
    // Preencher vendedor
    if (cliente.vendedor_id) {
      const vendedorSelect = $('#vendedor');
      if (vendedorSelect) vendedorSelect.value = cliente.vendedor_id;
    }

    const modal = $('#modal-cliente');
    const modalTitle = $('#modal-cliente .modal-title');
    
    if (modal) modal.classList.add('active');
    if (modalTitle) modalTitle.textContent = 'Editar Cliente';
    
    // Marcar formulário como edição
    form.setAttribute('data-editing-id', id);

  } catch (error) {
    console.error('Erro ao carregar cliente:', error);
    showMessage('Erro ao carregar cliente', 'error');
  }
}

async function excluirCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
  
  try {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir cliente');
    }

    showMessage('Cliente excluído com sucesso!', 'success');
    loadClientes();

  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    showMessage(error.message, 'error');
  }
}

// Fornecedores
async function loadFornecedores() {
  try {
    console.log('Carregando fornecedores...');
    const response = await fetch('/api/fornecedores', { headers: apiHeaders });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Token inválido, redirecionando para login');
        window.location.href = '/';
        return;
      }
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Dados recebidos:', data);
    
    renderFornecedoresTable(data.fornecedores || data);
    
  } catch (error) {
    console.error('Erro ao carregar fornecedores:', error);
    showMessage('Erro ao carregar fornecedores: ' + error.message, 'error');
  }
}

function renderFornecedoresTable(fornecedores) {
  const tbody = $('#fornecedores-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!fornecedores || fornecedores.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="9" class="text-center">Nenhum fornecedor encontrado</td>';
    tbody.appendChild(row);
    return;
  }
  
  fornecedores.forEach(fornecedor => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${fornecedor.codigo || 'N/A'}</td>
      <td>${fornecedor.razao_social || 'N/A'}</td>
      <td>${fornecedor.nome_fantasia || 'N/A'}</td>
      <td>${fornecedor.cnpj || 'N/A'}</td>
      <td>${fornecedor.telefone || 'N/A'}</td>
      <td>${fornecedor.email || 'N/A'}</td>
      <td>${fornecedor.cidade || 'N/A'}</td>
      <td><span class="status ${fornecedor.ativo ? 'active' : 'inactive'}">${fornecedor.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarFornecedor(${fornecedor.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="excluirFornecedor(${fornecedor.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function abrirModalFornecedor(fornecedor = null) {
  console.log('Abrindo modal de fornecedor:', fornecedor);
  
  const modal = $('#modal-fornecedor');
  const form = $('#form-fornecedor');
  
  if (!modal || !form) {
    console.error('Modal ou formulário não encontrado');
    return;
  }
  
  // Resetar formulário
  form.reset();
  
  // Se for edição, preencher dados
  if (fornecedor) {
    console.log('Preenchendo dados do fornecedor:', fornecedor);
    
    // Preencher todos os campos - Aba 1
    if (form.querySelector('#forn-razao')) form.querySelector('#forn-razao').value = fornecedor.razao_social || '';
    if (form.querySelector('#forn-fantasia')) form.querySelector('#forn-fantasia').value = fornecedor.nome_fantasia || '';
    if (form.querySelector('#forn-cnpj')) form.querySelector('#forn-cnpj').value = fornecedor.cnpj || '';
    if (form.querySelector('#forn-ie')) form.querySelector('#forn-ie').value = fornecedor.inscricao_estadual || '';
    if (form.querySelector('#ativo')) form.querySelector('#ativo').value = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? 'true' : 'false';
    
    // Aba 2 - Endereço
    if (form.querySelector('#forn-cep')) form.querySelector('#forn-cep').value = fornecedor.cep || '';
    if (form.querySelector('#forn-endereco')) form.querySelector('#forn-endereco').value = fornecedor.endereco || '';
    if (form.querySelector('#forn-numero')) form.querySelector('#forn-numero').value = fornecedor.numero || '';
    if (form.querySelector('#forn-complemento')) form.querySelector('#forn-complemento').value = fornecedor.complemento || '';
    if (form.querySelector('#forn-bairro')) form.querySelector('#forn-bairro').value = fornecedor.bairro || '';
    if (form.querySelector('#forn-cidade')) form.querySelector('#forn-cidade').value = fornecedor.cidade || '';
    if (form.querySelector('#forn-estado')) form.querySelector('#forn-estado').value = fornecedor.estado || '';
    
    // Aba 3 - Contatos
    if (form.querySelector('#forn-telefone')) form.querySelector('#forn-telefone').value = fornecedor.telefone || '';
    if (form.querySelector('#forn-celular')) form.querySelector('#forn-celular').value = fornecedor.celular || '';
    if (form.querySelector('#forn-email')) form.querySelector('#forn-email').value = fornecedor.email || '';
    if (form.querySelector('#forn-contato')) form.querySelector('#forn-contato').value = fornecedor.contato || '';
    
    // Armazenar ID para edição
    form.dataset.fornecedorId = fornecedor.id;
    
    // Atualizar título do modal
    modal.querySelector('.modal-title').textContent = 'Editar Fornecedor';
  } else {
    // Remover ID se for criação
    delete form.dataset.fornecedorId;
    
    // Atualizar título do modal
    modal.querySelector('.modal-title').textContent = 'Novo Fornecedor';
  }
  
  modal.style.display = 'flex';
}

// Função para processar o formulário de fornecedor
async function processarFormularioFornecedor(form) {
  console.log('=== PROCESSANDO FORMULÁRIO DE FORNECEDOR ===');
  
  const formData = new FormData(form);
  const fornecedorData = {};
  
  // Coletar dados do formulário
  for (let [key, value] of formData.entries()) {
    if (key === 'ativo') {
      fornecedorData[key] = value === 'true';
    } else {
      fornecedorData[key] = value;
    }
  }
  
  console.log('Dados do formulário:', fornecedorData);
  
  const isEditing = form.dataset.fornecedorId;
  const url = isEditing ? `/api/fornecedores/${form.dataset.fornecedorId}` : '/api/fornecedores';
  const method = isEditing ? 'PUT' : 'POST';
  
  console.log('URL:', url);
  console.log('Method:', method);
  console.log('Headers:', apiHeaders);
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: apiHeaders,
      body: JSON.stringify(fornecedorData)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro do servidor:', errorData);
      throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Resposta do servidor:', result);
    
    showMessage(`Fornecedor ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, 'success');
    fecharModal('modal-fornecedor');
    const modal = $('#modal-fornecedor');
    if (modal) {
      modal.style.display = 'none';
    }
    form.reset();
    loadFornecedores();
    
  } catch (error) {
    console.error('Erro ao salvar fornecedor:', error);
    showMessage(error.message, 'error');
  }
}

async function editarFornecedor(id) {
  try {
    const response = await fetch(`/api/fornecedores/${id}`, { headers: apiHeaders });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar fornecedor');
    }
    
    const fornecedor = await response.json();
    abrirModalFornecedor(fornecedor);
    
  } catch (error) {
    console.error('Erro ao editar fornecedor:', error);
    showMessage(error.message, 'error');
  }
}

async function excluirFornecedor(id) {
  if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;
  
  try {
    const response = await fetch(`/api/fornecedores/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir fornecedor');
    }

    showMessage('Fornecedor excluído com sucesso!', 'success');
    loadFornecedores();

  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    showMessage(error.message, 'error');
  }
}

// Busca de produtos
const produtosSearch = $('#produtos-search');
if (produtosSearch) {
  produtosSearch.addEventListener('input', debounce(async (e) => {
    const search = e.target.value;
    try {
      const response = await fetch(`/api/produtos?search=${encodeURIComponent(search)}`, { 
        headers: apiHeaders 
      });
      
      if (!response.ok) throw new Error('Erro na busca');
      
      const data = await response.json();
      renderProdutosTable(data.produtos);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  }, 500));
}

// Busca de clientes
const clientesSearch = $('#clientes-search');
if (clientesSearch) {
  clientesSearch.addEventListener('input', debounce(async (e) => {
    const search = e.target.value;
    try {
      const response = await fetch(`/api/clientes?search=${encodeURIComponent(search)}`, { 
        headers: apiHeaders 
      });
      
      if (!response.ok) throw new Error('Erro na busca');
      
      const data = await response.json();
      renderClientesTable(data.clientes);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  }, 500));
}

// Busca de fornecedores
const fornecedoresSearch = $('#fornecedores-search');
if (fornecedoresSearch) {
  fornecedoresSearch.addEventListener('input', debounce(async (e) => {
    const search = e.target.value;
    try {
      const response = await fetch(`/api/fornecedores?search=${encodeURIComponent(search)}`, { 
        headers: apiHeaders 
      });
      
      if (!response.ok) throw new Error('Erro na busca');
      
      const data = await response.json();
      renderFornecedoresTable(data.fornecedores);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  }, 500));
}

// Utilitários
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showMessage(message, type = 'success') {
  // Criar notificação simples
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 1001;
    padding: 12px 16px; border-radius: 8px; color: white; font-weight: 600;
    background: ${type === 'success' ? '#65f3b8' : '#ff7a7a'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Carregar página inicial
loadDashboard();

// Expor funções globalmente para serem usadas no HTML inline
window.abrirModalProduto = abrirModalProduto;
window.abrirModalCliente = abrirModalCliente;
window.fecharModal = fecharModal;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
window.carregarCategorias = carregarCategorias;
window.adicionarDepartamento = adicionarDepartamento;
window.adicionarCategoria = adicionarCategoria;
// Funções de Vendedores
window.abrirModalVendedor = abrirModalVendedor;
window.editarVendedor = editarVendedor;
window.excluirVendedor = excluirVendedor;
window.carregarVendedores = carregarVendedores;
window.adicionarVendedor = adicionarVendedor;
window.toggleCamposPessoa = toggleCamposPessoa;
window.abrirModalVenda = abrirModalVenda;

// Atalho: abrir página de Tributação com prévia preenchida para um produto
function abrirPreviewTributacao(produtoId){
  try {
    // Navega para a página de Tributação
    showPage('tributacao');
    // Preenche o campo e dispara o teste
    const input = document.querySelector('#trib-prev-prod-id');
    const inputNcm = document.querySelector('#trib-prev-ncm');
    const btn = document.querySelector('#btn-trib-prev-testar');
    if (input) input.value = String(produtoId || '');
    if (inputNcm) inputNcm.value = '';
    // Pequeno timeout para garantir que a página ficou visível/renderizada
    setTimeout(() => { if (btn) btn.click(); }, 50);
  } catch (e) {
    console.warn('Falha ao abrir prévia de tributação:', e);
  }
}
window.abrirPreviewTributacao = abrirPreviewTributacao;

// Funções do módulo de vendas
function abrirModalVenda() {
  const modal = document.getElementById('modal-venda');
  const form = document.getElementById('form-venda');
  
  if (modal && form) {
    form.reset();
    vendaAtual = {
      itens: [],
      subtotal: 0,
      desconto_geral: 0,
      valor_frete: 0,
      valor_despesas: 0,
      valor_total: 0
    };
    produtosSelecionados = new Set();
    
    // Carregar dados necessários
    carregarClientes();
    carregarVendedores();
    carregarCondicoesPagamento();
    carregarFormasPagamento();
    carregarProdutos();
    
    // Limpar tabela de itens
    const tbody = document.querySelector('#itens-table tbody');
    if (tbody) tbody.innerHTML = '';
    
    // Resetar totais
    document.getElementById('subtotal').textContent = 'R$ 0,00';
    document.getElementById('valor-total').textContent = 'R$ 0,00';
    
    // Definir data atual
    const hoje = new Date().toISOString().split('T')[0];
    const dataInput = form.querySelector('[name="data_venda"]');
    if (dataInput) dataInput.value = hoje;
    
    modal.style.display = 'flex';
  }
}

window.abrirModalVenda = abrirModalVenda;

// Funções de Vendedores
function abrirModalVendedor(vendedor = null) {
  console.log('🔍 abrirModalVendedor chamada com:', vendedor);
  const modal = $('#modal-vendedor');
  const form = $('#form-vendedor');
  
  if (!modal || !form) {
    console.error('❌ Modal ou form não encontrado!');
    return;
  }
  
  form.reset();
  
  if (vendedor) {
    form.querySelector('#nome').value = vendedor.nome || '';
    form.querySelector('#cpf').value = vendedor.cpf || '';
    form.querySelector('#telefone').value = vendedor.telefone || '';
    form.querySelector('#email').value = vendedor.email || '';
    form.querySelector('#endereco').value = vendedor.endereco || '';
    form.querySelector('#comissao_padrao').value = vendedor.comissao_padrao || 2.5;
    form.querySelector('#ativo').value = vendedor.ativo ? 'true' : 'false';
    
    form.dataset.vendedorId = vendedor.id;
    modal.querySelector('.modal-title').textContent = 'Editar Vendedor';
  } else {
    delete form.dataset.vendedorId;
    modal.querySelector('.modal-title').textContent = 'Novo Vendedor';
  }
  
  modal.style.display = 'flex';
  console.log('✅ Modal aberto!');
}

// Garantir que a função está no escopo global
window.abrirModalVendedor = abrirModalVendedor;

async function loadVendedores() {
  try {
    console.log('Carregando vendedores...');
    const response = await fetch('/api/vendedores', { headers: apiHeaders });
    
    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/';
        return;
      }
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Dados recebidos:', data);
    
    if (!data || (!data.vendedores && !Array.isArray(data))) {
      console.error('Dados inválidos recebidos:', data);
      throw new Error('Formato de dados inválido recebido do servidor');
    }
    
    const vendedores = data.vendedores || data;
    console.log(`Renderizando ${vendedores.length} vendedores`);
    
    renderVendedoresTable(vendedores);
    
  } catch (error) {
    console.error('Erro ao carregar vendedores:', error);
    showMessage('Erro ao carregar vendedores: ' + error.message, 'error');
  }
}

function renderVendedoresTable(vendedores) {
  const tbody = $('#vendedores-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!vendedores || vendedores.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="8" class="text-center">Nenhum vendedor encontrado</td>';
    tbody.appendChild(row);
    return;
  }
  
  vendedores.forEach(vendedor => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${vendedor.codigo || 'N/A'}</td>
      <td>${vendedor.nome || 'N/A'}</td>
      <td>${vendedor.cpf || 'N/A'}</td>
      <td>${vendedor.telefone || 'N/A'}</td>
      <td>${vendedor.email || 'N/A'}</td>
      <td>${parseFloat(vendedor.comissao_padrao || 0).toFixed(2)}%</td>
      <td><span class="status ${vendedor.ativo ? 'active' : 'inactive'}">${vendedor.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarVendedor(${vendedor.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="excluirVendedor(${vendedor.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function processarFormularioVendedor(form) {
  const formData = new FormData(form);
  const vendedorData = {};
  
  for (let [key, value] of formData.entries()) {
    if (key === 'ativo') {
      vendedorData[key] = value === 'true';
    } else if (key === 'comissao_padrao') {
      vendedorData[key] = parseFloat(value);
    } else {
      vendedorData[key] = value;
    }
  }
  
  const isEditing = form.dataset.vendedorId;
  const url = isEditing ? `/api/vendedores/${form.dataset.vendedorId}` : '/api/vendedores';
  const method = isEditing ? 'PUT' : 'POST';
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: apiHeaders,
      body: JSON.stringify(vendedorData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    showMessage(`Vendedor ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, 'success');
    document.getElementById('modal-vendedor').style.display = 'none';
    loadVendedores();
    
  } catch (error) {
    console.error('Erro ao salvar vendedor:', error);
    showMessage(error.message, 'error');
  }
}

async function editarVendedor(id) {
  try {
    const response = await fetch(`/api/vendedores/${id}`, { headers: apiHeaders });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar vendedor');
    }
    
    const vendedor = await response.json();
    abrirModalVendedor(vendedor);
    
  } catch (error) {
    console.error('Erro ao editar vendedor:', error);
    showMessage(error.message, 'error');
  }
}

// Garantir que a função está no escopo global
window.editarVendedor = editarVendedor;

async function excluirVendedor(id) {
  if (!confirm('Tem certeza que deseja excluir este vendedor?')) return;
  
  try {
    const response = await fetch(`/api/vendedores/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir vendedor');
    }

    showMessage('Vendedor excluído com sucesso!', 'success');
    loadVendedores();

  } catch (error) {
    console.error('Erro ao excluir vendedor:', error);
    showMessage(error.message, 'error');
  }
}

// Garantir que a função está no escopo global
window.excluirVendedor = excluirVendedor;

// Event listener para o formulário de vendedor
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM carregado - configurando event listeners...');
  
  const formVendedor = $('#form-vendedor');
  if (formVendedor) {
    formVendedor.addEventListener('submit', async (e) => {
      e.preventDefault();
      await processarFormularioVendedor(e.target);
    });
    console.log('✅ Event listener do form-vendedor configurado');
  }
  
  // Event listener para o botão Novo Vendedor
  const btnNovoVendedor = $('#btn-novo-vendedor');
  if (btnNovoVendedor) {
    btnNovoVendedor.addEventListener('click', function() {
      console.log('🔘 Botão Novo Vendedor clicado!');
      abrirModalVendedor();
    });
    console.log('✅ Event listener do btn-novo-vendedor configurado');
  } else {
    console.warn('⚠️ Botão #btn-novo-vendedor não encontrado!');
  }

  // Botão atalho "Abrir Prévia" na página de Produtos
  const btnOpenTribPrev = document.getElementById('btn-open-trib-prev');
  if (btnOpenTribPrev) {
    btnOpenTribPrev.addEventListener('click', () => {
      const val = document.getElementById('prod-prev-id-shortcut')?.value?.trim();
      if (!val) {
        showMessage('Informe o ID do produto para abrir a prévia', 'error');
        return;
      }
      abrirPreviewTributacao(parseInt(val, 10));
    });
  }
});