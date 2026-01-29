const $ = (s) => document.querySelector(s);

const form = $('#loginForm');
const feedback = $('#feedback');
const dialog = $('#recoverDialog');
const openRecover = $('#openRecover');
const closeRecover = $('#closeRecover');
const recoverForm = $('#recoverForm');
const recoverFeedback = $('#recoverFeedback');


function setMsg(el, msg, type = 'success') {
  el.classList.remove('error', 'success');
  if (msg) el.classList.add(type);
  el.textContent = msg || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg(feedback, 'Autenticando...', 'success');
  const login = $('#login').value.trim();
  const senha = $('#senha').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, senha })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(feedback, data.message || 'Falha ao autenticar.', 'error');
      return;
    }

    setMsg(feedback, 'Login realizado com sucesso! Redirecionando...', 'success');
    // Salvar token e redirecionar para área administrativa
    if (data.token) localStorage.setItem('token', data.token);
    setTimeout(() => {
      window.location.href = '/admin.html';
    }, 800);
  } catch (err) {
    setMsg(feedback, 'Erro de rede. Tente novamente.', 'error');
  }
});

openRecover.addEventListener('click', () => dialog.showModal());
closeRecover.addEventListener('click', () => dialog.close());

recoverForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  recoverFeedback.textContent = 'Enviando...';
  const email = $('#recoverEmail').value.trim();
  try {
    const res = await fetch('/api/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(recoverFeedback, data.message || 'Não foi possível enviar.', 'error');
      return;
    }
    setMsg(recoverFeedback, data.message || 'Se existir conta, enviaremos instruções.', 'success');
  } catch (err) {
    setMsg(recoverFeedback, 'Erro de rede. Tente novamente.', 'error');
  }
}); 