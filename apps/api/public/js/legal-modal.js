/**
 * Bentian ERP Bridge — Modal Legal y Regulatorio (LSSI-CE, RGPD, Términos, Cookies)
 */
function abrirModalLegal(tab) {
  const modal = document.getElementById('modal-legal');
  if (modal) {
    modal.classList.remove('hidden');
    cambiarPestanaLegal(tab || 'aviso');
  }
}

function cerrarModalLegal() {
  const modal = document.getElementById('modal-legal');
  if (modal) modal.classList.add('hidden');
}

function cambiarPestanaLegal(tab) {
  const tabs = ['aviso', 'privacidad', 'terminos', 'cookies'];
  tabs.forEach(function(t) {
    const btn = document.getElementById('tab-legal-' + t);
    const content = document.getElementById('content-legal-' + t);
    if (btn) {
      if (t === tab) {
        btn.className = 'py-3 px-3 border-b-2 border-indigo-500 text-indigo-400 whitespace-nowrap transition-colors font-semibold';
      } else {
        btn.className = 'py-3 px-3 border-b-2 border-transparent text-zinc-400 hover:text-white whitespace-nowrap transition-colors';
      }
    }
    if (content) {
      if (t === tab) content.classList.remove('hidden');
      else content.classList.add('hidden');
    }
  });
}

window.abrirModalLegal = abrirModalLegal;
window.cerrarModalLegal = cerrarModalLegal;
window.cambiarPestanaLegal = cambiarPestanaLegal;
