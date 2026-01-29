// Teste rápido de API
const token = localStorage.getItem('token');

console.log('🔑 Token:', token ? 'Presente' : 'Ausente');

if (!token) {
    console.error('❌ Token não encontrado! Faça login primeiro.');
} else {
    // Testar categorias
    fetch('/api/categorias-financeiras?tipo=DESPESA', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        console.log('📡 Status da resposta:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Dados recebidos:', data);
        if (data.categorias) {
            console.log(`📊 Total de categorias DESPESA: ${data.categorias.length}`);
        }
    })
    .catch(error => {
        console.error('❌ Erro:', error);
    });
}
