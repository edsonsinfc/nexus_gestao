// categorias-produtos.js
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

const apiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let departamentosData = [];
let secoesData = [];
let categoriasData = [];

// ============= NAVEGAÇÃO TABS =============
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(`${tab}-section`).classList.add('active');
  
  if (tab === 'departamentos') carregarDepartamentos();
  if (tab === 'secoes') carregarSecoes();
  if (tab === 'categorias') carregarCategorias();
}

// ============= MENSAGENS =============
function showMessage(text, type = 'success') {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = `message ${type} show`;
  setTimeout(() => msg.classList.remove('show'), 5000);
}

// ============= DEPARTAMENTOS =============
async function carregarDepartamentos() {
  try {
    const response = await fetch('/api/departamentos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar departamentos');
    
    departamentosData = await response.json();
    renderizarDepartamentos(departamentosData);
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao carregar departamentos', 'error');
  }
}

function renderizarDepartamentos(data) {
  const tbody = document.querySelector('#table-departamentos tbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-state-icon">📁</div><p>Nenhum departamento cadastrado</p></td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(dep => `
    <tr>
      <td>${dep.id}</td>
      <td>${dep.nome}</td>
      <td>
        <span class="badge ${dep.ativo ? 'badge-success' : 'badge-danger'}">
          ${dep.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td class="action-buttons">
        <button class="btn btn-warning btn-icon" onclick="editarDepartamento(${dep.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-icon" onclick="excluirDepartamento(${dep.id})">🗑️ Excluir</button>
      </td>
    </tr>
  `).join('');
}

function abrirModalDepartamento(id = null) {
  const modal = document.getElementById('modal-departamento');
  const title = document.getElementById('modal-departamento-title');
  const form = document.getElementById('form-departamento');
  
  form.reset();
  document.getElementById('departamento-id').value = '';
  document.getElementById('departamento-ativo').checked = true;
  
  if (id) {
    title.textContent = 'Editar Departamento';
    const dep = departamentosData.find(d => d.id === id);
    if (dep) {
      document.getElementById('departamento-id').value = dep.id;
      document.getElementById('departamento-nome').value = dep.nome;
      document.getElementById('departamento-ativo').checked = dep.ativo === 1;
    }
  } else {
    title.textContent = 'Novo Departamento';
  }
  
  modal.classList.add('show');
}

async function salvarDepartamento(event) {
  event.preventDefault();
  
  const id = document.getElementById('departamento-id').value;
  const nome = document.getElementById('departamento-nome').value.trim();
  const ativo = document.getElementById('departamento-ativo').checked ? 1 : 0;
  
  try {
    const url = id ? `/api/departamentos/${id}` : '/api/departamentos';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: apiHeaders,
      body: JSON.stringify({ nome, ativo })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar');
    }
    
    showMessage(id ? 'Departamento atualizado!' : 'Departamento criado!', 'success');
    fecharModal('departamento');
    carregarDepartamentos();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

function editarDepartamento(id) {
  abrirModalDepartamento(id);
}

async function excluirDepartamento(id) {
  if (!confirm('Deseja realmente excluir este departamento?')) return;
  
  try {
    const response = await fetch(`/api/departamentos/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir');
    }
    
    showMessage('Departamento excluído!', 'success');
    carregarDepartamentos();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

// ============= SEÇÕES =============
async function carregarSecoes() {
  try {
    const response = await fetch('/api/secoes', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar seções');
    
    secoesData = await response.json();
    renderizarSecoes(secoesData);
    await carregarDepartamentosParaSelect();
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao carregar seções', 'error');
  }
}

function renderizarSecoes(data) {
  const tbody = document.querySelector('#table-secoes tbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-state-icon">📂</div><p>Nenhuma seção cadastrada</p></td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(sec => `
    <tr>
      <td>${sec.id}</td>
      <td>${sec.nome}</td>
      <td>${sec.departamento_nome || '-'}</td>
      <td class="action-buttons">
        <button class="btn btn-warning btn-icon" onclick="editarSecao(${sec.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-icon" onclick="excluirSecao(${sec.id})">🗑️ Excluir</button>
      </td>
    </tr>
  `).join('');
}

function abrirModalSecao(id = null) {
  const modal = document.getElementById('modal-secao');
  const title = document.getElementById('modal-secao-title');
  const form = document.getElementById('form-secao');
  
  form.reset();
  document.getElementById('secao-id').value = '';
  
  if (id) {
    title.textContent = 'Editar Seção';
    const sec = secoesData.find(s => s.id === id);
    if (sec) {
      document.getElementById('secao-id').value = sec.id;
      document.getElementById('secao-nome').value = sec.nome;
      document.getElementById('secao-departamento').value = sec.departamento_id || '';
    }
  } else {
    title.textContent = 'Nova Seção';
  }
  
  modal.classList.add('show');
}

async function salvarSecao(event) {
  event.preventDefault();
  
  const id = document.getElementById('secao-id').value;
  const nome = document.getElementById('secao-nome').value.trim();
  const departamento_id = document.getElementById('secao-departamento').value || null;
  
  try {
    const url = id ? `/api/secoes/${id}` : '/api/secoes';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: apiHeaders,
      body: JSON.stringify({ nome, departamento_id })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar');
    }
    
    showMessage(id ? 'Seção atualizada!' : 'Seção criada!', 'success');
    fecharModal('secao');
    carregarSecoes();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

function editarSecao(id) {
  abrirModalSecao(id);
}

async function excluirSecao(id) {
  if (!confirm('Deseja realmente excluir esta seção?')) return;
  
  try {
    const response = await fetch(`/api/secoes/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir');
    }
    
    showMessage('Seção excluída!', 'success');
    carregarSecoes();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

// ============= CATEGORIAS =============
async function carregarCategorias() {
  try {
    const response = await fetch('/api/categorias', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar categorias');
    
    categoriasData = await response.json();
    renderizarCategorias(categoriasData);
    await carregarDepartamentosParaSelect();
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao carregar categorias', 'error');
  }
}

function renderizarCategorias(data) {
  const tbody = document.querySelector('#table-categorias tbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">🏷️</div><p>Nenhuma categoria cadastrada</p></td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(cat => `
    <tr>
      <td>${cat.id}</td>
      <td>${cat.nome}</td>
      <td>${cat.departamento_nome || '-'}</td>
      <td>
        <span class="badge ${cat.ativo ? 'badge-success' : 'badge-danger'}">
          ${cat.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td class="action-buttons">
        <button class="btn btn-warning btn-icon" onclick="editarCategoria(${cat.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-icon" onclick="excluirCategoria(${cat.id})">🗑️ Excluir</button>
      </td>
    </tr>
  `).join('');
}

function abrirModalCategoria(id = null) {
  const modal = document.getElementById('modal-categoria');
  const title = document.getElementById('modal-categoria-title');
  const form = document.getElementById('form-categoria');
  
  form.reset();
  document.getElementById('categoria-id').value = '';
  document.getElementById('categoria-ativo').checked = true;
  
  if (id) {
    title.textContent = 'Editar Categoria';
    const cat = categoriasData.find(c => c.id === id);
    if (cat) {
      document.getElementById('categoria-id').value = cat.id;
      document.getElementById('categoria-nome').value = cat.nome;
      document.getElementById('categoria-departamento').value = cat.departamento_id || '';
      document.getElementById('categoria-ativo').checked = cat.ativo === 1;
    }
  } else {
    title.textContent = 'Nova Categoria';
  }
  
  modal.classList.add('show');
}

async function salvarCategoria(event) {
  event.preventDefault();
  
  const id = document.getElementById('categoria-id').value;
  const nome = document.getElementById('categoria-nome').value.trim();
  const departamento_id = document.getElementById('categoria-departamento').value || null;
  const ativo = document.getElementById('categoria-ativo').checked ? 1 : 0;
  
  try {
    const url = id ? `/api/categorias/${id}` : '/api/categorias';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: apiHeaders,
      body: JSON.stringify({ nome, departamento_id, ativo })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar');
    }
    
    showMessage(id ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
    fecharModal('categoria');
    carregarCategorias();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

function editarCategoria(id) {
  abrirModalCategoria(id);
}

async function excluirCategoria(id) {
  if (!confirm('Deseja realmente excluir esta categoria?')) return;
  
  try {
    const response = await fetch(`/api/categorias/${id}`, {
      method: 'DELETE',
      headers: apiHeaders
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir');
    }
    
    showMessage('Categoria excluída!', 'success');
    carregarCategorias();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

// ============= HELPERS =============
async function carregarDepartamentosParaSelect() {
  try {
    const response = await fetch('/api/departamentos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar departamentos');
    
    const departamentos = await response.json();
    const selectSecao = document.getElementById('secao-departamento');
    const selectCategoria = document.getElementById('categoria-departamento');
    
    const options = departamentos
      .filter(d => d.ativo)
      .map(d => `<option value="${d.id}">${d.nome}</option>`)
      .join('');
    
    selectSecao.innerHTML = '<option value="">Sem departamento</option>' + options;
    selectCategoria.innerHTML = '<option value="">Sem departamento</option>' + options;
  } catch (error) {
    console.error('Erro ao carregar departamentos:', error);
  }
}

function fecharModal(tipo) {
  document.getElementById(`modal-${tipo}`).classList.remove('show');
}

// Fechar modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
});

// Busca
document.getElementById('search-departamentos').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = departamentosData.filter(d => 
    d.nome.toLowerCase().includes(term)
  );
  renderizarDepartamentos(filtered);
});

document.getElementById('search-secoes').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = secoesData.filter(s => 
    s.nome.toLowerCase().includes(term) ||
    (s.departamento_nome && s.departamento_nome.toLowerCase().includes(term))
  );
  renderizarSecoes(filtered);
});

document.getElementById('search-categorias').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = categoriasData.filter(c => 
    c.nome.toLowerCase().includes(term) ||
    (c.departamento_nome && c.departamento_nome.toLowerCase().includes(term))
  );
  renderizarCategorias(filtered);
});

// Inicializar
carregarDepartamentos();
