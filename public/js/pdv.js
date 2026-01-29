// Estado global do PDV
let estado = {
    carrinho: [],
    cliente: null,
    operacao: 'VENDA', // VENDA, DEVOLUCAO, TROCA, CANCELAMENTO
    vendaOriginal: null,
    itensDevolucao: []
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarPDV();
    inicializarEventos();
});

function inicializarPDV() {
    // Adicionar botões de operações
    const menuOperacoes = document.createElement('div');
    menuOperacoes.className = 'pdv-operacoes mt-3';
    menuOperacoes.innerHTML = `
        <div class="btn-group w-100">
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

    // Inserir após o campo de busca
    const campoBusca = document.querySelector('.pdv-busca');
    campoBusca.parentNode.insertBefore(menuOperacoes, campoBusca.nextSibling);

    // Adicionar campo de busca de venda
    const buscaVenda = document.createElement('div');
    buscaVenda.id = 'buscaVenda';
    buscaVenda.className = 'mt-3';
    buscaVenda.style.display = 'none';
    buscaVenda.innerHTML = `
        <div class="input-group">
            <input type="text" class="form-control" id="numeroVenda" placeholder="Digite o número da venda">
            <button class="btn btn-primary" onclick="buscarVenda()">
                <i class="fas fa-search"></i> Buscar
            </button>
        </div>
    `;
    menuOperacoes.after(buscaVenda);
}

function inicializarEventos() {
    // Eventos existentes do PDV
    document.getElementById('buscarProduto').addEventListener('keyup', buscarProduto);
    document.getElementById('btnFinalizar').addEventListener('click', finalizarOperacao);
    document.getElementById('btnLimpar').addEventListener('click', limparCarrinho);
    
    // Eventos do modal de pagamento
    document.getElementById('formaPagamento').addEventListener('change', atualizarOpcoesPagamento);
    document.getElementById('valorPago').addEventListener('input', calcularTroco);
    document.getElementById('btnConfirmarPagamento').addEventListener('click', confirmarPagamento);
}

// Funções de Operações
function iniciarDevolucao() {
    estado.operacao = 'DEVOLUCAO';
    document.querySelector('.pdv-titulo').textContent = 'Devolução de Produtos';
    mostrarBuscaVenda();
    limparCarrinho();
}

function iniciarTroca() {
    estado.operacao = 'TROCA';
    document.querySelector('.pdv-titulo').textContent = 'Troca de Produtos';
    mostrarBuscaVenda();
    limparCarrinho();
}

function iniciarCancelamento() {
    estado.operacao = 'CANCELAMENTO';
    document.querySelector('.pdv-titulo').textContent = 'Cancelamento de Venda';
    mostrarBuscaVenda();
    limparCarrinho();
}

function mostrarBuscaVenda() {
    document.getElementById('buscaVenda').style.display = 'block';
    document.getElementById('numeroVenda').focus();
    document.querySelector('.pdv-busca').style.display = 'none';
}

async function buscarVenda() {
    const numero = document.getElementById('numeroVenda').value;
    if (!numero) {
        mostrarAlerta('Digite o número da venda', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/vendas/${numero}`);
        if (!response.ok) throw new Error('Venda não encontrada');
        
        estado.vendaOriginal = await response.json();
        
        if (estado.vendaOriginal.status === 'CANCELADO') {
            throw new Error('Esta venda já está cancelada');
        }

        // Se for cancelamento, confirmar direto
        if (estado.operacao === 'CANCELAMENTO') {
            if (confirm('Confirma o cancelamento desta venda?')) {
                await cancelarVenda();
            }
            return;
        }

        // Para devolução/troca, mostrar produtos
        mostrarProdutosVenda();

    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function mostrarProdutosVenda() {
    const tbody = document.querySelector('.pdv-itens tbody');
    tbody.innerHTML = '';

    estado.vendaOriginal.itens.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.produto.descricao}</td>
            <td>
                <input type="number" class="form-control form-control-sm qtd-devolver"
                       value="0" min="0" max="${item.quantidade}"
                       data-produto-id="${item.produto_id}"
                       data-valor="${item.valor_unitario}"
                       onchange="calcularTotalItem(this)">
            </td>
            <td>R$ ${item.valor_unitario.toFixed(2)}</td>
            <td class="total-item">R$ 0,00</td>
            <td>
                <input type="text" class="form-control form-control-sm motivo-item"
                       placeholder="Motivo" required>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Mostrar/esconder elementos conforme operação
    document.getElementById('buscaVenda').style.display = 'none';
    if (estado.operacao === 'TROCA') {
        document.querySelector('.pdv-busca').style.display = 'block';
    }
}

function calcularTotalItem(input) {
    const quantidade = Number(input.value);
    const valor = Number(input.dataset.valor);
    const tr = input.closest('tr');
    
    tr.querySelector('.total-item').textContent = `R$ ${(quantidade * valor).toFixed(2)}`;
    atualizarTotalOperacao();
}

function atualizarTotalOperacao() {
    let totalDevolucao = 0;
    document.querySelectorAll('.qtd-devolver').forEach(input => {
        const quantidade = Number(input.value);
        const valor = Number(input.dataset.valor);
        totalDevolucao += quantidade * valor;
    });

    // Atualizar total no display
    document.getElementById('totalVenda').textContent = `R$ ${totalDevolucao.toFixed(2)}`;
}

async function finalizarOperacao() {
    if (estado.operacao === 'VENDA') {
        return finalizarVenda();
    }

    const itens = coletarItensDevolucao();
    if (itens.length === 0) {
        mostrarAlerta('Selecione ao menos um item', 'warning');
        return;
    }

    try {
        if (estado.operacao === 'DEVOLUCAO') {
            await processarDevolucao(itens);
        } else if (estado.operacao === 'TROCA') {
            await processarTroca(itens);
        }
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function coletarItensDevolucao() {
    const itens = [];
    document.querySelectorAll('.qtd-devolver').forEach(input => {
        const quantidade = Number(input.value);
        if (quantidade > 0) {
            const tr = input.closest('tr');
            itens.push({
                produto_id: input.dataset.produtoId,
                quantidade: quantidade,
                valor_unitario: Number(input.dataset.valor),
                motivo: tr.querySelector('.motivo-item').value
            });
        }
    });
    return itens;
}

async function processarDevolucao(itens) {
    const dados = {
        venda_id: estado.vendaOriginal.id,
        tipo_operacao: 'DEVOLUCAO',
        forma_ressarcimento: 'CREDITO', // Pode ser configurável
        valor_total: calcularTotalItens(itens),
        itens: itens,
        motivo: 'Devolução via PDV'
    };

    const response = await fetch('/api/devolucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });

    if (!response.ok) throw new Error('Erro ao processar devolução');

    const result = await response.json();
    mostrarAlerta('Devolução registrada com sucesso!', 'success');
    
    if (confirm('Deseja imprimir o comprovante?')) {
        await imprimirComprovante(result.devolucaoId);
    }

    resetarPDV();
}

async function processarTroca(itens) {
    const valorDevolucao = calcularTotalItens(itens);
    const valorNovosItens = calcularTotalCarrinho();
    const valorDiferenca = valorNovosItens - valorDevolucao;

    const dados = {
        venda_id: estado.vendaOriginal.id,
        tipo_operacao: 'TROCA',
        forma_ressarcimento: 'TROCA',
        valor_total: valorDevolucao,
        valor_diferenca: valorDiferenca,
        forma_pagamento_diferenca: valorDiferenca > 0 ? 'DINHEIRO' : null,
        itens: itens,
        motivo: 'Troca via PDV',
        itens_novos: estado.carrinho
    };

    const response = await fetch('/api/devolucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });

    if (!response.ok) throw new Error('Erro ao processar troca');

    const result = await response.json();
    
    // Se houver diferença a pagar
    if (valorDiferenca > 0) {
        await processarPagamento(valorDiferenca);
    }

    mostrarAlerta('Troca registrada com sucesso!', 'success');
    
    if (confirm('Deseja imprimir o comprovante?')) {
        await imprimirComprovante(result.devolucaoId);
    }

    resetarPDV();
}

async function cancelarVenda() {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;

    try {
        const response = await fetch('/api/devolucoes/cancelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                venda_id: estado.vendaOriginal.id,
                motivo: motivo
            })
        });

        if (!response.ok) throw new Error('Erro ao cancelar venda');

        mostrarAlerta('Venda cancelada com sucesso!', 'success');
        resetarPDV();

    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function imprimirComprovante(id) {
    try {
        const response = await fetch(`/api/devolucoes/${id}/imprimir`);
        if (!response.ok) throw new Error('Erro ao gerar comprovante');
        
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
        mostrarAlerta('Erro ao imprimir comprovante: ' + error.message, 'danger');
    }
}

// Funções auxiliares
function calcularTotalItens(itens) {
    return itens.reduce((total, item) => total + (item.quantidade * item.valor_unitario), 0);
}

function calcularTotalCarrinho() {
    return estado.carrinho.reduce((total, item) => total + (item.quantidade * item.valor_unitario), 0);
}

function mostrarAlerta(mensagem, tipo) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

function resetarPDV() {
    estado = {
        carrinho: [],
        cliente: null,
        operacao: 'VENDA',
        vendaOriginal: null,
        itensDevolucao: []
    };

    document.querySelector('.pdv-titulo').textContent = 'PDV - Ponto de Venda';
    document.getElementById('buscaVenda').style.display = 'none';
    document.querySelector('.pdv-busca').style.display = 'block';
    document.querySelector('.pdv-itens tbody').innerHTML = '';
    document.getElementById('totalVenda').textContent = 'R$ 0,00';
    document.getElementById('numeroVenda').value = '';
}

// Funções existentes do PDV que devem ser mantidas
// ... (manter as funções originais do PDV como buscarProduto, adicionarAoCarrinho, etc)