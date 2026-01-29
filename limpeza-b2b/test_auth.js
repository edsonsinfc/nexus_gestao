const { default: fetch } = require('node-fetch');

async function testAuth() {
  try {
    console.log('🧪 Testando autenticação...');
    
    // 1. Fazer login
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await fetch('http://localhost:3100/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'equipe@teste.com',
        senha: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Status login:', loginResponse.status);
    console.log('Dados login:', JSON.stringify(loginData, null, 2));
    
    if (!loginResponse.ok) {
      console.log('❌ Erro no login');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Token obtido:', token.substring(0, 50) + '...');
    
    // 2. Decodificar token
    console.log('\n2️⃣ Decodificando token...');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('Payload do token:', JSON.stringify(payload, null, 2));
    
    // 3. Testar rota protegida
    console.log('\n3️⃣ Testando rota protegida (/api/produtos)...');
    const produtosResponse = await fetch('http://localhost:3100/api/produtos', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status produtos:', produtosResponse.status);
    const produtosData = await produtosResponse.json();
    console.log('Dados produtos:', JSON.stringify(produtosData, null, 2));
    
    if (produtosResponse.ok) {
      console.log('✅ Autenticação funcionando corretamente!');
    } else {
      console.log('❌ Erro na rota protegida');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAuth();