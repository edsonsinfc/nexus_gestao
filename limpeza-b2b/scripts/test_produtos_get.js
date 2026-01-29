const http = require('http');

function testAPI() {
  // Token de exemplo - você precisará fazer login primeiro
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AbmV4dXMuY29tIiwicGVyZmlsIjoiZ2VzdG9yIiwiaWF0IjoxNzMwODQwMDAwfQ.test';
  
  console.log('🔍 Testando API de produtos...\n');
  
  const options = {
    hostname: 'localhost',
    port: 3100,
    path: '/api/produtos?page=1&pageSize=20',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let body = '';
    
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    res.on('data', (chunk) => body += chunk);
    
    res.on('end', () => {
      console.log('\n📦 Resposta:');
      try {
        const data = JSON.parse(body);
        console.log(JSON.stringify(data, null, 2));
        
        if (data.produtos) {
          console.log(`\n✅ ${data.produtos.length} produtos retornados`);
        }
      } catch (e) {
        console.log('Body (não-JSON):', body);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
  });

  req.on('timeout', () => {
    console.error('❌ Timeout - servidor não respondeu');
    req.destroy();
  });

  req.end();
}

// Aguardar 3 segundos antes de testar
setTimeout(testAPI, 3000);
