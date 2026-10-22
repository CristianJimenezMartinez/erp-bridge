/**
 * Bentian ERP Bridge — Dashboard Email OTP Authentication Module
 * Gestión de inicio de sesión mediante correo de facturación y código OTP temporal.
 */

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

async function handleEmailLogin(e) {
  e.preventDefault();
  const input = document.getElementById('login-billing-email');
  const otpInput = document.getElementById('login-billing-otp');
  const otpContainer = document.getElementById('email-otp-container');
  const btnText = document.getElementById('btn-login-email-text');
  const email = input ? input.value.trim() : '';
  const otp = (otpInput && otpContainer && !otpContainer.classList.contains('hidden')) ? otpInput.value.trim() : '';
  if (!email) return;

  // Detección proactiva si es Superadministrador
  if (email.toLowerCase().startsWith('admin@') || email.toLowerCase().includes('cristianjm.com')) {
    if (typeof window.switchLoginMode === 'function') window.switchLoginMode('admin');
    const adminEmailInput = document.getElementById('login-email');
    if (adminEmailInput) adminEmailInput.value = email;
    const adminPassInput = document.getElementById('login-password');
    if (adminPassInput) adminPassInput.focus();
    if (typeof window.showToast === 'function') {
      window.showToast('Identificado como Administrador. Introduce tu contraseña de control.', 'info');
    }
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
      if (typeof window.setSession === 'function') {
        window.setSession(data.token, data.user?.role || 'TENANT_CLIENT', data.user?.organizationId || 'org_default', email);
      }
      if (typeof window.showDashboard === 'function') window.showDashboard();
      if (typeof window.showToast === 'function') window.showToast('✓ Acceso concedido', 'success');
    } else if (res.ok && data.requireOtp) {
      if (otpContainer) otpContainer.classList.remove('hidden');
      if (btnText) btnText.innerText = 'Verificar Código y Acceder';
      if (otpInput) {
        otpInput.focus();
        if (data.debugOtp && !otpInput.value) {
          otpInput.value = data.debugOtp;
        }
      }
      startOtpCooldown(data.cooldownSeconds || 60);
      if (typeof window.showToast === 'function') {
        window.showToast(data.message || 'Código enviado a tu correo', 'info');
      }
    } else {
      if (data.error?.code === 'ADMIN_ACCOUNT') {
        if (typeof window.switchLoginMode === 'function') window.switchLoginMode('admin');
        const adminEmailInput = document.getElementById('login-email');
        if (adminEmailInput) adminEmailInput.value = email;
        const adminPassInput = document.getElementById('login-password');
        if (adminPassInput) adminPassInput.focus();
        if (typeof window.showToast === 'function') window.showToast(data.error.message, 'info');
      } else {
        const errorMsg = data.error?.message || 'Error al iniciar sesión con este correo';
        if (typeof window.showLoginError === 'function') window.showLoginError(errorMsg);
        if (data.error?.retryAfterSeconds) {
          startOtpCooldown(data.error.retryAfterSeconds);
        }
        if (typeof window.showToast === 'function') window.showToast(errorMsg, 'warning');
      }
    }
  } catch (err) {
    if (typeof window.showLoginError === 'function') {
      window.showLoginError('Error de conexión con la API central');
    }
  }
}

async function handleResendOtp(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('login-billing-email');
  const otpInput = document.getElementById('login-billing-otp');
  const email = input ? input.value.trim() : '';

  if (!email) {
    if (typeof window.showLoginError === 'function') {
      window.showLoginError('Introduce tu correo de facturación antes de solicitar el código');
    }
    return;
  }

  const btn = document.getElementById('btn-resend-otp');
  if (btn && btn.disabled) return;

  if (otpInput) otpInput.value = '';
  if (typeof window.showToast === 'function') {
    window.showToast('Solicitando reenvío de código...', 'info');
  }

  try {
    const res = await fetch('/api/v1/auth/email-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok && data.requireOtp) {
      startOtpCooldown(data.cooldownSeconds || 60);
      if (typeof window.showToast === 'function') {
        window.showToast(data.message || 'Nuevo código enviado a tu correo', 'info');
      }
      const err = document.getElementById('login-error');
      if (err) err.classList.add('hidden');
      if (otpInput) otpInput.focus();
    } else {
      const errorMsg = data.error?.message || 'No fue posible reenviar el código';
      if (typeof window.showLoginError === 'function') window.showLoginError(errorMsg);
      if (data.error?.retryAfterSeconds) {
        startOtpCooldown(data.error.retryAfterSeconds);
      }
      if (typeof window.showToast === 'function') window.showToast(errorMsg, 'warning');
    }
  } catch (err) {
    if (typeof window.showLoginError === 'function') {
      window.showLoginError('Error de red al solicitar el reenvío');
    }
  }
}

// Exposición global
window.handleEmailLogin = handleEmailLogin;
window.handleResendOtp = handleResendOtp;
window.startOtpCooldown = startOtpCooldown;
