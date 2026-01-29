// public/js/vendas-ui.js

// NOTA: vendaAtual e produtosSelecionados são declarados em vendas.js
// Não redeclarar aqui para evitar erro "already been declared"

// Funções de UI
window.abrirModalVenda = function() {
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
    produtosSelecionados.clear();
    
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
    
    modal.classList.add('active');
  }
}

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

// Event listener para atualizar preço unitário ao selecionar produto
document.addEventListener('DOMContentLoaded', function() {
  const produtoSelect = document.getElementById('produto');
  if (produtoSelect) {
    produtoSelect.addEventListener('change', function() {
      const option = this.options[this.selectedIndex];
      if (option) {
        document.getElementById('preco-unitario').value = option.dataset.preco || '';
      }
    });
  }
});