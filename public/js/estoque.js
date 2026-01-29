// estoque.js
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

const apiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let produtosData = [];
let movimentacoesData = [];
let filtroEstoqueBaixo = false;

// ============= NAVEGAÇÃO =============
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(`${tab}-section`).classList.add('active');
  
  if (tab === 'produtos') carregarProdutos();
  if (tab === 'movimentacoes') carregarMovimentacoes();
}

// ============= MENSAGENS =============
function showMessage(text, type = 'success') {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = `message ${type} show`;
  setTimeout(() => msg.classList.remove('show'), 5000);
}

// ============= ESTATÍSTICAS =============
async function carregarEstatisticas() {
  try {
    const response = await fetch('/api/estoque/relatorio', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar estatísticas');
    
    const stats = await response.json();
    
    document.getElementById('stat-total').textContent = stats.total_produtos || 0;
    document.getElementById('stat-baixo').textContent = stats.produtos_estoque_baixo || 0;
    document.getElementById('stat-zerado').textContent = stats.produtos_sem_estoque || 0;
    document.getElementById('stat-valor').textContent = 'R$ ' + (parseFloat(stats.valor_total_estoque) || 0).toFixed(2);
  } catch (error) {
    console.error('Erro:', error);
  }
}

// ============= PRODUTOS =============
async function carregarProdutos() {
  try {
    const busca = document.getElementById('search-produtos').value;
    let url = `/api/estoque/produtos?busca=${busca}`;
    
    if (filtroEstoqueBaixo) {
      url += '&estoque_baixo=true';
    }
    
    const response = await fetch(url, { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar produtos');
    
    produtosData = await response.json();
    renderizarProdutos(produtosData);
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao carregar produtos', 'error');
  }
}

function renderizarProdutos(data) {
  const tbody = document.querySelector('#table-produtos tbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhum produto encontrado</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(prod => {
    const estoqueAtual = parseFloat(prod.estoque_atual) || 0;
    const estoqueMinimo = parseFloat(prod.estoque_minimo) || 0;
    const estoqueMaximo = parseFloat(prod.estoque_maximo) || 0;
    
    let badgeEstoque = '';
    if (estoqueAtual === 0) {
      badgeEstoque = '<span class="badge badge-danger">ZERADO</span>';
    } else if (estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo) {
      badgeEstoque = '<span class="badge badge-warning">BAIXO</span>';
    } else {
      badgeEstoque = '<span class="badge badge-success">OK</span>';
    }
    
    return `
      <tr>
        <td>${prod.codigo_principal}</td>
        <td>${prod.descricao}</td>
        <td>${prod.categoria_nome || '-'}</td>
        <td>${prod.unidade}</td>
        <td>
          <strong>${estoqueAtual.toFixed(3)}</strong>
          ${badgeEstoque}
        </td>
        <td>${estoqueMinimo.toFixed(3)}</td>
        <td>${estoqueMaximo > 0 ? estoqueMaximo.toFixed(3) : '-'}</td>
        <td>${prod.localizacao || '-'}</td>
        <td>
          <button class="btn btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="movimentacaoRapida(${prod.id}, 'ENTRADA')">
            ➕
          </button>
          <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="movimentacaoRapida(${prod.id}, 'SAIDA')">
            ➖
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarEstoqueBaixo() {
  filtroEstoqueBaixo = !filtroEstoqueBaixo;
  event.target.textContent = filtroEstoqueBaixo ? '✓ Estoque Baixo' : '⚠️ Estoque Baixo';
  carregarProdutos();
}

// Busca em tempo real
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-produtos');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchInput.timeout);
      searchInput.timeout = setTimeout(carregarProdutos, 300);
    });
  }
});

// ============= MOVIMENTAÇÕES =============
async function carregarMovimentacoes() {
  try {
    const tipo = document.getElementById('filtro-tipo').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    
    let url = '/api/estoque/movimentacoes?limit=100';
    if (tipo) url += `&tipo=${tipo}`;
    if (dataInicio) url += `&data_inicio=${dataInicio}`;
    if (dataFim) url += `&data_fim=${dataFim}`;
    
    const response = await fetch(url, { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar movimentações');
    
    const data = await response.json();
    movimentacoesData = data.movimentacoes;
    renderizarMovimentacoes(movimentacoesData);
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao carregar movimentações', 'error');
  }
}

function renderizarMovimentacoes(data) {
  const tbody = document.querySelector('#table-movimentacoes tbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma movimentação encontrada</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(mov => {
    const data = new Date(mov.data_movimentacao);
    const dataFormatada = data.toLocaleString('pt-BR');
    
    let badgeTipo = '';
    if (mov.tipo.includes('ENTRADA') || mov.tipo === 'DEVOLUCAO') {
      badgeTipo = '<span class="badge badge-success">' + formatarTipo(mov.tipo) + '</span>';
    } else if (mov.tipo.includes('SAIDA') || mov.tipo === 'PERDA') {
      badgeTipo = '<span class="badge badge-danger">' + formatarTipo(mov.tipo) + '</span>';
    } else {
      badgeTipo = '<span class="badge badge-info">' + formatarTipo(mov.tipo) + '</span>';
    }
    
    return `
      <tr>
        <td>${dataFormatada}</td>
        <td>
          <strong>${mov.codigo_principal}</strong><br>
          <small>${mov.produto_descricao}</small>
        </td>
        <td>${badgeTipo}</td>
        <td><strong>${parseFloat(mov.quantidade).toFixed(3)}</strong></td>
        <td>${parseFloat(mov.estoque_anterior).toFixed(3)}</td>
        <td>${parseFloat(mov.estoque_novo).toFixed(3)}</td>
        <td>${mov.motivo || '-'}<br><small>${mov.observacao || ''}</small></td>
        <td>${mov.usuario_nome || '-'}</td>
      </tr>
    `;
  }).join('');
}

function formatarTipo(tipo) {
  const tipos = {
    'ENTRADA': '➕ Entrada',
    'SAIDA': '➖ Saída',
    'AJUSTE_ENTRADA': '⬆️ Ajuste +',
    'AJUSTE_SAIDA': '⬇️ Ajuste -',
    'DEVOLUCAO': '↩️ Devolução',
    'PERDA': '❌ Perda',
    'TRANSFERENCIA': '🔄 Transferência'
  };
  return tipos[tipo] || tipo;
}

function limparFiltros() {
  document.getElementById('filtro-tipo').value = '';
  document.getElementById('filtro-data-inicio').value = '';
  document.getElementById('filtro-data-fim').value = '';
  carregarMovimentacoes();
}

// ============= MODAL MOVIMENTAÇÃO =============
function abrirModalMovimentacao(tipo) {
  document.getElementById('modal-movimentacao').classList.add('show');
  document.getElementById('form-movimentacao').reset();
  
  const titleMap = {
    'ENTRADA': '➕ Nova Entrada de Estoque',
    'SAIDA': '➖ Nova Saída de Estoque',
    'AJUSTE': '⚙️ Ajuste de Estoque'
  };
  
  document.getElementById('modal-title').textContent = titleMap[tipo] || 'Nova Movimentação';
  document.getElementById('mov-tipo').value = tipo;
  
  // Mostrar/ocultar tipo de ajuste
  const groupAjuste = document.getElementById('group-tipo-ajuste');
  if (tipo === 'AJUSTE') {
    groupAjuste.style.display = 'block';
  } else {
    groupAjuste.style.display = 'none';
  }
  
  // Carregar produtos
  carregarProdutosModal();
  
  // Carregar motivos
  carregarMotivos(tipo);
}

function movimentacaoRapida(produtoId, tipo) {
  abrirModalMovimentacao(tipo);
  setTimeout(() => {
    document.getElementById('mov-produto').value = produtoId;
  }, 500);
}

async function carregarProdutosModal() {
  try {
    const response = await fetch('/api/estoque/produtos', { headers: apiHeaders });
    if (!response.ok) throw new Error('Erro ao carregar produtos');
    
    const produtos = await response.json();
    const select = document.getElementById('mov-produto');
    
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    produtos.forEach(prod => {
      const opt = document.createElement('option');
      opt.value = prod.id;
      opt.textContent = `${prod.codigo_principal} - ${prod.descricao} (Estoque: ${parseFloat(prod.estoque_atual).toFixed(3)})`;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Erro:', error);
  }
}

function carregarMotivos(tipo) {
  const select = document.getElementById('mov-motivo');
  select.innerHTML = '<option value="">Selecione...</option>';
  
  let motivos = [];
  
  if (tipo === 'ENTRADA') {
    motivos = ['Compra', 'Doação', 'Produção', 'Devolução de cliente', 'Outros'];
  } else if (tipo === 'SAIDA') {
    motivos = ['Venda', 'Uso interno', 'Doação', 'Amostra', 'Perda', 'Outros'];
  } else if (tipo === 'AJUSTE') {
    motivos = ['Inventário', 'Correção de lançamento', 'Avaria', 'Validade vencida', 'Roubo', 'Outros'];
  }
  
  motivos.forEach(motivo => {
    const opt = document.createElement('option');
    opt.value = motivo;
    opt.textContent = motivo;
    select.appendChild(opt);
  });
}

async function salvarMovimentacao(event) {
  event.preventDefault();
  
  let tipo = document.getElementById('mov-tipo').value;
  
  // Se for ajuste, pegar o tipo específico
  if (tipo === 'AJUSTE') {
    tipo = document.getElementById('mov-tipo-ajuste').value;
  }
  
  const dados = {
    produto_id: parseInt(document.getElementById('mov-produto').value),
    tipo: tipo,
    quantidade: parseFloat(document.getElementById('mov-quantidade').value),
    motivo: document.getElementById('mov-motivo').value,
    observacao: document.getElementById('mov-observacao').value,
    documento_referencia: document.getElementById('mov-documento').value
  };
  
  try {
    const response = await fetch('/api/estoque/movimentacoes', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(dados)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar');
    }
    
    const result = await response.json();
    showMessage(result.message, 'success');
    fecharModal();
    
    // Recarregar dados
    carregarProdutos();
    carregarEstatisticas();
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

function fecharModal() {
  document.getElementById('modal-movimentacao').classList.remove('show');
}

// Fechar modal ao clicar fora
document.getElementById('modal-movimentacao')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-movimentacao') {
    fecharModal();
  }
});

// ============= INICIALIZAÇÃO =============
carregarEstatisticas();
carregarProdutos();
