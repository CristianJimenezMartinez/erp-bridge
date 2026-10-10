export function renderStatusScript(agentVersion: string = '0.2.0'): string {
  return `
    // Status Polling & Connection Health Resilience
    let _lastStatusPayload = '';
    let _initialFetchCompleted = false;
    let _consecutiveFailures = 0;
    let _isReconnecting = false;
    let _reconnectTimer = null;

    function showConnectionBanner() {
      const banner = document.getElementById('connection-lost-banner');
      if (banner) banner.classList.add('visible');
      const badge = document.getElementById('header-engine-status');
      const dot = document.getElementById('header-engine-dot');
      const txt = document.getElementById('header-engine-text');
      if (badge && dot && txt) {
        badge.style.background = 'rgba(245,158,11,0.12)';
        badge.style.borderColor = 'rgba(245,158,11,0.35)';
        badge.style.color = '#f59e0b';
        dot.style.background = '#f59e0b';
        dot.style.boxShadow = '0 0 6px #f59e0b';
        txt.textContent = 'Reiniciando motor...';
      }
    }

    function hideConnectionBanner() {
      const banner = document.getElementById('connection-lost-banner');
      if (banner) banner.classList.remove('visible');
      const badge = document.getElementById('header-engine-status');
      const dot = document.getElementById('header-engine-dot');
      const txt = document.getElementById('header-engine-text');
      if (badge && dot && txt) {
        badge.style.background = 'rgba(16,185,129,0.1)';
        badge.style.borderColor = 'rgba(16,185,129,0.25)';
        badge.style.color = '#10b981';
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 6px #10b981';
        txt.textContent = 'Motor Autónomo Activo';
      }
    }

    async function fetchStatus(forceFormSync) {
      if (document.hidden && !forceFormSync && _initialFetchCompleted && !_isReconnecting) return;
      try {
        const res = await fetch('/api/local/status');
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        const text = await res.text();
        _initialFetchCompleted = true;

        if (_isReconnecting) {
          _isReconnecting = false;
          _consecutiveFailures = 0;
          hideConnectionBanner();
          if (typeof showToast === 'function') {
            showToast('Enlace con el motor local restablecido.', 'success');
          }
        }
        _consecutiveFailures = 0;

        if (!forceFormSync && text === _lastStatusPayload) {
          return;
        }
        _lastStatusPayload = text;
        currentStatus = JSON.parse(text);
        handleStatusUpdate(currentStatus);
        updateFormInputs(currentStatus, forceFormSync);
        if (typeof loadAutoStart === 'function') {
          loadAutoStart(forceFormSync);
        }
      } catch (err) {
        _consecutiveFailures++;
        if (_consecutiveFailures === 1) {
          console.warn('Servidor local (reintentando reconexión automática):', err); // quality-allow-console (browser template script)
        }
        if (_consecutiveFailures >= 2) {
          _isReconnecting = true;
          showConnectionBanner();
          const countEl = document.getElementById('banner-reconnect-count');
          if (countEl) countEl.textContent = String(_consecutiveFailures);

          // Durante la reconexión, reintentar con sondeo rápido
          if (_reconnectTimer) clearTimeout(_reconnectTimer);
          _reconnectTimer = setTimeout(function() {
            fetchStatus(false);
          }, 1500);
        }
      }
    }

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        fetchStatus(false);
      }
    });

    let _zeroStateCheckDone = false;
    function handleStatusUpdate(data) {
      renderStatus(data);
      if (!_zeroStateCheckDone && data) {
        _zeroStateCheckDone = true;
        try {
          const completed = localStorage.getItem('bentian_onboarding_completed');
          const lic = data.license || {};
          const isLicValid = lic.valid === true || lic.status === 'VALID' || lic.status === 'GRACE_PERIOD';
          const isFactConfigured = !!(data.factusol && data.factusol.configured);

          if (!completed && (!isLicValid || !isFactConfigured)) {
            setTimeout(function() {
              if (typeof openWizardModal === 'function') {
                openWizardModal();
              }
            }, 450);
          }
        } catch (e) {
          console.warn('Incidencia al verificar estado de primer inicio:', e); // quality-allow-console (browser template script)
        }
      }
    }

    function renderStatus(data) {
      if (!data) return;

      document.getElementById('brand-version').textContent = 'v' + (data.agentVersion || '${agentVersion}');
      document.getElementById('sidebar-hostname').textContent = (data.system && data.system.hostname) ? data.system.hostname : 'Local';
      document.getElementById('sidebar-hwid').textContent = data.hwid ? (data.hwid.substring(0, 12) + '...') : '---';

      // Factusol
      const fact = data.factusol || {};
      const cardFBadge = document.getElementById('card-f-badge');
      const cardFMetric = document.getElementById('card-f-metric');
      const cardFPath = document.getElementById('card-f-path');
      const cardFWatcher = document.getElementById('card-f-watcher');

      if (fact.configured && fact.connected) {
        cardFBadge.className = 'tag tag-green';
        cardFBadge.textContent = 'Conectado';
        cardFMetric.textContent = (fact.articleCount !== undefined ? fact.articleCount.toLocaleString('es-ES') : '0') + ' arts.';
        cardFPath.textContent = fact.fileName || fact.databasePath;
        cardFWatcher.textContent = fact.watcherActive ? '● Vigilante activo' : '○ En pausa';
      } else if (fact.configured) {
        cardFBadge.className = 'tag tag-amber';
        cardFBadge.textContent = 'Sin Conexión';
        cardFMetric.textContent = 'Revisando';
        cardFPath.textContent = fact.databasePath || 'Sin ruta';
      } else {
        cardFBadge.className = 'tag tag-rose';
        cardFBadge.textContent = 'No Configurado';
        cardFMetric.textContent = 'Sin Base';
        cardFPath.textContent = 'Pulsa en Ajustar para seleccionar tu archivo';
      }

      const chType = data.channelType || 'universal_bridge';
      const univ = data.universalBridgeSettings || {};
      const wc = data.woocommerceSettings || {};
      const shopify = data.shopifySettings || {};
      const holded = data.holdedSettings || {};

      const cardWcMetric = document.getElementById('card-wc-metric');
      const cardWcUrl = document.getElementById('card-wc-url');
      const cardWcBadge = document.getElementById('card-wc-badge');
      if (chType === 'universal_bridge') {
        if (cardWcMetric) cardWcMetric.textContent = 'Conector Universal';
        if (cardWcUrl) cardWcUrl.textContent = univ.storeUrl || 'Sin configurar';
      } else if (chType === 'shopify') {
        if (cardWcMetric) cardWcMetric.textContent = 'Shopify Store';
        if (cardWcUrl) cardWcUrl.textContent = shopify.shopSubdomain ? (shopify.shopSubdomain + '.myshopify.com') : 'Sin configurar';
      } else if (chType === 'holded') {
        if (cardWcMetric) cardWcMetric.textContent = 'Holded Cloud ERP';
        if (cardWcUrl) cardWcUrl.textContent = holded.apiKey ? 'API Key Configurada' : 'Sin configurar';
      } else {
        if (cardWcMetric) cardWcMetric.textContent = 'WooCommerce';
        if (cardWcUrl) cardWcUrl.textContent = wc.storeUrl || 'Sin configurar';
      }
      if (cardWcBadge) {
        const isConfigured = chType === 'universal_bridge'
          ? !!(univ.storeUrl && univ.storeUrl.trim())
          : (chType === 'shopify'
            ? !!(shopify.shopSubdomain && shopify.accessToken)
            : (chType === 'holded'
              ? !!(holded.apiKey && holded.apiKey.trim())
              : !!(wc.storeUrl && wc.consumerKey)));
        cardWcBadge.className = isConfigured ? 'tag tag-green' : 'tag tag-amber';
        cardWcBadge.textContent = isConfigured ? 'Vinculado' : 'Sin Configurar';
      }

      // Licencia
      const lic = data.license || {};
      const licBadge = document.getElementById('card-lic-badge');
      const licPlan = document.getElementById('card-lic-plan');
      const licKey = document.getElementById('card-lic-key');
      const fullLicStatusBadge = document.getElementById('lic-status-badge');

      if (lic.status === 'VALID' || lic.status === 'GRACE_PERIOD') {
        const isGood = lic.status === 'VALID';
        licBadge.className = isGood ? 'tag tag-green' : 'tag tag-amber';
        licBadge.textContent = isGood ? 'Activa' : 'Gracia Offline';
        fullLicStatusBadge.className = isGood ? 'tag tag-green' : 'tag tag-amber';
        fullLicStatusBadge.textContent = isGood ? 'Licencia Activa' : 'Período Gracia Offline';
        licPlan.textContent = (lic.plan || 'Professional').toUpperCase();
        document.getElementById('lic-plan-name').value = (lic.plan || 'Professional').toUpperCase();
        const bannerExpired = document.getElementById('lic-expired-banner');
        if (bannerExpired) bannerExpired.style.display = 'none';
      } else {
        const isExpired = lic.status === 'EXPIRED';
        licBadge.className = 'tag tag-rose';
        licBadge.textContent = isExpired ? 'Beta Finalizada' : 'Sin Licencia';
        fullLicStatusBadge.className = 'tag tag-rose';
        fullLicStatusBadge.textContent = isExpired ? 'Beta Finalizada' : 'No Activada';
        const bannerExpired = document.getElementById('lic-expired-banner');
        if (bannerExpired) bannerExpired.style.display = isExpired ? 'block' : 'none';
      }

      if (data.licenseKey) {
        licKey.textContent = data.licenseKey;
      }
      document.getElementById('lic-hwid-val').value = data.hwid || '';

      // Logs
      allLogs = data.recentEvents || [];
      renderLogs(allLogs);

      // Historial
      if (data.syncHistory) {
        renderHistoryTable(data.syncHistory);
      }

      // Estado de actualización (Botón de cabecera y Banner Zen estilo Google/Antigravity)
      const upd = data.update;
      const btnHeader = document.getElementById('btn-update-restart');
      const btnHeaderText = document.getElementById('btn-update-text');
      const bannerOverview = document.getElementById('overview-update-banner');
      const bannerTitle = document.getElementById('update-banner-title');
      const bannerDesc = document.getElementById('update-banner-desc');
      const bannerBtnText = document.getElementById('btn-update-banner-text');

      if (upd && (upd.status === 'ready' || upd.status === 'available' || upd.status === 'downloading' || upd.pendingUpdate)) {
        const targetVer = upd.pendingUpdate ? ('v' + upd.pendingUpdate.version) : '';
        let btnLabel = 'Actualizar ' + targetVer;
        let bannerText = 'Hay una nueva versión disponible para instalar.';

        if (upd.status === 'ready') {
          btnLabel = 'Reiniciar para actualizar ' + targetVer;
          bannerText = 'La actualización ' + targetVer + ' está lista. Haz clic para reiniciar y aplicar.';
        } else if (upd.status === 'downloading') {
          const pct = upd.downloadProgress ? (upd.downloadProgress.percentage || 0) : 0;
          btnLabel = 'Descargando ' + targetVer + ' (' + pct + '%)...';
          bannerText = 'Descargando nueva versión en segundo plano (' + pct + '%)...';
        } else if (upd.status === 'applying') {
          btnLabel = 'Aplicando actualización...';
          bannerText = 'Instalando actualización y reiniciando el servicio...';
        }

        if (btnHeader) {
          btnHeader.style.display = 'inline-flex';
          if (btnHeaderText) btnHeaderText.textContent = btnLabel;
        }
        if (bannerOverview) {
          bannerOverview.style.display = 'flex';
          if (bannerTitle) bannerTitle.textContent = 'Actualización ' + targetVer + ' disponible';
          if (bannerDesc) bannerDesc.textContent = bannerText;
          if (bannerBtnText) bannerBtnText.textContent = btnLabel;
        }
      } else {
        if (btnHeader) btnHeader.style.display = 'none';
        if (bannerOverview) bannerOverview.style.display = 'none';
      }

      // Pre-Flight Health EDR Semáforos
      if (data.preflight) {
        renderPreflight(data.preflight);
      }

      // Zen Hero y Alertas Proactivas en Lenguaje Natural con Deep-Linking
      renderZenHeroAndAlerts(data);
    }

    let _currentZenAlertAction = null;
    let _currentZenPrimaryAction = null;

    function handleZenAlertClick() {
      if (_currentZenAlertAction && typeof _currentZenAlertAction === 'function') {
        _currentZenAlertAction();
      }
    }

    function handleZenPrimaryAction() {
      if (_currentZenPrimaryAction && typeof _currentZenPrimaryAction === 'function') {
        _currentZenPrimaryAction();
      } else {
        triggerManualSync();
      }
    }

    function renderZenHeroAndAlerts(data) {
      if (!data) return;

      const fact = data.factusol || {};
      const chType = data.channelType || 'universal_bridge';
      const univ = data.universalBridgeSettings || {};
      const wc = data.woocommerceSettings || {};
      const shopify = data.shopifySettings || {};
      const lic = data.license || {};

      const banner = document.getElementById('zen-alert-banner');
      const bannerTitle = document.getElementById('zen-alert-title');
      const bannerDesc = document.getElementById('zen-alert-desc');
      const bannerBtnText = document.getElementById('zen-alert-btn-text');
      const bannerIconBox = document.getElementById('zen-alert-icon-box');

      const heroCard = document.getElementById('zen-hero-card');
      const badge = document.getElementById('zen-badge');
      const badgeDot = document.getElementById('zen-badge-dot');
      const badgeText = document.getElementById('zen-badge-text');
      const zenTitle = document.getElementById('zen-title');
      const zenSub = document.getElementById('zen-sub');
      const primaryBtn = document.getElementById('zen-primary-btn');
      const primaryBtnText = document.getElementById('zen-primary-btn-text');
      const primaryBtnIcon = document.getElementById('zen-primary-btn-icon');

      const isFactMissing = !fact.configured;
      const isFactOffline = fact.configured && !fact.connected;

      const isChannelConfigured = chType === 'universal_bridge' 
        ? !!(univ.storeUrl && univ.storeUrl.trim())
        : (chType === 'shopify'
          ? !!(shopify.shopSubdomain && shopify.shopSubdomain.trim() && shopify.accessToken && shopify.accessToken.trim())
          : (chType === 'holded'
            ? !!(holded.apiKey && holded.apiKey.trim())
            : !!(wc.storeUrl && wc.storeUrl.trim() && wc.consumerKey && wc.consumerKey.trim())));

      const isLicenseActive = lic.status === 'VALID' || lic.status === 'GRACE_PERIOD';

      // 1. Caso Factusol Desconectado
      if (isFactOffline) {
        if (banner) {
          banner.style.display = 'flex';
          banner.style.background = 'rgba(255, 255, 255, 0.03)';
          banner.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          if (bannerTitle) bannerTitle.textContent = 'Desconexión detectada con Factusol ERP';
          if (bannerDesc) bannerDesc.textContent = 'La ruta está registrada pero la base de datos no responde. Comprueba si la unidad de red o NAS está encendida y accesible.';
          if (bannerBtnText) bannerBtnText.textContent = 'Solucionar en Factusol ERP →';
          if (bannerIconBox) {
            bannerIconBox.style.background = 'rgba(255, 255, 255, 0.06)';
            bannerIconBox.style.color = '#f87171';
          }
          _currentZenAlertAction = function() {
            navigateToResolution('factusol', 'input-factusol-db');
          };
        }

        if (heroCard) {
          heroCard.style.background = 'rgba(255, 255, 255, 0.03)';
          heroCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        if (badge) {
          badge.style.background = 'rgba(255, 255, 255, 0.06)';
          badge.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          badge.style.color = '#f87171';
        }
        if (badgeDot) badgeDot.style.background = '#f87171';
        if (badgeText) badgeText.textContent = 'Factusol Desconectado';
        if (zenTitle) zenTitle.textContent = 'No se puede acceder a la base de datos de Factusol';
        if (zenSub) zenSub.textContent = 'La sincronización automática está pausada porque no se encuentra el archivo .accdb. Revisa la ruta o reconecta tu unidad de red para continuar.';
        if (primaryBtn) {
          primaryBtn.className = 'btn btn-primary btn-lg';
          primaryBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          primaryBtn.style.boxShadow = '0 4px 20px rgba(239,68,68,0.35)';
        }
        if (primaryBtnText) primaryBtnText.textContent = 'Solucionar en Factusol ERP →';
        if (primaryBtnIcon) primaryBtnIcon.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
        _currentZenPrimaryAction = function() {
          navigateToResolution('factusol', 'input-factusol-db');
        };
        return;
      }

      // 2. Caso Factusol Sin Configurar
      if (isFactMissing) {
        if (banner) {
          banner.style.display = 'flex';
          banner.style.background = 'rgba(255, 255, 255, 0.03)';
          banner.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          if (bannerTitle) bannerTitle.textContent = 'Factusol ERP pendiente de configurar';
          if (bannerDesc) bannerDesc.textContent = 'Indica dónde se encuentra el archivo de datos de tu empresa (.accdb) para que el agente empiece a trabajar.';
          if (bannerBtnText) bannerBtnText.textContent = 'Configurar Factusol ERP →';
          if (bannerIconBox) {
            bannerIconBox.style.background = 'rgba(255, 255, 255, 0.06)';
            bannerIconBox.style.color = '#fbbf24';
          }
          _currentZenAlertAction = function() {
            navigateToResolution('factusol', 'input-factusol-db');
          };
        }

        if (heroCard) {
          heroCard.style.background = 'rgba(255, 255, 255, 0.03)';
          heroCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        if (badge) {
          badge.style.background = 'rgba(255, 255, 255, 0.06)';
          badge.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          badge.style.color = '#fbbf24';
        }
        if (badgeDot) badgeDot.style.background = '#fbbf24';
        if (badgeText) badgeText.textContent = 'Configuración Inicial';
        if (zenTitle) zenTitle.textContent = 'Conecta tu Factusol para comenzar a sincronizar';
        if (zenSub) zenSub.textContent = 'Selecciona tu archivo de Factusol con un clic o deja que el agente lo auto-detecte en tus carpetas habituales.';
        if (primaryBtn) {
          primaryBtn.className = 'btn btn-primary btn-lg';
          primaryBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
          primaryBtn.style.boxShadow = '0 4px 20px rgba(245,158,11,0.35)';
        }
        if (primaryBtnText) primaryBtnText.textContent = 'Configurar Factusol ERP →';
        if (primaryBtnIcon) primaryBtnIcon.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
        _currentZenPrimaryAction = function() {
          navigateToResolution('factusol', 'input-factusol-db');
        };
        return;
      }

      // 3. Caso Canal Web No Configurado
      if (!isChannelConfigured) {
        const targetInput = chType === 'woocommerce' ? 'input-wc-url' : (chType === 'shopify' ? 'input-shopify-subdomain' : 'input-universal-url');
        if (banner) {
          banner.style.display = 'flex';
          banner.style.background = 'rgba(255, 255, 255, 0.03)';
          banner.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          if (bannerTitle) bannerTitle.textContent = 'Falta vincular tu Tienda Online';
          if (bannerDesc) bannerDesc.textContent = 'Factusol está preparado con ' + (fact.articleCount || 0).toLocaleString('es-ES') + ' artículos listos. Añade la dirección de tu web para publicar precios y recibir pedidos.';
          if (bannerBtnText) bannerBtnText.textContent = 'Revisar Tienda Online →';
          if (bannerIconBox) {
            bannerIconBox.style.background = 'rgba(255, 255, 255, 0.06)';
            bannerIconBox.style.color = '#60a5fa';
          }
          _currentZenAlertAction = function() {
            navigateToResolution('channel', targetInput);
          };
        }

        if (heroCard) {
          heroCard.style.background = 'rgba(255, 255, 255, 0.03)';
          heroCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        if (badge) {
          badge.style.background = 'rgba(255, 255, 255, 0.06)';
          badge.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          badge.style.color = '#60a5fa';
        }
        if (badgeDot) badgeDot.style.background = '#60a5fa';
        if (badgeText) badgeText.textContent = 'Tienda Online sin vincular';
        if (zenTitle) zenTitle.textContent = 'Enlaza tu tienda web para publicar tu catálogo';
        if (zenSub) zenSub.textContent = 'Tu Factusol está conectado. Solo falta indicar la web de tu comercio para que la sincronización bidireccional comience a operar.';
        if (primaryBtn) {
          primaryBtn.className = 'btn btn-primary btn-lg';
          primaryBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
          primaryBtn.style.boxShadow = '0 4px 20px rgba(59,130,246,0.35)';
        }
        if (primaryBtnText) primaryBtnText.textContent = 'Revisar Tienda Online →';
        if (primaryBtnIcon) primaryBtnIcon.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>';
        _currentZenPrimaryAction = function() {
          navigateToResolution('channel', targetInput);
        };
        return;
      }

      // 4. Caso Licencia Pendiente
      if (!isLicenseActive) {
        const isBetaOpen = Date.now() <= new Date('2026-12-31T23:59:59Z').getTime();
        if (banner) {
          banner.style.display = 'flex';
          banner.style.background = 'rgba(255, 255, 255, 0.03)';
          banner.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          if (bannerTitle) bannerTitle.textContent = isBetaOpen ? 'Licencia requerida — Beta Pública Gratuita' : 'Licencia del puesto requerida';
          if (bannerDesc) bannerDesc.textContent = isBetaOpen
            ? 'Introduce tu clave o solicita tu clave gratuita de la Beta Pública (válida hasta el 31 de Diciembre) en bridge.cristianjm.com/beta/'
            : 'Introduce tu clave de suscripción para activar la sincronización desatendida y el control de existencias.';
          if (bannerBtnText) bannerBtnText.textContent = isBetaOpen ? 'Activar / Pedir Clave Beta →' : 'Activar Licencia →';
          if (bannerIconBox) {
            bannerIconBox.style.background = 'rgba(255, 255, 255, 0.06)';
            bannerIconBox.style.color = '#f87171';
          }
          _currentZenAlertAction = function() {
            navigateToResolution('license', 'input-lic-key');
          };
        }

        if (heroCard) {
          heroCard.style.background = 'rgba(255, 255, 255, 0.03)';
          heroCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        if (badge) {
          badge.style.background = 'rgba(255, 255, 255, 0.06)';
          badge.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          badge.style.color = '#f87171';
        }
        if (badgeDot) badgeDot.style.background = '#f87171';
        if (badgeText) badgeText.textContent = isBetaOpen ? 'Beta Pública Gratuita Disponible' : 'Licencia Pendiente';
        if (zenTitle) zenTitle.textContent = isBetaOpen ? 'Prueba Bentian gratis con la Beta Pública 2026' : 'Activa la licencia de este equipo';
        if (zenSub) zenSub.textContent = isBetaOpen
          ? 'Introduce tu clave o consigue al instante una clave gratuita de la Beta Pública (válida hasta el 31 de Diciembre de 2026) para sincronizar sin coste.'
          : 'Introduce la clave de tu suscripción para desbloquear el motor autónomo de sincronización en tiempo real.';
        if (primaryBtn) {
          primaryBtn.className = 'btn btn-primary btn-lg';
          primaryBtn.style.background = isBetaOpen ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #ef4444, #dc2626)';
          primaryBtn.style.boxShadow = isBetaOpen ? '0 4px 20px rgba(99,102,241,0.35)' : '0 4px 20px rgba(239,68,68,0.35)';
        }
        if (primaryBtnText) primaryBtnText.textContent = isBetaOpen ? 'Activar o Conseguir Clave Beta →' : 'Activar Licencia →';
        if (primaryBtnIcon) primaryBtnIcon.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/></svg>';
        _currentZenPrimaryAction = function() {
          navigateToResolution('license', 'input-lic-key');
        };
        return;
      }

      // 5. Todo Óptimo: Estado Zen Pleno
      if (banner) {
        banner.style.display = 'none';
        _currentZenAlertAction = null;
      }

      if (heroCard) {
        heroCard.style.background = 'rgba(255, 255, 255, 0.03)';
        heroCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }
      if (badge) {
        badge.style.background = 'rgba(16, 185, 129, 0.1)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#34d399';
      }
      if (badgeDot) badgeDot.style.background = '#34d399';
      if (badgeText) badgeText.textContent = 'Sincronización Activa — Todo al día';
      if (zenTitle) zenTitle.textContent = 'Tu tienda web y Factusol están sincronizados';
      if (zenSub) zenSub.textContent = 'El vigilante de Factusol detecta cualquier cambio en existencias o precios en tiempo real y actualiza tu web inmediatamente.';
      if (primaryBtn) {
        primaryBtn.className = 'btn btn-primary btn-lg';
        primaryBtn.style.background = 'var(--primary)';
        primaryBtn.style.boxShadow = '0 4px 20px var(--primary-glow)';
      }
      if (primaryBtnText) primaryBtnText.textContent = 'Forzar Sincronización Manual';
      if (primaryBtnIcon) primaryBtnIcon.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
      _currentZenPrimaryAction = function() {
        triggerManualSync();
      };
    }

    // Inicializar inputs del formulario de forma defensiva para que el sondeo cada 3s no sobreescriba cambios del usuario
    function updateFormInputs(data, force) {
      if (!data) return;
      if (!window.__formInputsInitialized || force) {
        const fact = data.factusol || {};
        const fSettings = data.factusolSettings || {};

        const inputFactDb = document.getElementById('input-factusol-db');
        if (inputFactDb && (force || !inputFactDb.value || document.activeElement !== inputFactDb)) {
          const dbVal = fact.databasePath || fSettings.databasePath || '';
          if (dbVal) {
            inputFactDb.value = dbVal;
          }
        }

        const selTariff = document.getElementById('select-factusol-tariff');
        if (selTariff && fSettings.tariffCode && (force || document.activeElement !== selTariff)) {
          selTariff.value = fSettings.tariffCode;
        }

        const selSaleTariff = document.getElementById('select-factusol-sale-tariff');
        if (selSaleTariff && fSettings.saleTariffCode !== undefined && (force || document.activeElement !== selSaleTariff)) {
          selSaleTariff.value = fSettings.saleTariffCode || '';
        }

        const selWh = document.getElementById('select-factusol-warehouse');
        if (selWh && fSettings.warehouseCode && (force || document.activeElement !== selWh)) {
          selWh.value = fSettings.warehouseCode;
        }

        const inOrderSeries = document.getElementById('input-factusol-order-series');
        if (inOrderSeries && (force || !inOrderSeries.value || document.activeElement !== inOrderSeries)) {
          inOrderSeries.value = fSettings.orderSeries || 'W';
        }

        const chType = data.channelType || 'universal_bridge';
        if (typeof selectChannelType === 'function') {
          selectChannelType(chType);
        }

        const univ = data.universalBridgeSettings || {};
        const inUnivUrl = document.getElementById('input-universal-url');
        if (inUnivUrl && (force || !inUnivUrl.value || document.activeElement !== inUnivUrl)) {
          if (univ.storeUrl || force) inUnivUrl.value = univ.storeUrl || '';
        }

        const inUnivKey = document.getElementById('input-universal-key');
        if (inUnivKey && (force || !inUnivKey.value || document.activeElement !== inUnivKey)) {
          if (univ.secretKey || force) inUnivKey.value = univ.secretKey || '';
        }

        const wc = data.woocommerceSettings || {};
        const inWcUrl = document.getElementById('input-wc-url');
        if (inWcUrl && (force || !inWcUrl.value || document.activeElement !== inWcUrl)) {
          if (wc.storeUrl || force) inWcUrl.value = wc.storeUrl || '';
        }

        const inWcKey = document.getElementById('input-wc-key');
        if (inWcKey && (force || !inWcKey.value || document.activeElement !== inWcKey)) {
          if (wc.consumerKey || force) inWcKey.value = wc.consumerKey || '';
        }

        const inWcSec = document.getElementById('input-wc-secret');
        if (inWcSec && (force || !inWcSec.value || document.activeElement !== inWcSec)) {
          if (wc.consumerSecret || force) inWcSec.value = wc.consumerSecret || '';
        }

        const shopify = data.shopifySettings || {};
        const inShopifySub = document.getElementById('input-shopify-subdomain');
        if (inShopifySub && (force || !inShopifySub.value || document.activeElement !== inShopifySub)) {
          if (shopify.shopSubdomain || force) inShopifySub.value = shopify.shopSubdomain || '';
        }

        const inShopifyTok = document.getElementById('input-shopify-token');
        if (inShopifyTok && (force || !inShopifyTok.value || document.activeElement !== inShopifyTok)) {
          if (shopify.accessToken || force) inShopifyTok.value = shopify.accessToken || '';
        }

        const inShopifyLoc = document.getElementById('input-shopify-location');
        if (inShopifyLoc && (force || !inShopifyLoc.value || document.activeElement !== inShopifyLoc)) {
          if (shopify.locationId || force) inShopifyLoc.value = shopify.locationId || '';
        }

        const holded = data.holdedSettings || {};
        const inHoldedKey = document.getElementById('input-holded-apikey');
        if (inHoldedKey && (force || !inHoldedKey.value || document.activeElement !== inHoldedKey)) {
          if (holded.apiKey || force) inHoldedKey.value = holded.apiKey || '';
        }

        const inHoldedWh = document.getElementById('input-holded-warehouse');
        if (inHoldedWh && (force || !inHoldedWh.value || document.activeElement !== inHoldedWh)) {
          if (holded.defaultWarehouseId || force) inHoldedWh.value = holded.defaultWarehouseId || '';
        }

        // Reglas de Sync
        const rules = data.syncRules || {};
        const chkWatcher = document.getElementById('check-watcher-enabled');
        if (chkWatcher && rules.enableFileWatcher !== undefined && (force || document.activeElement !== chkWatcher)) {
          chkWatcher.checked = rules.enableFileWatcher;
        }

        const inDebounce = document.getElementById('input-debounce-sec');
        if (inDebounce && rules.debounceSeconds && (force || document.activeElement !== inDebounce)) {
          inDebounce.value = rules.debounceSeconds;
        }

        const selInterval = document.getElementById('select-periodic-min');
        if (selInterval && rules.periodicIntervalMinutes && (force || document.activeElement !== selInterval)) {
          selInterval.value = rules.periodicIntervalMinutes;
        }

        const chkStock = document.getElementById('check-sync-stock');
        if (chkStock && rules.syncStock !== undefined && (force || document.activeElement !== chkStock)) {
          chkStock.checked = rules.syncStock;
        }

        const chkPrices = document.getElementById('check-sync-prices');
        if (chkPrices && rules.syncPrices !== undefined && (force || document.activeElement !== chkPrices)) {
          chkPrices.checked = rules.syncPrices;
        }

        const chkDesc = document.getElementById('check-sync-desc');
        if (chkDesc && rules.syncDescriptions !== undefined && (force || document.activeElement !== chkDesc)) {
          chkDesc.checked = rules.syncDescriptions;
        }

        const inSafety = document.getElementById('input-safety-stock');
        if (inSafety && rules.safetyStockBuffer !== undefined && (force || document.activeElement !== inSafety)) {
          inSafety.value = rules.safetyStockBuffer;
        }

        const chkOnlyPos = document.getElementById('check-only-stock-pos');
        if (chkOnlyPos && rules.onlyStockAboveZero !== undefined && (force || document.activeElement !== chkOnlyPos)) {
          chkOnlyPos.checked = rules.onlyStockAboveZero;
        }

        // Notificaciones por Email
        const notif = data.notifications || {};
        const chkAlerts = document.getElementById('check-order-alerts-enabled');
        if (chkAlerts && notif.orderAlertsEnabled !== undefined && (force || document.activeElement !== chkAlerts)) {
          chkAlerts.checked = notif.orderAlertsEnabled;
          if (typeof toggleOrderAlertsSection === 'function') {
            toggleOrderAlertsSection(notif.orderAlertsEnabled);
          }
        }

        const inNotifEmail = document.getElementById('input-notif-email');
        if (inNotifEmail && (force || !inNotifEmail.value || document.activeElement !== inNotifEmail)) {
          if (notif.alertEmail || force) inNotifEmail.value = notif.alertEmail || '';
        }

        const inSmtpHost = document.getElementById('input-notif-smtp-host');
        if (inSmtpHost && (force || !inSmtpHost.value || document.activeElement !== inSmtpHost)) {
          if (notif.smtpHost || force) inSmtpHost.value = notif.smtpHost || '';
        }

        const inSmtpPort = document.getElementById('input-notif-smtp-port');
        if (inSmtpPort && (force || !inSmtpPort.value || document.activeElement !== inSmtpPort)) {
          if (notif.smtpPort || force) inSmtpPort.value = notif.smtpPort || 465;
        }

        const inSmtpUser = document.getElementById('input-notif-smtp-user');
        if (inSmtpUser && (force || !inSmtpUser.value || document.activeElement !== inSmtpUser)) {
          if (notif.smtpUser || force) inSmtpUser.value = notif.smtpUser || '';
        }

        const inSmtpPass = document.getElementById('input-notif-smtp-pass');
        if (inSmtpPass && (force || !inSmtpPass.value || document.activeElement !== inSmtpPass)) {
          if (notif.smtpPass || force) inSmtpPass.value = notif.smtpPass || '';
        }

        const inSmtpFrom = document.getElementById('input-notif-smtp-from');
        if (inSmtpFrom && (force || !inSmtpFrom.value || document.activeElement !== inSmtpFrom)) {
          if (notif.smtpFrom || force) inSmtpFrom.value = notif.smtpFrom || '';
        }

        const inLicKey = document.getElementById('input-lic-key');
        if (inLicKey && data.licenseKey && (force || !inLicKey.value || document.activeElement !== inLicKey)) {
          inLicKey.value = data.licenseKey;
        }

        if (Date.now() > new Date('2026-12-31T23:59:59Z').getTime()) {
          const wizBetaBox = document.getElementById('wiz-beta-promo-box');
          if (wizBetaBox) wizBetaBox.style.display = 'none';
          const licBetaBox = document.getElementById('lic-beta-promo-box');
          if (licBetaBox) licBetaBox.style.display = 'none';
        }

        window.__formInputsInitialized = true;
      }
    }

    let isUpdatingInProgress = false;

    async function triggerRestartUpdate() {
      if (isUpdatingInProgress) return;
      if (!confirm('¿Deseas aplicar la actualización y reiniciar Bentian Agent ahora?')) {
        return;
      }
      isUpdatingInProgress = true;
      const btnHeader = document.getElementById('btn-update-restart');
      const btnHeaderText = document.getElementById('btn-update-text');
      const bannerBtn = document.getElementById('btn-update-banner-action');
      const bannerBtnText = document.getElementById('btn-update-banner-text');

      if (btnHeader) btnHeader.disabled = true;
      if (bannerBtn) bannerBtn.disabled = true;
      if (btnHeaderText) btnHeaderText.textContent = 'Actualizando y reiniciando...';
      if (bannerBtnText) bannerBtnText.textContent = 'Actualizando y reiniciando...';

      showToast('Iniciando proceso de actualización y reinicio...', 'info');

      try {
        const res = await fetch('/api/local/apply-update', { method: 'POST' });
        const result = await res.json();
        if (!res.ok || (result && result.success === false)) {
          showToast((result && result.message) || 'No se pudo iniciar la actualización', 'error');
          isUpdatingInProgress = false;
          if (btnHeader) btnHeader.disabled = false;
          if (bannerBtn) bannerBtn.disabled = false;
          return;
        }

        showToast('Actualización en curso. El agente se reiniciará en breves momentos...', 'success');
        _isReconnecting = true;
        showConnectionBanner();

        // Polling para reconexión y recarga automática
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const check = await fetch('/api/local/status');
            if (check.ok) {
              clearInterval(interval);
              showToast('¡Bentian Agent actualizado y reiniciado con éxito!', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            }
          } catch (e) {
            if (attempts > 60) {
              clearInterval(interval);
              showToast('El agente está tardando en responder. Por favor, recarga la página.', 'warning');
            }
          }
        }, 1500);

      } catch (err) {
        showToast('Error de conexión con el agente: ' + err.message, 'error');
        isUpdatingInProgress = false;
        if (btnHeader) btnHeader.disabled = false;
        if (bannerBtn) bannerBtn.disabled = false;
      }
    }

    function renderPreflight(pf) {
      if (!pf || !pf.checks) return;

      function updateItem(id, check) {
        const badge = document.getElementById('pf-' + id + '-badge');
        const desc = document.getElementById('pf-' + id + '-desc');
        const dot = document.getElementById('pf-' + id + '-dot');
        if (!badge || !desc || !check) return;

        desc.textContent = check.message || '';
        if (check.status === 'OK') {
          badge.className = 'tag tag-green';
          badge.textContent = 'Correcto';
          if (dot) dot.style.background = '#10b981';
        } else if (check.status === 'WARN') {
          badge.className = 'tag tag-amber';
          badge.textContent = 'Atención';
          if (dot) dot.style.background = '#f59e0b';
        } else {
          badge.className = 'tag tag-rose';
          badge.textContent = 'Fallo';
          if (dot) dot.style.background = '#ef4444';
        }
      }

      updateItem('cscript', pf.checks.cscript);
      updateItem('oledb', pf.checks.oledbProvider);
      updateItem('clock', pf.checks.clockDrift);
      updateItem('net', pf.checks.networkStorage);

      const alertBox = document.getElementById('pf-alert-box');
      const alertMsg = document.getElementById('pf-alert-message');
      if (alertBox && alertMsg) {
        const issues = Object.values(pf.checks).filter(function(c) {
          return c && (c.status === 'FAIL' || c.status === 'WARN') && c.recommendation;
        });
        if (issues.length > 0) {
          alertBox.style.display = 'block';
          alertMsg.innerHTML = issues.map(function(i) {
            return '<strong>' + i.name + ':</strong> ' + i.recommendation;
          }).join('<br style="margin-bottom:6px;"/>');
        } else {
          alertBox.style.display = 'none';
        }
      }
    }

    async function refreshPreflight() {
      const btn = document.getElementById('btn-refresh-preflight');
      if (btn) {
        btn.disabled = true;
        const textSpan = btn.querySelector('span');
        if (textSpan) textSpan.textContent = 'Analizando...';
      }
      try {
        const res = await fetch('/api/local/preflight?force=true');
        if (res.ok) {
          const pf = await res.json();
          renderPreflight(pf);
          showToast('Diagnóstico Pre-Flight actualizado', 'success');
        }
      } catch (err) {
        showToast('Error al ejecutar diagnóstico preflight: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          const textSpan = btn.querySelector('span');
          if (textSpan) textSpan.textContent = 'Reanalizar';
        }
      }
    }

    async function manualCheckUpdate() {
      const btn = document.getElementById('btn-check-updates');
      if (btn) btn.disabled = true;
      showToast('Comprobando actualizaciones en el servidor central...', 'info');
      try {
        const res = await fetch('/api/local/check-update', { method: 'POST' });
        const data = await res.json();
        if (data && (data.available || (data.checkResult && data.checkResult.available))) {
          const ver = data.version || (data.checkResult && data.checkResult.version) || '';
          showToast('¡Nueva versión ' + (ver ? 'v' + ver : '') + ' detectada! Iniciando descarga...', 'success');
          await fetchStatus(true);
        } else {
          showToast('Bentian Agent ya está actualizado a la última versión disponible.', 'info');
        }
      } catch (err) {
        showToast('Error al comprobar actualizaciones: ' + err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }
  `;
}
