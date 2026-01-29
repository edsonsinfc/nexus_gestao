// public/js/tributacao.js

(function(){
  const token = localStorage.getItem('token');
  if (!token) return; // login redireciona
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Helpers ($ já definido em admin.js)
  const $$ = (s) => document.querySelectorAll(s);

  function option(val, text){ const o = document.createElement('option'); o.value = val; o.textContent = text; return o; }

  async function fetchJSON(url, opts={}){
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  // Estado selecionado
  let figuraEntSel = null;
  let figuraSaiSel = null;

  // Carregar listas
  async function carregarFigurasEntrada(){
    const data = await fetchJSON('/api/tributacao/figuras/entrada', { headers });
    const tbody = $('#tbl-trib-ent tbody');
    const selProdEnt = $('#trib-prod-ent');
    if (tbody) tbody.innerHTML = '';
    if (selProdEnt) selProdEnt.innerHTML = '<option value="">(nenhuma)</option>';
    (data.figuras || []).forEach(f => {
      if (tbody){
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${f.id}</td><td>${f.nome||''}</td><td>${f.cfop||''}</td><td>${f.cst_icms||f.csosn||''}</td><td><button class="btn btn-secondary btn-sm" data-ent-edit="${f.id}">Selecionar</button> <button class="btn btn-secondary btn-sm" data-ent-del="${f.id}">Excluir</button></td>`;
        tbody.appendChild(tr);
      }
      if (selProdEnt) selProdEnt.appendChild(option(f.id, `${f.id} - ${f.nome}`));
    });
  }

  async function carregarFigurasSaida(){
    const data = await fetchJSON('/api/tributacao/figuras/saida', { headers });
    const tbody = $('#tbl-trib-sai tbody');
    const selProdSai = $('#trib-prod-sai');
    if (tbody) tbody.innerHTML = '';
    if (selProdSai) selProdSai.innerHTML = '<option value="">(nenhuma)</option>';
    (data.figuras || []).forEach(f => {
      if (tbody){
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${f.id}</td><td>${f.nome||''}</td><td>${f.cfop||''}</td><td>${f.cst_icms||f.csosn||''}</td><td><button class="btn btn-secondary btn-sm" data-sai-edit="${f.id}">Selecionar</button> <button class="btn btn-secondary btn-sm" data-sai-del="${f.id}">Excluir</button></td>`;
        tbody.appendChild(tr);
      }
      if (selProdSai) selProdSai.appendChild(option(f.id, `${f.id} - ${f.nome}`));
    });
  }

  async function recarregarNcmEntrada(){
    const tbody = $('#tbl-trib-ent-ncm tbody');
    if (!figuraEntSel){ if (tbody) tbody.innerHTML = '<tr><td colspan="4">Selecione uma figura</td></tr>'; return; }
    const data = await fetchJSON(`/api/tributacao/figuras/entrada/${figuraEntSel}/ncm`, { headers });
    if (tbody) tbody.innerHTML = '';
    (data.ncm||[]).forEach(n => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${n.id}</td><td>${n.ncm_pattern}</td><td>${n.observacao||''}</td><td><button class="btn btn-secondary btn-sm" data-ent-ncm-del="${n.id}">Remover</button></td>`;
      tbody.appendChild(tr);
    });
  }

  async function recarregarNcmSaida(){
    const tbody = $('#tbl-trib-sai-ncm tbody');
    if (!figuraSaiSel){ if (tbody) tbody.innerHTML = '<tr><td colspan="4">Selecione uma figura</td></tr>'; return; }
    const data = await fetchJSON(`/api/tributacao/figuras/saida/${figuraSaiSel}/ncm`, { headers });
    if (tbody) tbody.innerHTML = '';
    (data.ncm||[]).forEach(n => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${n.id}</td><td>${n.ncm_pattern}</td><td>${n.observacao||''}</td><td><button class="btn btn-secondary btn-sm" data-sai-ncm-del="${n.id}">Remover</button></td>`;
      tbody.appendChild(tr);
    });
  }

  // Bind salvar figuras
  const btnEntSalvar = $('#btn-trib-ent-salvar');
  if (btnEntSalvar){
    btnEntSalvar.addEventListener('click', async () => {
      const body = {
        nome: $('#trib-ent-nome')?.value?.trim(),
        cfop: $('#trib-ent-cfop')?.value?.trim()||null,
        cst_icms: $('#trib-ent-cst')?.value?.trim()||null,
        csosn: $('#trib-ent-csosn')?.value?.trim()||null,
        icms_aliquota: parseFloat($('#trib-ent-aliq-icms')?.value||'0')||0,
        icms_reducao_bc: parseFloat($('#trib-ent-red-icms')?.value||'0')||0,
        pis_cst: $('#trib-ent-pis-cst')?.value?.trim()||null,
        pis_aliquota: parseFloat($('#trib-ent-pis-aliq')?.value||'0')||0,
        cofins_cst: $('#trib-ent-cof-cst')?.value?.trim()||null,
        cofins_aliquota: parseFloat($('#trib-ent-cof-aliq')?.value||'0')||0,
      };
      if (!body.nome){ alert('Informe o nome da figura'); return; }
      await fetchJSON('/api/tributacao/figuras/entrada', { method:'POST', headers, body: JSON.stringify(body) });
      await carregarFigurasEntrada();
    });
  }

  const btnSaiSalvar = $('#btn-trib-sai-salvar');
  if (btnSaiSalvar){
    btnSaiSalvar.addEventListener('click', async () => {
      const body = {
        nome: $('#trib-sai-nome')?.value?.trim(),
        cfop: $('#trib-sai-cfop')?.value?.trim()||null,
        cst_icms: $('#trib-sai-cst')?.value?.trim()||null,
        csosn: $('#trib-sai-csosn')?.value?.trim()||null,
        icms_aliquota: parseFloat($('#trib-sai-aliq-icms')?.value||'0')||0,
        icms_reducao_bc: parseFloat($('#trib-sai-red-icms')?.value||'0')||0,
        pis_cst: $('#trib-sai-pis-cst')?.value?.trim()||null,
        pis_aliquota: parseFloat($('#trib-sai-pis-aliq')?.value||'0')||0,
        cofins_cst: $('#trib-sai-cof-cst')?.value?.trim()||null,
        cofins_aliquota: parseFloat($('#trib-sai-cof-aliq')?.value||'0')||0,
      };
      if (!body.nome){ alert('Informe o nome da figura'); return; }
      await fetchJSON('/api/tributacao/figuras/saida', { method:'POST', headers, body: JSON.stringify(body) });
      await carregarFigurasSaida();
    });
  }

  // Recarregar listas
  $('#btn-trib-ent-recarregar')?.addEventListener('click', carregarFigurasEntrada);
  $('#btn-trib-sai-recarregar')?.addEventListener('click', carregarFigurasSaida);

  // Seleção/exclusão de figuras (delegação)
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    // Entrada
    if (t.hasAttribute('data-ent-edit')){
      figuraEntSel = t.getAttribute('data-ent-edit');
      await recarregarNcmEntrada();
    }
    if (t.hasAttribute('data-ent-del')){
      const id = t.getAttribute('data-ent-del');
      if (confirm('Excluir figura de entrada?')){
        await fetchJSON(`/api/tributacao/figuras/entrada/${id}`, { method:'DELETE', headers });
        if (figuraEntSel === id) figuraEntSel = null;
        await carregarFigurasEntrada();
        await recarregarNcmEntrada();
      }
    }
    if (t.hasAttribute('data-ent-ncm-del')){
      const mapId = t.getAttribute('data-ent-ncm-del');
      if (!figuraEntSel) return;
      if (confirm('Remover NCM?')){
        await fetchJSON(`/api/tributacao/figuras/entrada/${figuraEntSel}/ncm/${mapId}`, { method:'DELETE', headers });
        await recarregarNcmEntrada();
      }
    }
    // Saída
    if (t.hasAttribute('data-sai-edit')){
      figuraSaiSel = t.getAttribute('data-sai-edit');
      await recarregarNcmSaida();
    }
    if (t.hasAttribute('data-sai-del')){
      const id = t.getAttribute('data-sai-del');
      if (confirm('Excluir figura de saída?')){
        await fetchJSON(`/api/tributacao/figuras/saida/${id}`, { method:'DELETE', headers });
        if (figuraSaiSel === id) figuraSaiSel = null;
        await carregarFigurasSaida();
        await recarregarNcmSaida();
      }
    }
    if (t.hasAttribute('data-sai-ncm-del')){
      const mapId = t.getAttribute('data-sai-ncm-del');
      if (!figuraSaiSel) return;
      if (confirm('Remover NCM?')){
        await fetchJSON(`/api/tributacao/figuras/saida/${figuraSaiSel}/ncm/${mapId}`, { method:'DELETE', headers });
        await recarregarNcmSaida();
      }
    }
  });

  // Adicionar NCM
  $('#btn-trib-ent-add-ncm')?.addEventListener('click', async () => {
    if (!figuraEntSel){ alert('Selecione uma figura de entrada'); return; }
    const ncm = $('#trib-ent-ncm')?.value?.trim();
    if (!ncm){ alert('Informe o NCM'); return; }
    await fetchJSON(`/api/tributacao/figuras/entrada/${figuraEntSel}/ncm`, { method:'POST', headers, body: JSON.stringify({ ncm_pattern: ncm }) });
    $('#trib-ent-ncm').value = '';
    await recarregarNcmEntrada();
  });

  $('#btn-trib-sai-add-ncm')?.addEventListener('click', async () => {
    if (!figuraSaiSel){ alert('Selecione uma figura de saída'); return; }
    const ncm = $('#trib-sai-ncm')?.value?.trim();
    if (!ncm){ alert('Informe o NCM'); return; }
    await fetchJSON(`/api/tributacao/figuras/saida/${figuraSaiSel}/ncm`, { method:'POST', headers, body: JSON.stringify({ ncm_pattern: ncm }) });
    $('#trib-sai-ncm').value = '';
    await recarregarNcmSaida();
  });

  // Vínculo por produto
  $('#btn-trib-prod-carregar')?.addEventListener('click', async () => {
    const pid = $('#trib-prod-id')?.value?.trim();
    if (!pid){ alert('Informe o ID do produto'); return; }
    try {
      const data = await fetchJSON(`/api/tributacao/produtos/${pid}/figuras`, { headers });
      if (data?.figura_entrada?.figura_entrada_id) $('#trib-prod-ent').value = String(data.figura_entrada.figura_entrada_id);
      else $('#trib-prod-ent').value = '';
      if (data?.figura_saida?.figura_saida_id) $('#trib-prod-sai').value = String(data.figura_saida.figura_saida_id);
      else $('#trib-prod-sai').value = '';
    } catch (e) { alert('Falha ao carregar vínculos'); }
  });

  $('#btn-trib-prod-salvar')?.addEventListener('click', async () => {
    const pid = $('#trib-prod-id')?.value?.trim();
    if (!pid){ alert('Informe o ID do produto'); return; }
    const ent = $('#trib-prod-ent')?.value || '';
    const sai = $('#trib-prod-sai')?.value || '';
    const body = {
      figura_entrada_id: ent ? parseInt(ent,10) : null,
      figura_saida_id: sai ? parseInt(sai,10) : null
    };
    try {
      await fetchJSON(`/api/tributacao/produtos/${pid}/figuras`, { method:'POST', headers, body: JSON.stringify(body) });
      alert('Vínculos salvos');
    } catch (e) { alert('Falha ao salvar vínculos'); }
  });

  // Prévia de Tributação (Saída)
  $('#btn-trib-prev-testar')?.addEventListener('click', async () => {
    const elRes = $('#trib-prev-result');
    const pid = $('#trib-prev-prod-id')?.value?.trim();
    const ncm = $('#trib-prev-ncm')?.value?.trim();
    if (!pid && !ncm){
      elRes.textContent = 'Informe ao menos Produto ID ou NCM.';
      return;
    }
    try {
      const qs = new URLSearchParams();
      if (pid) qs.set('produtoId', pid);
      if (ncm) qs.set('ncm', ncm);
      const data = await fetchJSON(`/api/tributacao/preview/saida?${qs.toString()}`, { headers });
      elRes.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      elRes.textContent = `Erro: ${e.message}`;
    }
  });

  // Inicializar ao abrir página Tributação
  document.addEventListener('DOMContentLoaded', async () => {
    // Carrega listas sempre (não bloqueia outras páginas)
    try { await carregarFigurasEntrada(); } catch {}
    try { await carregarFigurasSaida(); } catch {}
  });
})();
