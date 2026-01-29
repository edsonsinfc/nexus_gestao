const fetch = require('node-fetch');

async function testarAPI() {
    try {
        console.log('🔍 Testando API /api/contas-pagar...\n');
        
        // Teste sem autenticação
        console.log('1️⃣ Teste SEM token (deve retornar 401)');
        let response = await fetch('http://localhost:3000/api/contas-pagar');
        console.log('   Status:', response.status, response.statusText);
        
        if (response.status === 401) {
            console.log('   ✅ Autenticação funcionando corretamente\n');
        }
        
        // Teste com token fake (deve retornar 401 ou 403)
        console.log('2️⃣ Teste COM token fake');
        response = await fetch('http://localhost:3000/api/contas-pagar', {
            headers: {
                'Authorization': 'Bearer token-invalido'
            }
        });
        console.log('   Status:', response.status, response.statusText);
        
        if (response.status === 401 || response.status === 403) {
            console.log('   ✅ Validação de token funcionando\n');
        }
        
        // Teste rota de login
        console.log('3️⃣ Fazendo login para obter token válido');
        response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@nexus.com',
                senha: 'admin123'
            })
        });
        
        console.log('   Status:', response.status);
        
        if (response.ok) {
            const loginData = await response.json();
            console.log('   ✅ Login bem-sucedido!');
            console.log('   Token:', loginData.token ? loginData.token.substring(0, 20) + '...' : 'não encontrado');
            
            if (loginData.token) {
                // Teste com token válido
                console.log('\n4️⃣ Teste COM token válido');
                response = await fetch('http://localhost:3000/api/contas-pagar', {
                    headers: {
                        'Authorization': `Bearer ${loginData.token}`
                    }
                });
                
                console.log('   Status:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('   ✅ API funcionando!');
                    console.log('   Resposta:', JSON.stringify(data, null, 2).substring(0, 500));
                } else {
                    const errorText = await response.text();
                    console.log('   ❌ Erro na API:', errorText);
                }
            }
        } else {
            const errorText = await response.text();
            console.log('   ❌ Erro no login:', errorText);
            console.log('\n📌 Tente criar um usuário admin primeiro!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao testar:', error.message);
    }
}

testarAPI();
