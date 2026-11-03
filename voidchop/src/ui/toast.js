export function showToast(root, message, { duration = 2500 } = {}) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = message;
  root.appendChild(t);
  setTimeout(() => t.remove(), duration);
  return t;
}
