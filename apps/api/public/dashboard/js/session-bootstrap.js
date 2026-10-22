/**
 * Bentian ERP Bridge — Dashboard Session Bootstrap Module
 * Arranque automático post-pago Stripe, auto-login por clave en URL y verificación `/api/v1/auth/me`.
 */

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutStatus = urlParams.get('checkout');
  const sessionId = urlParams.get('session_id');

  // 1. Flujo Post-Pago de Stripe: canjear session_id por licencia y auto-login
  if (checkoutStatus === 'success' && sessionId) {
    if (typeof window.showToast === 'function') {
      window.showToast('Verificando tu compra con Stripe y activando tu licencia...', 'info');
    }
    try {
      const res = await fetch(`/api/v1/billing/session-license?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        if (typeof window.setSession === 'function') {
          window.setSession(data.token, 'TENANT_CLIENT', data.organizationId || 'org_default', data.email || 'Cliente');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        if (typeof window.showDashboard === 'function') window.showDashboard();

        const keyEl = document.getElementById('welcome-license-key');
        if (keyEl && data.licenseKey) keyEl.innerText = data.licenseKey;

        const modal = document.getElementById('modal-welcome-checkout');
        if (modal) modal.classList.remove('hidden');

        if (typeof window.showToast === 'function') {
          window.showToast('✓ ¡Suscripción y licencia activadas con éxito!', 'success');
        }
        return;
      } else if (typeof window.showToast === 'function') {
        window.showToast(data.error?.message || 'No se pudo validar la sesión de pago de Stripe', 'error');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast('Error de conexión al validar la sesión de pago con Stripe', 'error');
      }
    }
  }

  // 2. Auto-login por clave de licencia en URL (?key= o ?licenseKey=)
  const urlKey = urlParams.get('key') || urlParams.get('licenseKey');
  if (urlKey) {
    if (typeof window.handleAutoLoginWithKey === 'function') {
      await window.handleAutoLoginWithKey(urlKey);
    }
    return;
  }

  // 3. Verificación activa del token guardado contra la API Central
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  if (token) {
    try {
      const meRes = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user;
        if (user && user.role) {
          const verifiedRole = (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? 'SUPERADMIN' : user.role;
          window.currentAuthToken = token;
          window.currentUserRole = verifiedRole;
          window.currentOrgId = user.organizationId || 'org_default';
          localStorage.setItem('bentian_cloud_role', verifiedRole);
          localStorage.setItem('bentian_cloud_org', window.currentOrgId);
          if (user.sub) localStorage.setItem('bentian_cloud_email', user.sub);
          if (typeof window.showDashboard === 'function') window.showDashboard();
          return;
        }
      } else {
        localStorage.removeItem('bentian_cloud_token');
        localStorage.removeItem('bentian_cloud_role');
        window.currentAuthToken = '';
        if (typeof window.showLogin === 'function') window.showLogin();
        return;
      }
    } catch {
      if (typeof window.showDashboard === 'function') window.showDashboard();
      return;
    }
  } else {
    if (typeof window.showLogin === 'function') window.showLogin();
  }
});
