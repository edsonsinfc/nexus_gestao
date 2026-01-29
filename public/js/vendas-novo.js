// Variável para armazenar os itens da venda
let produtosSelecionados = [];

// Funções de inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando formulário de vendas...');

    // Configurar Select2
    $('.select2').select2({
        theme: 'bootstrap-5',
        width: '100%',
        language: 'pt-BR'
    });

    // Definir data atual
    document.getElementById('data_venda').valueAsDate = new Date();

    // Carregar dados iniciais
    carregarClientes();
    carregarVendedores();
    carregarProdutos();

    // Configurar eventos
    configurarEventos();
});

// Configuração de eventos
function configurarEventos() {
    // Produto selecionado
    document.getElementById('produto').addEventListener('change', function() {
        const option = this.selectedOptions[0];
        if (option && option.dataset.produto) {
            try {
            const produto = JSON.parse(option.dataset.produto);
            console.log('Produto selecionado:', produto); // Debug
            
            // Usar especificamente o campo preco_venda da tabela
            const preco = produto.preco_venda || 0;
            console.log('Preço encontrado:', preco); // Debug                // Formatando o preço para duas casas decimais
                document.getElementById('preco_unitario').value = parseFloat(preco).toFixed(2);
                document.getElementById('quantidade').value = '1';
                document.getElementById('desconto').value = '0';
                document.getElementById('quantidade').focus();
                
                // Atualizar o dataset do produto com o preço correto
                produto.preco_venda = parseFloat(preco);
                option.dataset.produto = JSON.stringify(produto);
            } catch (error) {
                console.error('Erro ao processar produto:', error);
                document.getElementById('preco_unitario').value = '0.00';
            }
        } else {
            console.log('Nenhum produto selecionado ou dados do produto ausentes');
            document.getElementById('preco_unitario').value = '0.00';
        }
    });

    // Adicionar item
    document.getElementById('btn-adicionar-item').addEventListener('click', adicionarItem);

    // Eventos de cálculo
    document.getElementById('desconto_geral').addEventListener('input', calcularTotais);
    document.getElementById('valor_frete').addEventListener('input', calcularTotais);

    // Salvar venda
    document.getElementById('form-venda').addEventListener('submit', salvarVenda);
}

// Funções de carregamento
async function carregarClientes() {
    try {
        const response = await fetch('/api/vendas/clientes-ativos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        const clientes = await response.json();
        const select = document.getElementById('cliente');
        select.innerHTML = '<option value="">Selecione o cliente...</option>';
        
        clientes.forEach(cliente => {
            const option = new Option(cliente.nome_razao_social, cliente.id);
            select.add(option);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        alert('Erro ao carregar lista de clientes');
    }
}

async function carregarVendedores() {
    try {
        const response = await fetch('/api/vendas/vendedores-ativos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
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
        alert('Erro ao carregar lista de vendedores');
    }
}

async function carregarProdutos() {
    try {
        const response = await fetch('/api/vendas/produtos-ativos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        console.log('Produtos carregados:', produtos); // Debug

        const select = document.getElementById('produto');
        select.innerHTML = '<option value="">Selecione o produto...</option>';
        
        produtos.forEach(produto => {
            console.log('Processando produto:', produto); // Debug do produto individual
            const option = new Option(
                `${produto.codigo_principal} - ${produto.descricao}`,
                produto.id
            );
            // Garantir que o preço de venda seja incluído nos dados do produto
            const dadosProduto = {
                ...produto,
                preco_venda: produto.preco_venda || produto.valor_venda || produto.preco || 0
            };
            console.log('Dados do produto para option:', dadosProduto); // Debug dos dados
            option.dataset.produto = JSON.stringify(dadosProduto);
            select.add(option);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar lista de produtos');
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

    adicionarItemTabela(item);
    produtosSelecionados.push(item);
    calcularTotais();
    limparCamposProduto();
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
    
    produtosSelecionados = produtosSelecionados.filter(item => item.id != produtoId);
    row.remove();
    calcularTotais();
}

// Funções de cálculo
function calcularTotais() {
    let subtotal = produtosSelecionados.reduce((total, item) => total + item.valor_total, 0);
    
    const descontoGeral = parseFloat(document.getElementById('desconto_geral').value || 0) / 100;
    const valorFrete = parseFloat(document.getElementById('valor_frete').value || 0);
    
    const valorComDesconto = subtotal * (1 - descontoGeral);
    const total = valorComDesconto + valorFrete;

    document.getElementById('subtotal').value = formatarNumero(subtotal);
    document.getElementById('valor_total').value = formatarNumero(total);
}

function calcularValorItem(quantidade, precoUnitario, desconto) {
    return (quantidade * precoUnitario) * (1 - desconto / 100);
}

// Funções de validação
function validarCamposItem(produto, quantidade, precoUnitario) {
    if (!produto.value) {
        alert('Selecione um produto');
        produto.focus();
        return false;
    }
    
    if (!quantidade.value || parseFloat(quantidade.value) <= 0) {
        alert('Informe uma quantidade válida');
        quantidade.focus();
        return false;
    }
    
    if (!precoUnitario.value || parseFloat(precoUnitario.value) <= 0) {
        alert('Informe um preço válido');
        precoUnitario.focus();
        return false;
    }
    
    return true;
}

function validarFormulario() {
    if (!produtosSelecionados.length) {
        alert('Adicione pelo menos um item à venda');
        return false;
    }

    const campos = ['cliente', 'vendedor', 'data_venda', 'tipo_venda', 'forma_pagamento', 'condicao_pagamento'];
    for (const campo of campos) {
        const elemento = document.getElementById(campo);
        if (!elemento.value) {
            alert(`Preencha o campo ${campo.replace('_', ' ')}`);
            elemento.focus();
            return false;
        }
    }

    return true;
}

// Funções auxiliares
function limparCamposProduto() {
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
        valor_total: parseFloat(document.getElementById('valor_total').value.replace(/[R$\s.]/g, '').replace(',', '.')),
        itens: produtosSelecionados.map(item => ({
            produto_id: item.id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto: item.desconto
        }))
    };

    try {
        const response = await fetch('/api/vendas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao salvar a venda');
        }

        alert('Venda salva com sucesso!');
        window.location.href = `/vendas/${data.id}`;

    } catch (error) {
        console.error('Erro ao salvar venda:', error);
        alert(error.message);
    }
}

// Exportar funções necessárias globalmente
window.removerItem = removerItem;