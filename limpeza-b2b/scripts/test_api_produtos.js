const http = require('http');

// Primeiro fazer login para obter o token
async function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: 'admin@nexus.com',
      senha: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3100,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('Status login:', res.statusCode);
        console.log('Body login:', body);
        
        if (res.statusCode !== 200) {
          reject(new Error(`Login falhou com status ${res.statusCode}: ${body}`));
          return;
        }
        
        try {
          const response = JSON.parse(body);
          if (!response.token) {
            reject(new Error(`Token não encontrado na resposta: ${body}`));
            return;
          }
          resolve(response.token);
        } catch (e) {
          reject(new Error(`Erro ao parsear resposta de login: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('Erro na requisição de login:', err);
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

// Buscar produtos
async function getProdutos(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3100,
      path: '/api/produtos',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Body:', body);
        
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          reject(new Error(`Erro ao parsear resposta: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('Erro na requisição de produtos:', err);
      reject(err);
    });
    req.end();
  });
}

async function test() {
  try {
    console.log('🔐 Fazendo login...');
    const token = await login();
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');
    
    console.log('\n📦 Buscando produtos...');
    const result = await getProdutos(token);
    console.log('✅ Produtos recebidos:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

test();
