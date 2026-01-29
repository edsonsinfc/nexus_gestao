// public/js/config.js

// Configuração global do sistema
const token = localStorage.getItem('token');
const apiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Função de mensagem
function showMessage(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 1001;
    padding: 12px 16px; border-radius: 8px; color: white; font-weight: 600;
    background: ${type === 'success' ? '#65f3b8' : '#ff7a7a'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}