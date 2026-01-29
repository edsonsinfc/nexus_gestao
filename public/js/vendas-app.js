// public/js/vendas-app.js

// Estado global da venda
const estadoVenda = {
    itens: [],
    subtotal: 0,
    desconto_geral: 0,
    valor_frete: 0,
    valor_despesas: 0,
    valor_total: 0
};

// Constantes e configurações
const HEADERS = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando módulo de vendas...');

    // Configurar Select2
    $('.select2').select2({
        theme: 'bootstrap-5',
        width: '100%',
        language: 'pt-BR'
    });

    // Definir data atual
    document.getElementById('data_venda').valueAsDate = new Date();

    // Carregar dados iniciais e configurar valores padrão
    carregarClientes().then(() => {
        // Selecionar Consumidor Final como padrão (ID 1 ou ajuste conforme seu banco)
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect) {
            const consumidorFinalOption = Array.from(clienteSelect.options).find(opt => 
                opt.text.toLowerCase().includes('consumidor final'));
            if (consumidorFinalOption) {
                clienteSelect.value = consumidorFinalOption.value;
                $(clienteSelect).trigger('change');
            }
        }
    });

    carregarVendedores().then(() => {
        // Selecionar Vendedor Padrão
        const vendedorSelect = document.getElementById('vendedor');
        if (vendedorSelect) {
            const vendedorPadraoOption = Array.from(vendedorSelect.options).find(opt => 
                opt.text.toLowerCase().includes('padrão') || opt.text.toLowerCase().includes('padrao'));
            if (vendedorPadraoOption) {
                vendedorSelect.value = vendedorPadraoOption.value;
                $(vendedorSelect).trigger('change');
            }
        }
    });

    carregarProdutos();

    // Configurar valores padrão de pagamento
    const condicaoPagamento = document.getElementById('condicao_pagamento');
    if (condicaoPagamento) {
        condicaoPagamento.value = 'a_vista';
    }

    const formaPagamento = document.getElementById('forma_pagamento');
    if (formaPagamento) {
        formaPagamento.value = 'dinheiro';
    }

    // Event Listeners
    configurarEventListeners();
});

// Configuração de eventos
function configurarEventListeners() {
    // Produto selecionado
    document.getElementById('produto').addEventListener('change', onProdutoSelecionado);

    // Adicionar item
    document.getElementById('btn-adicionar-item').addEventListener('click', adicionarItem);

    // Eventos de cálculo
    document.getElementById('desconto_geral').addEventListener('input', calcularTotais);
    document.getElementById('valor_frete').addEventListener('input', calcularTotais);

    // Form principal
    document.getElementById('form-venda').addEventListener('submit', salvarVenda);
}

// Event Handlers
function onProdutoSelecionado(event) {
    const select = document.getElementById('produto');
    const precoInput = document.getElementById('preco_unitario');
    const quantidadeInput = document.getElementById('quantidade');
    const descontoInput = document.getElementById('desconto');

    // Limpar campos
    precoInput.value = '';
    quantidadeInput.value = '';
    descontoInput.value = '0';

    if (!select.value) return;

    try {
        const option = select.options[select.selectedIndex];
        const produtoData = JSON.parse(option.dataset.produto);
        
        // Debug
        console.log('Produto selecionado:', produtoData);
        console.log('Preço do produto:', produtoData.preco_venda);
        
        // Definir preço e quantidade
        precoInput.value = produtoData.preco_venda;
        quantidadeInput.value = '1';
        
        // Debug
        console.log('Preço definido:', precoInput.value);
        
        // Focar na quantidade
        quantidadeInput.focus();
    } catch (error) {
        console.error('Erro ao processar produto:', error);
    }
}

// Funções de API
async function carregarClientes() {
    try {
        const response = await fetch('/api/vendas/clientes-ativos', { headers: HEADERS });
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        const clientes = await response.json();
        const select = document.getElementById('cliente');
        
        select.innerHTML = '<option value="">Selecione o cliente...</option>';
        clientes.forEach(cliente => {
            const option = new Option(
                `${cliente.nome_razao_social} (${cliente.cpf_cnpj})`, 
                cliente.id
            );
            select.add(option);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        mostrarAlerta('Erro ao carregar lista de clientes', 'danger');
    }
}

async function carregarVendedores() {
    try {
        const response = await fetch('/api/vendas/vendedores-ativos', { headers: HEADERS });
        if (!response.ok) throw new Error('Erro ao carregar vendedores');
        
        const vendedores = await response.json();
        const select = document.getElementById('vendedor');
        
        select.innerHTML = '<option value="">Selecione o vendedor...</option>';
        vendedores.forEach(vendedor => {
            const option = new Option(vendedor.nome, vendedor.id);
            select.add(option);
        });
    } catch (error) {
        console.error('Erro ao carregar vendedores:', error);
        mostrarAlerta('Erro ao carregar lista de vendedores', 'danger');
    }
}

async function carregarProdutos() {
    try {
        const response = await fetch('/api/vendas/produtos-ativos', { headers: HEADERS });
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        console.log('Produtos recebidos:', produtos);
        
        const select = document.getElementById('produto');
        select.innerHTML = '<option value="">Selecione o produto...</option>';
        
        produtos.forEach(produto => {
            // Criar option
            const option = document.createElement('option');
            option.value = produto.id;
            option.text = `${produto.codigo_principal} - ${produto.descricao}`;
            
            // Guardar dados do produto
            option.dataset.produto = JSON.stringify({
                id: produto.id,
                codigo_principal: produto.codigo_principal,
                descricao: produto.descricao,
                preco_venda: produto.preco_venda,
                unidade: produto.unidade || 'UN'
            });
            
            // Adicionar ao select
            select.add(option);
            
            console.log('Produto adicionado:', {
                texto: option.text,
                valor: option.value,
                dados: JSON.parse(option.dataset.produto)
            });
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        mostrarAlerta('Erro ao carregar lista de produtos', 'danger');
    }
}

// Funções de manipulação de itens
function adicionarItem() {
    console.log('Adicionando item...');
    
    const produto = document.getElementById('produto');
    const quantidade = document.getElementById('quantidade');
    const precoUnitario = document.getElementById('preco_unitario');
    const desconto = document.getElementById('desconto');

    if (!validarCamposItem(produto, quantidade, precoUnitario)) {
        return;
    }

    const produtoOption = produto.selectedOptions[0];
    const produtoData = JSON.parse(produtoOption.dataset.produto);
    const qtd = parseFloat(quantidade.value);
    const preco = parseFloat(precoUnitario.value);
    const desc = parseFloat(desconto.value || 0);
    
    const valorTotal = calcularValorItem(qtd, preco, desc);

    const item = {
        id: produtoData.id,
        codigo: produtoData.codigo_principal,
        descricao: produtoData.descricao,
        quantidade: qtd,
        preco_unitario: preco,
        desconto: desc,
        valor_total: valorTotal
    };

    estadoVenda.itens.push(item);
    adicionarItemTabela(item);
    calcularTotais();
    limparCamposItem();
}

function adicionarItemTabela(item) {
    const tbody = document.getElementById('itens-table').getElementsByTagName('tbody')[0];
    const row = tbody.insertRow();
    
    row.dataset.produtoId = item.id;
    row.innerHTML = `
        <td>${item.codigo}</td>
        <td>${item.descricao}</td>
        <td class="text-center">${formatarNumero(item.quantidade, 3)}</td>
        <td class="text-end">R$ ${formatarNumero(item.preco_unitario)}</td>
        <td class="text-center">${formatarNumero(item.desconto)}</td>
        <td class="text-end">R$ ${formatarNumero(item.valor_total)}</td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-danger" onclick="removerItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
}

function removerItem(button) {
    const row = button.closest('tr');
    const produtoId = row.dataset.produtoId;
    
    estadoVenda.itens = estadoVenda.itens.filter(item => item.id != produtoId);
    row.remove();
    calcularTotais();
}

// Funções de cálculo
function calcularTotais() {
    estadoVenda.subtotal = estadoVenda.itens.reduce((total, item) => total + item.valor_total, 0);
    
    const descontoGeral = parseFloat(document.getElementById('desconto_geral').value || 0) / 100;
    const valorFrete = parseFloat(document.getElementById('valor_frete').value || 0);
    
    const valorComDesconto = estadoVenda.subtotal * (1 - descontoGeral);
    estadoVenda.valor_total = valorComDesconto + valorFrete;

    // Atualizar campos
    document.getElementById('subtotal').value = formatarNumero(estadoVenda.subtotal);
    document.getElementById('valor_total').value = formatarNumero(estadoVenda.valor_total);
}

function calcularValorItem(quantidade, precoUnitario, desconto) {
    return (quantidade * precoUnitario) * (1 - desconto / 100);
}

// Funções de validação
function validarCamposItem(produto, quantidade, precoUnitario) {
    if (!produto.value) {
        mostrarAlerta('Selecione um produto', 'warning');
        produto.focus();
        return false;
    }
    
    if (!quantidade.value || parseFloat(quantidade.value) <= 0) {
        mostrarAlerta('Informe uma quantidade válida', 'warning');
        quantidade.focus();
        return false;
    }
    
    if (!precoUnitario.value || parseFloat(precoUnitario.value) <= 0) {
        mostrarAlerta('Informe um preço válido', 'warning');
        precoUnitario.focus();
        return false;
    }
    
    return true;
}

function validarFormulario() {
    if (estadoVenda.itens.length === 0) {
        mostrarAlerta('Adicione pelo menos um item à venda', 'warning');
        return false;
    }

    const campos = ['cliente', 'vendedor', 'data_venda', 'tipo_venda', 'forma_pagamento', 'condicao_pagamento'];
    for (const campo of campos) {
        const elemento = document.getElementById(campo);
        if (!elemento.value) {
            mostrarAlerta(`Preencha o campo ${campo.replace('_', ' ')}`, 'warning');
            elemento.focus();
            return false;
        }
    }

    return true;
}

// Funções utilitárias
function limparCamposItem() {
    document.getElementById('produto').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('preco_unitario').value = '';
    document.getElementById('desconto').value = '';
    $(document.getElementById('produto')).trigger('change');
}

function formatarNumero(valor, decimais = 2) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    }).format(valor);
}

function mostrarAlerta(mensagem, tipo) {
    // Criar elemento de alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.role = 'alert';
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;

    // Inserir no topo do formulário
    const form = document.getElementById('form-venda');
    form.insertBefore(alerta, form.firstChild);

    // Remover após 5 segundos
    setTimeout(() => {
        alerta.remove();
    }, 5000);
}

// Salvar venda
async function salvarVenda(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }

    const formData = {
        cliente_id: document.getElementById('cliente').value,
        vendedor_id: document.getElementById('vendedor').value,
        data_venda: document.getElementById('data_venda').value,
        tipo_venda: document.getElementById('tipo_venda').value,
        forma_pagamento: document.getElementById('forma_pagamento').value,
        condicao_pagamento: document.getElementById('condicao_pagamento').value,
        observacoes: document.getElementById('observacoes').value,
        desconto_geral: parseFloat(document.getElementById('desconto_geral').value || 0),
        valor_frete: parseFloat(document.getElementById('valor_frete').value || 0),
        valor_total: estadoVenda.valor_total,
        itens: estadoVenda.itens.map(item => ({
            produto_id: item.id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto: item.desconto
        }))
    };

    try {
        const response = await fetch('/api/vendas', {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao salvar a venda');
        }

        mostrarAlerta('Venda salva com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = `/vendas/${data.id}`;
        }, 1500);

    } catch (error) {
        console.error('Erro ao salvar venda:', error);
        mostrarAlerta(error.message, 'danger');
    }
}

// Expor funções necessárias globalmente
window.removerItem = removerItem;