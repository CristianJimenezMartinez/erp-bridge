/**
 * Bentian ERP Bridge — Dashboard Authentication Module
 * Manejo de sesiones multi-modo (Clave Licencia, Email Cliente, Partner Reseller, Superadmin) y tokens.
 */

window.currentAuthToken = localStorage.getItem('bentian_cloud_token') || '';
window.currentOrgId = localStorage.getItem('bentian_cloud_org') || 'org_default';
window.currentUserRole = localStorage.getItem('bentian_cloud_role') || 'TENANT_CLIENT';
window.currentClientData = null;

function setSession(token, role, org, email) {
  window.currentAuthToken = token;
  window.currentUserRole = role;
  window.currentOrgId = org;
  localStorage.setItem('bentian_cloud_token', token);
  localStorage.setItem('bentian_cloud_role', role);
  localStorage.setItem('bentian_cloud_org', org);
  localStorage.setItem('bentian_cloud_email', email);
}

function switchLoginMode(mode) {
  const modes = ['key', 'email', 'partner', 'admin'];
  modes.forEach(m => {
    const form = document.getElementById('login-form-' + m);
    const btn = document.getElementById('tab-btn-' + m);
    if (form) {
      if (m === mode) form.classList.remove('hidden');
      else form.classList.add('hidden');
    }
    if (btn) {
      if (m === mode) {
        btn.className = 'flex-1 pb-2 border-b-2 border-indigo-500 text-indigo-400 font-semibold text-center transition-colors';
      } else {
        btn.className = 'flex-1 pb-2 border-b-2 border-transparent text-zinc-400 hover:text-white text-center transition-colors';
      }
    }
  });
  const err = document.getElementById('login-error');
  if (err) err.classList.add('hidden');
}

function showLogin() {
  const loginView = document.getElementById('login-view');
  const dashView = document.getElementById('dashboard-view');
  if (loginView) loginView.classList.remove('hidden');
  if (dashView) dashView.classList.add('hidden');
}

function showDashboard() {
  const loginView = document.getElementById('login-view');
  const dashView = document.getElementById('dashboard-view');
  if (loginView) loginView.classList.add('hidden');
  if (dashView) dashView.classList.remove('hidden');

  const savedEmail = localStorage.getItem('bentian_cloud_email') || 'Usuario';
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) userDisplay.innerText = savedEmail;
  const ddEmail = document.getElementById('dropdown-user-email');
  if (ddEmail) ddEmail.innerText = savedEmail;
  const avChar = document.getElementById('user-avatar-char');
  if (avChar) avChar.innerText = (savedEmail[0] || 'U').toUpperCase();

  window.currentUserRole = localStorage.getItem('bentian_cloud_role') || 'TENANT_CLIENT';
  if (typeof window.setupRoleNavigation === 'function') {
    window.setupRoleNavigation(window.currentUserRole);
  }
}

function showLoginError(msg) {
  const err = document.getElementById('login-error');
  const txt = document.getElementById('login-error-text');
  if (err && txt) {
    txt.innerText = msg;
    err.classList.remove('hidden');
  }
}

function handleLogout() {
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.add('hidden');
  localStorage.removeItem('bentian_cloud_token');
  localStorage.removeItem('bentian_cloud_role');
  localStorage.removeItem('bentian_cloud_email');
  localStorage.removeItem('bentian_cloud_org');
  localStorage.removeItem('bentian_cloud_partner_code');
  window.currentAuthToken = '';
  showLogin();
  showToast('Sesión cerrada correctamente', 'info');
}

async function handleAutoLoginWithKey(key) {
  showToast('Accediendo con tu clave de licencia...', 'info');
  try {
    const res = await fetch('/api/v1/auth/license-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setSession(data.token, data.user?.role || 'TENANT_CLIENT', data.user?.organizationId || 'org_default', data.user?.alias || key);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      showDashboard();
      showToast('✓ Sesión iniciada automáticamente desde tu equipo', 'success');
    } else {
      showLogin();
      switchLoginMode('key');
      const input = document.getElementById('login-key-input');
      if (input) input.value = key;
    }
  } catch (e) {
    showLogin();
  }
}

async function handleLicenseKeyLogin(e) {
  e.preventDefault();
  const input = document.getElementById('login-key-input');
  const key = input ? input.value.trim() : '';
  if (!key) return;

  try {
    const res = await fetch('/api/v1/auth/license-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setSession(data.token, data.user?.role || 'TENANT_CLIENT', data.user?.organizationId || 'org_default', data.user?.alias || key);
      showDashboard();
      showToast('✓ Acceso concedido', 'success');
    } else {
      showLoginError(data.error?.message || 'Clave de licencia no válida');
    }
  } catch (err) {
    showLoginError('Error de conexión con la API central');
  }
}

async function handleEmailLogin(e) {
  e.preventDefault();
  const input = document.getElementById('login-billing-email');
  const otpInput = document.getElementById('login-billing-otp');
  const otpContainer = document.getElementById('email-otp-container');
  const btnText = document.getElementById('btn-login-email-text');
  const email = input ? input.value.trim() : '';
  const otp = (otpInput && !otpContainer.classList.contains('hidden')) ? otpInput.value.trim() : '';
  if (!email) return;

  // Detección proactiva si es Superadministrador
  if (email.toLowerCase().startsWith('admin@') || email.toLowerCase().includes('cristianjm.com')) {
    switchLoginMode('admin');
    const adminEmailInput = document.getElementById('login-email');
    if (adminEmailInput) adminEmailInput.value = email;
    const adminPassInput = document.getElementById('login-password');
    if (adminPassInput) adminPassInput.focus();
    showToast('Identificado como Administrador. Introduce tu contraseña de control.', 'info');
    return;
  }

  try {
    const payload = otp ? { email, otp } : { email };
    const res = await fetch('/api/v1/auth/email-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setSession(data.token, data.user?.role || 'TENANT_CLIENT', data.user?.organizationId || 'org_default', email);
      showDashboard();
      showToast('✓ Acceso concedido', 'success');
    } else if (res.ok && data.requireOtp) {
      if (otpContainer) otpContainer.classList.remove('hidden');
      if (btnText) btnText.innerText = 'Verificar Código y Acceder';
      if (otpInput) {
        otpInput.focus();
        if (data.debugOtp && !otpInput.value) {
          otpInput.value = data.debugOtp; // Facilitar modo demo/test local
        }
      }
      startOtpCooldown(data.cooldownSeconds || 60);
      showToast(data.message || 'Código enviado a tu correo', 'info');
    } else {
      if (data.error?.code === 'ADMIN_ACCOUNT') {
        switchLoginMode('admin');
        const adminEmailInput = document.getElementById('login-email');
        if (adminEmailInput) adminEmailInput.value = email;
        const adminPassInput = document.getElementById('login-password');
        if (adminPassInput) adminPassInput.focus();
        showToast(data.error.message, 'info');
      } else {
        const errorMsg = data.error?.message || 'Error al iniciar sesión con este correo';
        showLoginError(errorMsg);
        if (data.error?.retryAfterSeconds) {
          startOtpCooldown(data.error.retryAfterSeconds);
        }
        showToast(errorMsg, 'warning');
      }
    }
  } catch (err) {
    showLoginError('Error de conexión con la API central');
  }
}

let otpCooldownInterval = null;

function startOtpCooldown(seconds) {
  const btn = document.getElementById('btn-resend-otp');
  if (!btn) return;

  if (otpCooldownInterval) {
    clearInterval(otpCooldownInterval);
    otpCooldownInterval = null;
  }

  let remaining = seconds;
  btn.disabled = true;
  btn.innerText = `Reenviar código (${remaining}s)`;

  otpCooldownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(otpCooldownInterval);
      otpCooldownInterval = null;
      btn.disabled = false;
      btn.innerText = 'Reenviar código';
    } else {
      btn.innerText = `Reenviar código (${remaining}s)`;
    }
  }, 1000);
}

async function handleResendOtp(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('login-billing-email');
  const otpInput = document.getElementById('login-billing-otp');
  const email = input ? input.value.trim() : '';

  if (!email) {
    showLoginError('Introduce tu correo de facturación antes de solicitar el código');
    return;
  }

  const btn = document.getElementById('btn-resend-otp');
  if (btn && btn.disabled) return;

  if (otpInput) otpInput.value = '';
  showToast('Solicitando reenvío de código...', 'info');

  try {
    const res = await fetch('/api/v1/auth/email-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok && data.requireOtp) {
      startOtpCooldown(data.cooldownSeconds || 60);
      showToast(data.message || 'Nuevo código enviado a tu correo', 'info');
      const err = document.getElementById('login-error');
      if (err) err.classList.add('hidden');
      if (otpInput) otpInput.focus();
    } else {
      const errorMsg = data.error?.message || 'No fue posible reenviar el código';
      showLoginError(errorMsg);
      if (data.error?.retryAfterSeconds) {
        startOtpCooldown(data.error.retryAfterSeconds);
      }
      showToast(errorMsg, 'warning');
    }
  } catch (err) {
    showLoginError('Error de red al solicitar el reenvío');
  }
}


async function handlePartnerLogin(e) {
  e.preventDefault();
  const partnerCodeEl = document.getElementById('login-partner-code');
  const partnerSecretEl = document.getElementById('login-partner-secret');
  const partnerEmailEl = document.getElementById('login-partner-email');
  const partnerCode = partnerCodeEl ? partnerCodeEl.value.trim() : '';
  const partnerSecret = partnerSecretEl ? partnerSecretEl.value.trim() : '';
  const partnerEmail = partnerEmailEl ? partnerEmailEl.value.trim() : '';
  if (!partnerCode || !partnerSecret) {
    showLoginError('Introduce el código de Partner y su clave secreta');
    return;
  }

  try {
    const res = await fetch('/api/v1/auth/partner-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerCode, partnerSecret, partnerEmail })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('bentian_cloud_partner_code', data.user?.partnerCode || partnerCode);
      setSession(data.token, 'RESELLER', data.user?.organizationId || 'reseller_default', data.user?.email || partnerCode);
      showDashboard();
      showToast(`✓ Bienvenido, Partner ${partnerCode}`, 'success');
    } else {
      showLoginError(data.error?.message || 'Código o clave de partner no reconocido');
    }
  } catch (err) {
    showLoginError('Error de conexión con la API central');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  const email = emailEl ? emailEl.value.trim() : '';
  const pass = passEl ? passEl.value.trim() : '';
  if (!email || !pass) return;

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setSession(data.token, data.user?.role || 'SUPERADMIN', data.user?.organizationId || 'org_default', email);
      showDashboard();
      showToast('✓ Acceso Superadmin concedido', 'success');
    } else {
      showLoginError(data.error?.message || 'Credenciales no válidas');
    }
  } catch (err) {
    showLoginError('Error de conexión con la API central');
  }
}

// Exposición global
window.switchLoginMode = switchLoginMode;
window.showLogin = showLogin;
window.showDashboard = showDashboard;
window.setSession = setSession;
window.showLoginError = showLoginError;
window.handleLogout = handleLogout;
window.handleAutoLoginWithKey = handleAutoLoginWithKey;
window.handleLicenseKeyLogin = handleLicenseKeyLogin;
window.handleEmailLogin = handleEmailLogin;
window.handleResendOtp = handleResendOtp;
window.startOtpCooldown = startOtpCooldown;
window.handlePartnerLogin = handlePartnerLogin;
window.handleLoginSubmit = handleLoginSubmit;

