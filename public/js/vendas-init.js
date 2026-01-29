let produtosSelecionados = [];

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
    document.getElementById('produto').addEventListener('change', onProdutoSelecionado);
    document.getElementById('btn-adicionar-item').addEventListener('click', adicionarItem);
    document.getElementById('form-venda').addEventListener('submit', salvarVenda);
    document.getElementById('desconto_geral').addEventListener('change', calcularTotais);
    document.getElementById('valor_frete').addEventListener('change', calcularTotais);
});