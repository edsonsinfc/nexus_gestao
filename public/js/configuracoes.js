// Gerenciamento das configurações do sistema
let configuracoesAtuais = {};

document.addEventListener('DOMContentLoaded', function() {
    carregarConfiguracoes();
    configurarEventos();
});

// Função para carregar as configurações existentes
async function carregarConfiguracoes() {
    try {
        const response = await fetch('/api/configuracoes', {
            headers: apiHeaders
        });
        
        if (response.ok) {
            configuracoesAtuais = await response.json();
            preencherFormulario(configuracoesAtuais);
        } else {
            showMessage('Erro ao carregar configurações', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showMessage('Erro ao carregar configurações', 'error');
    }
}

// Preenche o formulário com as configurações atuais
function preencherFormulario(config) {
    const campos = [
        'empresa_nome',
        'empresa_cnpj',
        'empresa_endereco',
        'empresa_telefone',
        'empresa_email',
        'nfe_ambiente',
        'nfe_serie',
        'nfe_proxima_numeracao',
        'pix_chave',
        'pix_tipo',
        'cartao_tef_tipo',
        'modo_pdv'
    ];

    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento && config[campo] !== undefined) {
            elemento.value = config[campo];
        }
    });
}

// Configura eventos do formulário
function configurarEventos() {
    const form = document.getElementById('form-configuracoes');
    if (form) {
        form.addEventListener('submit', salvarConfiguracoes);
    }
}

// Salva as configurações no servidor
async function salvarConfiguracoes(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const configuracoes = {};
    
    formData.forEach((value, key) => {
        configuracoes[key] = value;
    });
    
    try {
        const response = await fetch('/api/configuracoes', {
            method: 'POST',
            headers: {
                ...apiHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configuracoes)
        });
        
        if (response.ok) {
            showMessage('Configurações salvas com sucesso!');
            configuracoesAtuais = configuracoes;
        } else {
            showMessage('Erro ao salvar configurações', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showMessage('Erro ao salvar configurações', 'error');
    }
}