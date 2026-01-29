// Gerenciamento de entregas
let entregasState = {
    vendaAtual: null,
    itens: [],
    tipoEntrega: 'TOTAL'
};

function abrirModalEntrega(vendaId) {
    entregasState.vendaAtual = vendaId;
    
    // Carregar dados da venda
    fetch(`/api/vendas/${vendaId}`, {
        headers: apiHeaders
    })
    .then(response => response.json())
    .then(venda => {
        entregasState.itens = venda.itens.map(item => ({
            ...item,
            quantidade_entregar: item.quantidade
        }));
        
        preencherFormularioEntrega(venda);
    })
    .catch(error => {
        console.error('Erro ao carregar venda:', error);
        showMessage('Erro ao carregar dados da venda', 'error');
    });
    
    document.getElementById('modal-entrega').classList.add('active');
}

function preencherFormularioEntrega(venda) {
    // Preencher dados do cliente
    document.getElementById('entrega-cliente').textContent = venda.cliente.nome_razao_social;
    document.getElementById('entrega-telefone').value = venda.cliente.telefone || '';
    document.getElementById('entrega-endereco').value = venda.cliente.endereco || '';
    
    // Limpar e preencher tabela de itens
    const tbody = document.getElementById('itens-entrega-table').querySelector('tbody');
    tbody.innerHTML = '';
    
    entregasState.itens.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.produto_codigo}</td>
            <td>${item.produto_descricao}</td>
            <td>${item.quantidade} ${item.unidade}</td>
            <td>
                <input type="number" 
                       class="quantidade-entregar" 
                       value="${item.quantidade_entregar}"
                       min="0" 
                       max="${item.quantidade}" 
                       step="0.001"
                       onchange="atualizarQuantidadeEntrega(${index}, this.value)">
            </td>
            <td>${item.unidade}</td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarQuantidadeEntrega(index, valor) {
    const quantidade = Number(valor);
    const item = entregasState.itens[index];
    
    if (quantidade < 0 || quantidade > item.quantidade) {
        showMessage('Quantidade inválida', 'error');
        return;
    }
    
    entregasState.itens[index].quantidade_entregar = quantidade;
}

function alternarTipoEntrega(tipo) {
    entregasState.tipoEntrega = tipo;
    
    // Se for entrega total, preencher quantidade máxima para todos os itens
    if (tipo === 'TOTAL') {
        entregasState.itens.forEach(item => {
            item.quantidade_entregar = item.quantidade;
        });
        
        // Atualizar campos na tabela
        const inputs = document.querySelectorAll('.quantidade-entregar');
        inputs.forEach((input, index) => {
            input.value = entregasState.itens[index].quantidade;
        });
    }
}

async function salvarEntrega() {
    try {
        const form = document.getElementById('form-entrega');
        const formData = new FormData(form);
        
        const dados = {
            venda_id: entregasState.vendaAtual,
            tipo_entrega: entregasState.tipoEntrega,
            motorista: formData.get('motorista'),
            placa_veiculo: formData.get('placa_veiculo'),
            telefone_contato: formData.get('telefone_contato'),
            endereco_entrega: formData.get('endereco_entrega'),
            previsao_entrega: formData.get('previsao_entrega'),
            observacoes: formData.get('observacoes'),
            itens: entregasState.itens.map(item => ({
                id: item.id,
                quantidade: item.quantidade_entregar
            }))
        };
        
        const response = await fetch('/api/entregas', {
            method: 'POST',
            headers: {
                ...apiHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao salvar entrega');
        }
        
        const result = await response.json();
        
        showMessage('Entrega registrada com sucesso!');
        
        // Gerar e abrir comprovante
        window.open(`/api/entregas/${result.entregaId}/comprovante`, '_blank');
        
        // Fechar modal
        document.getElementById('modal-entrega').classList.remove('active');
        
    } catch (error) {
        console.error('Erro ao salvar entrega:', error);
        showMessage('Erro ao salvar entrega', 'error');
    }
}