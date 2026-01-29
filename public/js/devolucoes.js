// Variáveis globais
let vendaAtual = null;
let clienteSelecionado = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadDevolucoes();
    loadCreditos();
});

// Inicializar listeners
function initializeEventListeners() {
    // Busca de venda
    document.getElementById('buscarVenda').addEventListener('click', buscarVenda);
    
    // Formulário de devolução
    document.getElementById('formDevolucao').addEventListener('submit', handleSubmitDevolucao);
    document.getElementById('tipoOperacao').addEventListener('change', handleTipoOperacaoChange);
    document.getElementById('formaRessarcimento').addEventListener('change', handleFormaRessarcimentoChange);
    
    // Filtros
    document.getElementById('btnFiltrar').addEventListener('click', loadDevolucoes);
    document.getElementById('btnFiltrarCreditos').addEventListener('click', loadCreditos);
    
    // Botões diversos
    document.getElementById('btnCancelar').addEventListener('click', resetForm);
    document.getElementById('btnImprimir').addEventListener('click', imprimirComprovante);
}

// Buscar venda
async function buscarVenda() {
    const numeroVenda = document.getElementById('numeroVenda').value;
    if (!numeroVenda) {
        showAlert('Informe o número da venda', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/vendas/${numeroVenda}`);
        if (!response.ok) throw new Error('Venda não encontrada');
        
        vendaAtual = await response.json();
        
        // Preencher informações da venda
        document.getElementById('nomeCliente').value = vendaAtual.cliente.nome_razao_social;
        
        // Limpar e preencher tabela de produtos
        const tbody = document.getElementById('tabelaProdutos').querySelector('tbody');
        tbody.innerHTML = '';
        
        vendaAtual.itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.produto.descricao}</td>
                <td>${item.quantidade}</td>
                <td>
                    <input type="number" class="form-control form-control-sm qtd-devolver" 
                           data-produto-id="${item.produto_id}" 
                           max="${item.quantidade}" 
                           min="0" step="1">
                </td>
                <td>${formatMoney(item.valor_unitario)}</td>
                <td class="total-item">R$ 0,00</td>
                <td>
                    <input type="text" class="form-control form-control-sm motivo-item"
                           data-produto-id="${item.produto_id}">
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Adicionar listeners para cálculos
        document.querySelectorAll('.qtd-devolver').forEach(input => {
            input.addEventListener('input', calcularTotalItem);
        });

    } catch (error) {
        showAlert('Erro ao buscar venda: ' + error.message, 'danger');
    }
}

// Calcular total por item
function calcularTotalItem(event) {
    const input = event.target;
    const produtoId = input.dataset.produtoId;
    const quantidade = Number(input.value);
    
    const item = vendaAtual.itens.find(i => i.produto_id == produtoId);
    if (!item) return;
    
    const total = quantidade * item.valor_unitario;
    const tr = input.closest('tr');
    tr.querySelector('.total-item').textContent = formatMoney(total);
    
    calcularTotalGeral();
}

// Calcular total geral
function calcularTotalGeral() {
    const totais = Array.from(document.querySelectorAll('.total-item'))
        .map(td => parseMoney(td.textContent));
    
    const total = totais.reduce((acc, curr) => acc + curr, 0);
    document.getElementById('valorTotal').value = total.toFixed(2);
}

// Handle submit devolução
async function handleSubmitDevolucao(event) {
    event.preventDefault();
    
    if (!vendaAtual) {
        showAlert('Selecione uma venda primeiro', 'warning');
        return;
    }

    // Coletar itens
    const itens = [];
    document.querySelectorAll('.qtd-devolver').forEach(input => {
        const quantidade = Number(input.value);
        if (quantidade > 0) {
            const produtoId = input.dataset.produtoId;
            const item = vendaAtual.itens.find(i => i.produto_id == produtoId);
            const motivo = input.closest('tr').querySelector('.motivo-item').value;
            
            itens.push({
                produto_id: produtoId,
                quantidade: quantidade,
                valor_unitario: item.valor_unitario,
                motivo: motivo
            });
        }
    });

    if (itens.length === 0) {
        showAlert('Selecione ao menos um item para devolver', 'warning');
        return;
    }

    // Montar dados
    const dados = {
        venda_id: vendaAtual.id,
        tipo_operacao: document.getElementById('tipoOperacao').value,
        forma_ressarcimento: document.getElementById('formaRessarcimento').value,
        motivo: document.getElementById('motivo').value,
        observacoes: document.getElementById('observacoes').value,
        itens: itens
    };

    // Adicionar dados de diferença se for troca
    if (dados.forma_ressarcimento === 'TROCA') {
        dados.valor_diferenca = Number(document.getElementById('valorDiferenca').value);
        dados.forma_pagamento_diferenca = document.getElementById('formaPagamentoDiferenca').value;
    }

    try {
        const response = await fetch('/api/devolucoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) throw new Error('Erro ao registrar devolução');
        
        const result = await response.json();
        showAlert('Devolução registrada com sucesso!', 'success');
        
        // Perguntar se quer imprimir
        if (confirm('Deseja imprimir o comprovante?')) {
            await imprimirComprovante(result.devolucaoId);
        }

        resetForm();
        loadDevolucoes();

    } catch (error) {
        showAlert('Erro ao registrar devolução: ' + error.message, 'danger');
    }
}

// Carregar lista de devoluções
async function loadDevolucoes() {
    try {
        const dataInicio = document.getElementById('filtroDataInicio').value;
        const dataFim = document.getElementById('filtroDataFim').value;
        const cliente = document.getElementById('filtroCliente').value;

        const params = new URLSearchParams();
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        if (cliente) params.append('cliente', cliente);

        const response = await fetch(`/api/devolucoes?${params}`);
        if (!response.ok) throw new Error('Erro ao carregar devoluções');
        
        const devolucoes = await response.json();
        const tbody = document.getElementById('tabelaDevolucoes').querySelector('tbody');
        tbody.innerHTML = '';

        devolucoes.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(d.created_at)}</td>
                <td>${d.numero_venda}</td>
                <td>${d.cliente_nome}</td>
                <td>${formatTipoOperacao(d.tipo_operacao)}</td>
                <td>${formatMoney(d.valor_total)}</td>
                <td>${formatRessarcimento(d.forma_ressarcimento)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalhes(${d.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="imprimirComprovante(${d.id})">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        showAlert('Erro ao carregar devoluções: ' + error.message, 'danger');
    }
}

// Carregar créditos
async function loadCreditos() {
    try {
        const cliente = document.getElementById('filtroClienteCreditos').value;
        
        const params = new URLSearchParams();
        if (cliente) params.append('cliente', cliente);

        const response = await fetch(`/api/creditos?${params}`);
        if (!response.ok) throw new Error('Erro ao carregar créditos');
        
        const creditos = await response.json();
        const tbody = document.getElementById('tabelaCreditos').querySelector('tbody');
        tbody.innerHTML = '';

        creditos.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(c.created_at)}</td>
                <td>${c.cliente_nome}</td>
                <td>${formatMoney(c.valor)}</td>
                <td>${formatMoney(c.valor_utilizado)}</td>
                <td>${formatMoney(c.valor - c.valor_utilizado)}</td>
                <td>${formatDate(c.validade)}</td>
                <td>${formatStatusCredito(c.status)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        showAlert('Erro ao carregar créditos: ' + error.message, 'danger');
    }
}

// Ver detalhes
async function verDetalhes(id) {
    try {
        const response = await fetch(`/api/devolucoes/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar detalhes');
        
        const detalhes = await response.json();
        
        // Preencher informações
        document.getElementById('detalheData').textContent = formatDate(detalhes.devolucao.created_at);
        document.getElementById('detalheVenda').textContent = detalhes.devolucao.numero_venda;
        document.getElementById('detalheCliente').textContent = detalhes.devolucao.cliente_nome;
        document.getElementById('detalheTipo').textContent = formatTipoOperacao(detalhes.devolucao.tipo_operacao);
        document.getElementById('detalheValorTotal').textContent = formatMoney(detalhes.devolucao.valor_total);
        document.getElementById('detalheRessarcimento').textContent = formatRessarcimento(detalhes.devolucao.forma_ressarcimento);
        document.getElementById('detalheDiferenca').textContent = detalhes.diferenca ? 
            `${formatMoney(detalhes.diferenca.valor)} (${detalhes.diferenca.tipo})` : 'N/A';
        document.getElementById('detalheObservacoes').textContent = detalhes.devolucao.observacoes || '';

        // Preencher produtos
        const tbody = document.getElementById('tabelaDetalhesProdutos').querySelector('tbody');
        tbody.innerHTML = '';
        
        detalhes.itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.produto_descricao}</td>
                <td>${item.quantidade}</td>
                <td>${formatMoney(item.valor_unitario)}</td>
                <td>${formatMoney(item.valor_total)}</td>
                <td>${item.motivo}</td>
            `;
            tbody.appendChild(tr);
        });

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
        modal.show();

    } catch (error) {
        showAlert('Erro ao carregar detalhes: ' + error.message, 'danger');
    }
}

// Imprimir comprovante
async function imprimirComprovante(id) {
    try {
        const response = await fetch(`/api/devolucoes/${id}/imprimir`);
        if (!response.ok) throw new Error('Erro ao gerar comprovante');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devolucao_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        showAlert('Erro ao imprimir comprovante: ' + error.message, 'danger');
    }
}

// Utilitários
function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function parseMoney(value) {
    return Number(value.replace(/[^0-9,-]/g, '').replace(',', '.'));
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
}

function formatTipoOperacao(tipo) {
    const tipos = {
        'DEVOLUCAO': 'Devolução',
        'TROCA': 'Troca'
    };
    return tipos[tipo] || tipo;
}

function formatRessarcimento(forma) {
    const formas = {
        'ABATER_VENDA': 'Abater na Venda',
        'CREDITO': 'Crédito',
        'TROCA': 'Troca'
    };
    return formas[forma] || forma;
}

function formatStatusCredito(status) {
    const statuses = {
        'DISPONIVEL': 'Disponível',
        'UTILIZADO': 'Utilizado',
        'VENCIDO': 'Vencido'
    };
    return statuses[status] || status;
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function resetForm() {
    document.getElementById('formDevolucao').reset();
    document.getElementById('tabelaProdutos').querySelector('tbody').innerHTML = '';
    vendaAtual = null;
    document.getElementById('divDiferenca').style.display = 'none';
}