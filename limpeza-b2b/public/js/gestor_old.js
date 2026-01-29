(function(){
  const tokenKey = 'nexus_b2b_token';
  const $ = s => document.querySelector(s);

  function getToken() { return localStorage.getItem(tokenKey); }
  function ensureAuth() {
    const t = getToken();
    if (!t) { window.location.href = '/login.html'; return null; }
    return t;
  }
  function parseJwt(tok){ try{ const [,p] = tok.split('.'); return JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))); }catch{ return null; } }

  async function api(path, opts={}){
    const tok = ensureAuth(); if (!tok) throw new Error('no-token');
    const headers = Object.assign({ 'Authorization': 'Bearer ' + tok }, opts.headers||{});
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    if (res.status === 401) { localStorage.removeItem(tokenKey); window.location.href = '/login.html'; return; }
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error||('Erro HTTP '+res.status));
    return data;
  }

  async function carregarEquipes(){
    const data = await api('/api/equipes');
    const tbody = $('#tbodyEquipes');
    tbody.innerHTML = '';
    const sel = $('#selEquipeSaldo');
    sel.innerHTML = '';

    (data.equipes || []).forEach(eq => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${eq.id}</td>
        <td><input data-id="${eq.id}" class="inp-nome" value="${escapeHtml(eq.nome)}" /></td>
        <td><input data-id="${eq.id}" class="inp-limite" type="number" step="0.01" value="${Number(eq.limite_total).toFixed(2)}" /></td>
        <td>${Number(eq.saldo_atual).toFixed(2)}</td>
        <td>
          <select data-id="${eq.id}" class="sel-status">
            <option value="ATIVA" ${eq.status==='ATIVA'?'selected':''}>ATIVA</option>
            <option value="INATIVA" ${eq.status==='INATIVA'?'selected':''}>INATIVA</option>
          </select>
        </td>
        <td class="right">
          <button class="btn-salvar" data-id="${eq.id}">Salvar</button>
        </td>
      `;
      tbody.appendChild(tr);

      const opt = document.createElement('option');
      opt.value = eq.id; opt.textContent = `#${eq.id} • ${eq.nome}`;
      sel.appendChild(opt);
    });

    tbody.querySelectorAll('.btn-salvar').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const nome = tbody.querySelector(`.inp-nome[data-id="${id}"]`).value.trim();
      const limite = tbody.querySelector(`.inp-limite[data-id="${id}"]`).value;
      const status = tbody.querySelector(`.sel-status[data-id="${id}"]`).value;
      try {
        await api('/api/equipes/'+id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, limite_total: Number(limite), status })
        });
        await carregarEquipes();
      } catch (err) {
        alert('Erro ao salvar: '+ err.message);
      }
    }));
  }

  // ==== Usuários (Gestão) ====
  let cacheEquipes = [];

  async function carregarEquipesParaSelects() {
    try {
      const data = await api('/api/equipes');
      cacheEquipes = data.equipes || [];
      // popular selects de equipe (criação de usuário)
      const selNovoEquipe = document.querySelector('#novoEquipe');
      if (selNovoEquipe) {
        selNovoEquipe.innerHTML = '<option value="">(sem equipe)</option>';
        cacheEquipes.forEach(eq => {
          const opt = document.createElement('option');
          opt.value = eq.id; opt.textContent = `#${eq.id} • ${eq.nome}`;
          selNovoEquipe.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Falha ao carregar equipes p/ selects', e);
    }
  }

  const usuariosState = { q: '', perfil: '', page: 1, pageSize: 10, totalPages: 1 };

  async function carregarUsuarios(){
    const perfil = document.querySelector('#selFiltroPerfil')?.value || '';
    const q = document.querySelector('#usrBusca')?.value || '';
    usuariosState.perfil = perfil;
    usuariosState.q = q;
    const params = new URLSearchParams();
    if (perfil) params.set('perfil', perfil);
    if (q) params.set('q', q);
    params.set('page', String(usuariosState.page));
    params.set('pageSize', String(usuariosState.pageSize));
    const url = '/api/usuarios' + (params.toString() ? ('?' + params.toString()) : '');
    const data = await api(url);
    const tbody = document.querySelector('#tbodyUsuarios');
    tbody.innerHTML = '';
    (data.usuarios||[]).forEach(u => {
      const tr = document.createElement('tr');
      const selEquipe = document.createElement('select');
      selEquipe.innerHTML = '<option value="">(sem equipe)</option>';
      cacheEquipes.forEach(eq => {
        const opt = document.createElement('option');
        opt.value = eq.id; opt.textContent = `#${eq.id} • ${eq.nome}`;
        if (u.equipe_id === eq.id) opt.selected = true;
        selEquipe.appendChild(opt);
      });
      selEquipe.setAttribute('data-id', u.id);
      selEquipe.className = 'sel-usr-equipe';

      const selPerfil = document.createElement('select');
      selPerfil.innerHTML = '<option value="gestor">gestor</option><option value="equipe">equipe</option>';
      selPerfil.value = u.perfil;
      selPerfil.setAttribute('data-id', u.id);
      selPerfil.className = 'sel-usr-perfil';

      const cbAtivo = document.createElement('input');
      cbAtivo.type = 'checkbox';
      cbAtivo.checked = !!u.ativo;
      cbAtivo.setAttribute('data-id', u.id);
      cbAtivo.className = 'cb-usr-ativo';

      tr.innerHTML = `
        <td>${u.id}</td>
        <td><input class="inp-usr-nome" data-id="${u.id}" value="${escapeHtml(u.nome)}" /></td>
        <td><input class="inp-usr-email" data-id="${u.id}" value="${escapeHtml(u.email)}" style="width:180px;" /></td>
        <td><input class="inp-usr-senha" data-id="${u.id}" type="password" placeholder="(deixe vazio para manter)" style="width:140px;" /></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="right"><button class="btn-usr-salvar" data-id="${u.id}">Salvar</button></td>
      `;
      const tds = tr.querySelectorAll('td');
      tds[4].appendChild(selPerfil);
      tds[5].appendChild(selEquipe);
      tds[6].appendChild(cbAtivo);
      tbody.appendChild(tr);
    });

    // paginação
    usuariosState.totalPages = data.totalPages || 1;
    const info = document.querySelector('#usuariosPaginaInfo');
    if (info) info.textContent = `Página ${data.page || usuariosState.page} de ${usuariosState.totalPages} (total ${data.total || 0})`;

    tbody.querySelectorAll('.btn-usr-salvar').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const nome = tbody.querySelector(`.inp-usr-nome[data-id="${id}"]`).value.trim();
      const email = tbody.querySelector(`.inp-usr-email[data-id="${id}"]`).value.trim();
      const senha = tbody.querySelector(`.inp-usr-senha[data-id="${id}"]`).value;
      const perfil = tbody.querySelector(`.sel-usr-perfil[data-id="${id}"]`).value;
      const equipe_id_val = tbody.querySelector(`.sel-usr-equipe[data-id="${id}"]`).value;
      const ativo = tbody.querySelector(`.cb-usr-ativo[data-id="${id}"]`).checked;
      const payload = { nome, email, perfil, ativo };
      if (senha && senha.trim()) payload.senha = senha;
      payload.equipe_id = equipe_id_val ? Number(equipe_id_val) : null;
      try {
        await api('/api/usuarios/'+id, {
          method:'PATCH',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        await carregarUsuarios();
      } catch (err) {
        alert('Erro ao salvar usuário: '+ err.message);
      }
    }));
  }

  async function criarUsuario(){
    console.log('criarUsuario() chamada');
    const nome = document.querySelector('#novoNome').value.trim();
    const email = document.querySelector('#novoEmail').value.trim();
    const senha = document.querySelector('#novoSenha').value.trim();
    const perfil = document.querySelector('#novoPerfil').value;
    const equipe_id_val = document.querySelector('#novoEquipe').value;
    const equipe_id = equipe_id_val ? Number(equipe_id_val) : null;
    const status = document.querySelector('#statusCriarUsuario');
    
    console.log('Valores dos campos:', { nome, email, senha, perfil, equipe_id });
    
    // Validação mais detalhada
    if (!nome) {
      console.log('Campo nome vazio:', nome);
      alert('Por favor, preencha o campo Nome');
      document.querySelector('#novoNome').focus();
      return;
    }
    if (!email) {
      alert('Por favor, preencha o campo Email');
      document.querySelector('#novoEmail').focus();
      return;
    }
    if (!senha) {
      alert('Por favor, preencha o campo Senha');
      document.querySelector('#novoSenha').focus();
      return;
    }
    if (senha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      document.querySelector('#novoSenha').focus();
      return;
    }
    
    try {
      status.textContent = 'Criando usuário...';
      status.style.color = '#22c55e';
      
      await api('/api/usuarios', {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ nome, email, senha, perfil, ativo: 1, equipe_id })
      });
      
      status.textContent = 'Usuário criado com sucesso!';
      status.style.color = '#22c55e';
      
      // Limpar campos
      document.querySelector('#novoNome').value = '';
      document.querySelector('#novoEmail').value = '';
      document.querySelector('#novoSenha').value = '';
      document.querySelector('#novoPerfil').value = 'gestor';
      document.querySelector('#novoEquipe').value = '';
      
      await carregarUsuarios();
      setTimeout(()=> {
        status.textContent = '';
        status.style.color = '';
      }, 3000);
    } catch (e) {
      status.textContent = 'Erro: ' + e.message;
      status.style.color = '#ef4444';
      console.error('Erro ao criar usuário:', e);
    }
  }

  document.querySelector('#btnRecarregarUsuarios')?.addEventListener('click', carregarUsuarios);
  document.querySelector('#selFiltroPerfil')?.addEventListener('change', carregarUsuarios);
  
  const btnCriar = document.querySelector('#btnCriarUsuario');
  console.log('Botão criar usuário encontrado:', btnCriar);
  btnCriar?.addEventListener('click', criarUsuario);
  
  document.querySelector('#btnBuscarUsuarios')?.addEventListener('click', () => { usuariosState.page = 1; carregarUsuarios(); });
  document.querySelector('#usuariosPrev')?.addEventListener('click', () => { if (usuariosState.page > 1) { usuariosState.page--; carregarUsuarios(); } });
  document.querySelector('#usuariosNext')?.addEventListener('click', () => { if (usuariosState.page < usuariosState.totalPages) { usuariosState.page++; carregarUsuarios(); } });

  function fmtMoney(n){ return Number(n||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
  function fmtDate(iso){ try { const d = new Date(iso); return d.toLocaleString('pt-BR'); } catch { return iso; } }

  const pedidosState = { status: 'AGUARDANDO', page: 1, pageSize: 10, totalPages: 1 };

  async function carregarPedidos(){
    const status = document.querySelector('#selFiltroStatus')?.value || '';
    pedidosState.status = status;
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(pedidosState.page));
    params.set('pageSize', String(pedidosState.pageSize));
    const url = '/api/pedidos' + (params.toString() ? ('?'+params.toString()) : '');
    const data = await api(url);
    const tbody = document.querySelector('#tbodyPedidos');
    tbody.innerHTML = '';
    (data.pedidos || []).forEach(p => {
      const tr = document.createElement('tr');
      const podeAprovar = p.status === 'AGUARDANDO';
      const podeCancelar = p.status === 'AGUARDANDO';
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${escapeHtml(p.equipe_nome || ('#'+p.equipe_id))}</td>
        <td>${fmtMoney(p.valor_total)}</td>
        <td>${fmtDate(p.data)}</td>
        <td><span class="pill ${p.status==='ENVIADO'?'ok':'bad'}">${p.status}</span></td>
        <td class="right">
          ${podeAprovar ? `<button class="btn-aprovar" data-id="${p.id}">Aprovar</button>` : ''}
          ${podeCancelar ? `<button class="btn-cancelar" data-id="${p.id}">Cancelar</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-aprovar').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!confirm('Aprovar e enviar este pedido?')) return;
      try {
        await api('/api/pedidos/'+id+'/aprovar', { method: 'POST' });
        await carregarPedidos();
      } catch (err) {
        alert('Erro ao aprovar: '+ err.message);
      }
    }));

    tbody.querySelectorAll('.btn-cancelar').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!confirm('Cancelar este pedido? O saldo será estornado.')) return;
      try {
        await api('/api/pedidos/'+id+'/cancelar', { method: 'POST' });
        await carregarPedidos();
      } catch (err) {
        alert('Erro ao cancelar: '+ err.message);
      }
    }));

    // paginação
    pedidosState.totalPages = data.totalPages || 1;
    const info = document.querySelector('#pedidosPaginaInfo');
    if (info) info.textContent = `Página ${data.page || pedidosState.page} de ${pedidosState.totalPages} (total ${data.total || 0})`;
  }

  async function criarEquipe(){
    const nome = $('#nomeEquipe').value.trim();
    const limite = Number($('#limiteEquipe').value || 0);
    if (!nome) return alert('Informe o nome');
    try {
      const tok = getToken();
      const payload = parseJwt(tok) || {};
      const gestor_id = payload.id;
      $('#statusCriar').textContent = 'Enviando...';
      await api('/api/equipes', {
        method:'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, gestor_id, limite_total: limite })
      });
      $('#statusCriar').textContent = 'Criado!';
      $('#nomeEquipe').value = '';
      $('#limiteEquipe').value = '';
      await carregarEquipes();
      setTimeout(()=> $('#statusCriar').textContent = '', 1500);
    } catch (e) {
      $('#statusCriar').textContent = '';
      alert('Erro ao criar equipe: '+ e.message);
    }
  }

  async function verSaldo(){
    const id = $('#selEquipeSaldo').value;
    if (!id) return;
    try {
      const data = await api('/api/equipes/'+id+'/saldo');
      $('#saldoBox').textContent = `Saldo: R$ ${Number(data.saldo_atual).toFixed(2)} (Limite: R$ ${Number(data.limite_total).toFixed(2)})`;
    } catch (e) {
      alert('Erro ao consultar saldo: '+ e.message);
    }
  }

  function escapeHtml(str){ return String(str||'').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

  // bind
  $('#btnCriar').addEventListener('click', criarEquipe);
  $('#btnRecarregar').addEventListener('click', carregarEquipes);
  $('#btnVerSaldo').addEventListener('click', verSaldo);
  document.querySelector('#btnRecarregarPedidos')?.addEventListener('click', carregarPedidos);
  document.querySelector('#selFiltroStatus')?.addEventListener('change', carregarPedidos);
  document.querySelector('#pedidosPrev')?.addEventListener('click', () => { if (pedidosState.page > 1) { pedidosState.page--; carregarPedidos(); } });
  document.querySelector('#pedidosNext')?.addEventListener('click', () => { if (pedidosState.page < pedidosState.totalPages) { pedidosState.page++; carregarPedidos(); } });

  // logout
  $('#btnSair').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(tokenKey);
    window.location.href = '/login.html';
  });

  // init
  ensureAuth();
  carregarEquipes();
  carregarEquipesParaSelects().then(carregarUsuarios);
  carregarPedidos();
})();
