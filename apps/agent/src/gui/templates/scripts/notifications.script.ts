export const notificationsScript = `
    // ================= CENTRO DE NOTIFICACIONES MULTICANAL =================
    function toggleOrderAlertsSection(enabled) {
      const panel = document.getElementById('order-alerts-panel');
      if (panel) {
        panel.style.display = enabled ? 'block' : 'none';
      }
    }

    function toggleTelegramSection(enabled) {
      const panel = document.getElementById('telegram-alerts-panel');
      if (panel) {
        panel.style.display = enabled ? 'block' : 'none';
      }
    }

    function toggleDiscordSection(enabled) {
      const panel = document.getElementById('discord-alerts-panel');
      if (panel) {
        panel.style.display = enabled ? 'block' : 'none';
      }
    }

    async function saveNotificationSettings() {
      const emailEnabled = document.getElementById('check-order-alerts-enabled')?.checked || false;
      const email = (document.getElementById('input-notif-email')?.value || '').trim();
      const smtpHost = (document.getElementById('input-notif-smtp-host')?.value || '').trim();
      const smtpPort = parseInt(document.getElementById('input-notif-smtp-port')?.value, 10) || 465;
      const smtpUser = (document.getElementById('input-notif-smtp-user')?.value || '').trim();
      const smtpPass = document.getElementById('input-notif-smtp-pass')?.value || '';
      const smtpFrom = (document.getElementById('input-notif-smtp-from')?.value || '').trim();

      const tgEnabled = document.getElementById('check-telegram-alerts-enabled')?.checked || false;
      const tgToken = (document.getElementById('input-notif-telegram-token')?.value || '').trim();
      const tgChatId = (document.getElementById('input-notif-telegram-chatid')?.value || '').trim();

      const discordEnabled = document.getElementById('check-discord-alerts-enabled')?.checked || false;
      const discordWebhook = (document.getElementById('input-notif-discord-webhook')?.value || '').trim();

      if (emailEnabled && !email) {
        showToast('Indica al menos un correo de destino para las alertas por email.', 'warn');
        return;
      }

      if (emailEnabled && (!smtpHost || !smtpUser)) {
        showToast('Para activar alertas por email debes configurar el servidor SMTP propio (Host y Usuario).', 'warn');
        return;
      }

      if (tgEnabled && (!tgToken || !tgChatId)) {
        showToast('Para activar Telegram debes indicar el Bot Token y el Chat ID.', 'warn');
        return;
      }

      if (discordEnabled && !discordWebhook) {
        showToast('Para activar Discord debes indicar la URL del Webhook.', 'warn');
        return;
      }

      const payload = {
        notifications: {
          orderAlertsEnabled: emailEnabled,
          alertEmail: email,
          smtpHost: smtpHost,
          smtpPort: smtpPort,
          smtpUser: smtpUser,
          smtpPass: smtpPass,
          smtpFrom: smtpFrom,
          telegramAlertsEnabled: tgEnabled,
          telegramBotToken: tgToken,
          telegramChatId: tgChatId,
          discordAlertsEnabled: discordEnabled,
          discordWebhookUrl: discordWebhook,
        }
      };

      await submitConfigUpdates(payload, 'Configuración de notificaciones guardada con éxito.');
    }

    async function testOrderEmail() {
      const btn = document.getElementById('btn-test-email');
      const email = (document.getElementById('input-notif-email')?.value || '').trim();
      const host = (document.getElementById('input-notif-smtp-host')?.value || '').trim();
      const user = (document.getElementById('input-notif-smtp-user')?.value || '').trim();

      if (!email) {
        showToast('Escribe primero un correo de destino para la prueba', 'warn');
        return;
      }
      if (!host || !user) {
        showToast('Completa el servidor SMTP y usuario de envío para la prueba', 'warn');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Enviando prueba SMTP...';
      }
      showToast('Enviando correo de prueba a ' + email + ' vía SMTP propio...');

      try {
        const payload = {
          notifications: {
            orderAlertsEnabled: true,
            alertEmail: email,
            smtpHost: host,
            smtpPort: parseInt(document.getElementById('input-notif-smtp-port')?.value, 10) || 465,
            smtpUser: user,
            smtpPass: document.getElementById('input-notif-smtp-pass')?.value || '',
            smtpFrom: (document.getElementById('input-notif-smtp-from')?.value || '').trim(),
          }
        };

        const res = await fetch('/api/local/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
        } else {
          showToast('Aviso: ' + (data.message || 'No se pudo enviar el correo'), 'warn');
        }
      } catch (err) {
        showToast('Error al conectar para enviar la prueba de correo', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> <span>Enviar Correo de Prueba</span>';
        }
      }
    }

    async function testTelegramAlert() {
      const btn = document.getElementById('btn-test-telegram');
      const token = (document.getElementById('input-notif-telegram-token')?.value || '').trim();
      const chatId = (document.getElementById('input-notif-telegram-chatid')?.value || '').trim();

      if (!token || !chatId) {
        showToast('Introduce el Bot Token y el Chat ID para probar Telegram', 'warn');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Conectando con Telegram...';
      }
      showToast('Enviando mensaje de prueba a Telegram...');

      try {
        const payload = {
          notifications: {
            telegramAlertsEnabled: true,
            telegramBotToken: token,
            telegramChatId: chatId,
          }
        };

        const res = await fetch('/api/local/test-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
        } else {
          showToast('Aviso: ' + (data.message || 'Fallo al enviar a Telegram'), 'warn');
        }
      } catch (err) {
        showToast('Error de red al probar bot de Telegram', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> <span>Enviar Mensaje de Prueba a Telegram</span>';
        }
      }
    }

    async function testDiscordAlert() {
      const btn = document.getElementById('btn-test-discord');
      const webhookUrl = (document.getElementById('input-notif-discord-webhook')?.value || '').trim();

      if (!webhookUrl) {
        showToast('Pega la URL del Webhook de Discord para realizar la prueba', 'warn');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Enviando tarjeta a Discord...';
      }
      showToast('Enviando tarjeta de prueba a Discord...');

      try {
        const payload = {
          notifications: {
            discordAlertsEnabled: true,
            discordWebhookUrl: webhookUrl,
          }
        };

        const res = await fetch('/api/local/test-discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
        } else {
          showToast('Aviso: ' + (data.message || 'Fallo al enviar a Discord'), 'warn');
        }
      } catch (err) {
        showToast('Error de red al probar Webhook de Discord', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> <span>Enviar Tarjeta de Prueba a Discord</span>';
        }
      }
    }

    window.toggleOrderAlertsSection = toggleOrderAlertsSection;
    window.toggleTelegramSection = toggleTelegramSection;
    window.toggleDiscordSection = toggleDiscordSection;
    window.saveNotificationSettings = saveNotificationSettings;
    window.testOrderEmail = testOrderEmail;
    window.testTelegramAlert = testTelegramAlert;
    window.testDiscordAlert = testDiscordAlert;
`;
