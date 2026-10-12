export const factusolScript = `
    // Auto-resolución de carpeta Factusol
    async function handleFactusolInputBlur(inputId) {
      inputId = inputId || 'input-factusol-db';
      const el = document.getElementById(inputId);
      if (!el) return;
      if (typeof cleanPathInput === 'function') cleanPathInput(el);
      if (!el.value.trim()) return;

      try {
        const res = await fetch('/api/local/resolve-factusol-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: el.value.trim() })
        });
        const data = await res.json();
        if (data.success && data.resolvedPath) {
          el.value = data.resolvedPath;
          if (data.isDirectory) {
            showToast(data.message, 'success');
          }
        }
      } catch (err) {}
    }

    // Selector Nativo de Archivos de Windows (STA oficial)
    let isOpeningNativeDialog = false;
    async function openNativeWindowsDialog(isWizard) {
      if (isOpeningNativeDialog) return;
      isOpeningNativeDialog = true;
      const targetIsWizard = !!isWizard;
      const btnNative = document.getElementById('btn-browse-native');
      const btnWizNative = document.getElementById('wiz-btn-browse-native');
      const originalNativeHtml = btnNative ? btnNative.innerHTML : '';
      const originalWizHtml = btnWizNative ? btnWizNative.innerHTML : '';

      const spinnerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Abriendo...';

      if (btnNative) {
        btnNative.disabled = true;
        btnNative.innerHTML = spinnerHTML;
      }
      if (btnWizNative) {
        btnWizNative.disabled = true;
        btnWizNative.innerHTML = spinnerHTML;
      }
      showToast('Abriendo selector de archivos de Windows...', 'info');

      try {
        const targetInput = targetIsWizard 
          ? document.getElementById('wiz-input-fact-path') 
          : document.getElementById('input-factusol-db');
        const currentPath = targetInput ? targetInput.value.trim() : '';

        const res = await fetch('/api/local/open-file-dialog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPath })
        });
        const data = await res.json();
        if (data.success && data.filePath) {
          if (targetInput) {
            targetInput.value = data.filePath;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            handleFactusolInputBlur(targetInput.id);
          }
          // Sincronizar el otro input si está en el DOM
          const otherInput = targetIsWizard
            ? document.getElementById('input-factusol-db')
            : document.getElementById('wiz-input-fact-path');
          if (otherInput) {
            otherInput.value = data.filePath;
          }

          showToast('Base de datos seleccionada: ' + data.filePath, 'success');

          // Disparar comprobación de conexión inmediata
          if (targetIsWizard) {
            await testFactusolConnection('wiz-input-fact-path', 'wiz-fact-alert');
          } else {
            await testFactusolConnection('input-factusol-db', 'fact-test-alert');
          }
        } else if (data.cancelled) {
          // Si el usuario cancela o cierra con la cruz, no hacer nada ni mostrar error
        } else if (data.message) {
          showToast(data.message, 'info');
        }
      } catch (err) {
        console.warn('Selector de archivos de Windows cancelado o cerrado:', err); // quality-allow-console (browser template script)
      } finally {
        isOpeningNativeDialog = false;
        if (btnNative) {
          btnNative.disabled = false;
          btnNative.innerHTML = originalNativeHtml;
        }
        if (btnWizNative) {
          btnWizNative.disabled = false;
          btnWizNative.innerHTML = originalWizHtml;
        }
      }
    }

    function browseFactusol(isWizard) {
      openNativeWindowsDialog(isWizard);
    }

    async function detectFactusol(isWizard) {
      const btn = isWizard 
        ? document.getElementById('wiz-btn-detect-fact') 
        : document.getElementById('btn-detect-fact');
      const originalHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Buscando Factusol...';
      }

      const box = isWizard ? document.getElementById('wiz-fact-detected-box') : document.getElementById('factusol-detected-box');
      const list = isWizard ? document.getElementById('wiz-fact-detected-list') : document.getElementById('factusol-detected-list');
      const label = isWizard ? null : document.getElementById('factusol-detected-label');

      try {
        const res = await fetch('/api/local/detect-factusol', { method: 'POST' });
        const data = await res.json();

        box.style.display = 'block';

        if (data.instances && data.instances.length > 0) {
          if (label) label.textContent = 'Bases de datos encontradas (' + data.instances.length + '):';
          const esc = window.escapeHtml || function(s) { return s; };
          list.innerHTML = data.instances.map(function(inst) {
            const cleanPath = String(inst.databasePath).split('"').join('&quot;');
            const labelText = inst.companyCode ? ('Empresa ' + inst.companyCode + (inst.year ? ' (' + inst.year + ')' : '')) : 'Factusol';
            const sizeMb = inst.fileSizeBytes ? ' • ' + (inst.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
            return '<div data-db-path="' + cleanPath + '" data-is-wiz="' + isWizard + '" onclick="selectFactusolInstance(this.getAttribute(&quot;data-db-path&quot;), this.getAttribute(&quot;data-is-wiz&quot;) === &quot;true&quot;)" style="background: #1e1e26; border: 1px solid var(--card-border); padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; transition: border-color 0.2s;" onmouseover="this.style.borderColor=&quot;#6366f1&quot;" onmouseout="this.style.borderColor=&quot;var(--card-border)&quot;">' +
              '<div><strong>' + esc(labelText) + '</strong>' + sizeMb + '<div style="color: var(--text-subtle); font-family: monospace; font-size: 11px; margin-top: 2px;">' + esc(inst.databasePath) + '</div></div>' +
              '<span class="tag tag-blue" style="margin-left: 8px;">Usar esta</span>' +
            '</div>';
          }).join('');

          // Si el campo de texto está vacío, pre-rellenar con la más reciente
          const targetInput = isWizard ? document.getElementById('wiz-input-fact-path') : document.getElementById('input-factusol-db');
          if (!targetInput.value.trim() && data.instances[0]) {
            targetInput.value = data.instances[0].databasePath;
            const otherInput = isWizard ? document.getElementById('input-factusol-db') : document.getElementById('wiz-input-fact-path');
            if (otherInput) otherInput.value = data.instances[0].databasePath;
            if (isWizard) {
              await testFactusolConnection('wiz-input-fact-path', 'wiz-fact-alert');
            } else {
              await testFactusolConnection('input-factusol-db', 'fact-test-alert');
            }
          }
          showToast('Se encontraron ' + data.instances.length + ' bases de datos Factusol', 'success');
        } else {
          if (label) label.textContent = 'Resultado del escaneo:';
          list.innerHTML = 
            '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #e4e4e7; line-height: 1.5;">' +
              '<div style="display:flex;align-items:center;gap:6px;font-weight:600;color:#fbbf24;margin-bottom:4px;">' +
                (typeof renderIcon === 'function' ? renderIcon('warn') : '') +
                '<span>No se detectó Factusol en las carpetas por defecto:</span>' +
              '</div>' +
              '<div style="color: var(--text-muted); margin-top: 4px;">' +
                'Se buscaron archivos en las carpetas habituales (<code>C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\...</code>), pero no se detectaron instalaciones estándar.<br>' +
                'Si tienes tu empresa en otra carpeta, disco de red o pendrive, pulsa en <strong>Examinar en Windows</strong> para seleccionarla directamente.' +
              '</div>' +
            '</div>';
          showToast('No se encontró Factusol en rutas habituales. Usa "Examinar en Windows".', 'warn');
        }
      } catch (err) {
        showToast('Error al escanear discos', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }
    }

    function selectFactusolInstance(dbPath, isWizard) {
      const targetInput = isWizard ? document.getElementById('wiz-input-fact-path') : document.getElementById('input-factusol-db');
      if (targetInput) targetInput.value = dbPath;
      const otherInput = isWizard ? document.getElementById('input-factusol-db') : document.getElementById('wiz-input-fact-path');
      if (otherInput) otherInput.value = dbPath;

      if (isWizard) {
        const box = document.getElementById('wiz-fact-detected-box');
        if (box) box.style.display = 'none';
        testFactusolConnection('wiz-input-fact-path', 'wiz-fact-alert');
      } else {
        const box = document.getElementById('factusol-detected-box');
        if (box) box.style.display = 'none';
        testFactusolConnection('input-factusol-db', 'fact-test-alert');
      }
    }

    async function testFactusolConnection(inputId, alertId) {
      inputId = inputId || 'input-factusol-db';
      alertId = alertId || 'fact-test-alert';
      const inputEl = document.getElementById(inputId);
      const dbPath = (typeof cleanPathInput === 'function') ? cleanPathInput(inputEl) : (inputEl ? inputEl.value.trim() : '');
      const alertBox = document.getElementById(alertId);
      const btn = inputId === 'input-factusol-db' ? document.getElementById('btn-test-fact') : null;
      const isWizard = (inputId === 'wiz-input-fact-path');

      if (!dbPath) {
        showSmartToast({
          title: 'Ruta no indicada',
          message: 'Introduce o selecciona la ruta de la base de datos de Factusol.',
          actionLabel: isWizard ? '' : 'Resolver en Factusol ERP →',
          targetTab: 'factusol',
          targetInputId: inputId,
          type: 'warn'
        });
        return;
      }

      if (btn) btn.disabled = true;
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando conexión con Factusol...</div>';
      }

      try {
        const res = await fetch('/api/local/test-factusol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databasePath: dbPath })
        });
        const data = await res.json();
        if (data.resolvedPath && inputEl && inputEl.value !== data.resolvedPath) {
          inputEl.value = data.resolvedPath;
        }

        if (alertBox) {
          alertBox.style.display = 'block';
          const esc = window.escapeHtml || function(s) { return s; };
          const timeSuffix = (typeof data.durationMs === 'number') ? ' (' + data.durationMs + ' ms)' : '';
          if (data.success) {
            const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(data.message) : (data.message || '');
            alertBox.innerHTML = 
              '<div class="smart-success-card">' +
                (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
                '<span>' + esc(cleanMsg) + timeSuffix + '</span>' +
              '</div>';
            showSmartToast({
              title: 'Factusol ERP Conectado',
              message: 'Conexión verificada con éxito' + timeSuffix,
              type: 'success'
            });
            if (typeof loadArticlePreview === 'function') {
              loadArticlePreview();
            }
          } else {
            const errInfo = humanizeErrorMessage(data.message, 'factusol');
            const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(errInfo.title) : (errInfo.title || '');
            alertBox.innerHTML = 
              '<div class="smart-error-card">' +
                '<div class="smart-error-header">' +
                  (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') +
                  '<span>' + esc(cleanTitle) + '</span>' +
                '</div>' +
                '<div class="smart-error-cause">' +
                  '<strong>Causa:</strong> ' + esc(errInfo.cause) + '<br>' +
                  '<strong>Solución recomendada:</strong> ' + esc(errInfo.suggestion) +
                '</div>' +
                '<div class="smart-error-actions">' +
                  '<button type="button" onclick="detectFactusol(' + isWizard + ')" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('search') : '') + '<span>Auto-detectar Factusol</span></button>' +
                  '<button type="button" onclick="openNativeWindowsDialog(' + isWizard + ')" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('folder') : '') + '<span>Examinar en Windows</span></button>' +
                  '<button type="button" data-input-id="' + inputId + '" data-alert-id="' + alertId + '" onclick="testFactusolConnection(this.getAttribute(&quot;data-input-id&quot;), this.getAttribute(&quot;data-alert-id&quot;))" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button>' +
                '</div>' +
              '</div>';
            showSmartToast({
              title: errInfo.title,
              message: errInfo.message,
              actionLabel: isWizard ? '' : 'Resolver en Factusol ERP →',
              targetTab: 'factusol',
              targetInputId: inputId,
              type: 'error'
            });
          }
        }
      } catch (err) {
        const esc = window.escapeHtml || function(s) { return s; };
        const errInfo = humanizeErrorMessage(err, 'factusol');
        if (alertBox) {
          const cleanCatchTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(errInfo.title) : (errInfo.title || '');
          alertBox.style.display = 'block';
          alertBox.innerHTML = 
            '<div class="smart-error-card">' +
              '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + esc(cleanCatchTitle) + '</span></div>' +
              '<div class="smart-error-cause">' + esc(errInfo.cause) + '</div>' +
              '<div class="smart-error-actions">' +
                '<button type="button" data-input-id="' + inputId + '" data-alert-id="' + alertId + '" onclick="testFactusolConnection(this.getAttribute(&quot;data-input-id&quot;), this.getAttribute(&quot;data-alert-id&quot;))" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button>' +
              '</div>' +
            '</div>';
        }
        showSmartToast({
          title: errInfo.title,
          message: errInfo.message,
          actionLabel: isWizard ? '' : 'Resolver en Factusol ERP →',
          targetTab: 'factusol',
          targetInputId: inputId,
          type: 'error'
        });
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function saveFactusolSettings() {
      const inputEl = document.getElementById('input-factusol-db');
      const cleanDbPath = (typeof cleanPathInput === 'function') ? cleanPathInput(inputEl) : (inputEl ? inputEl.value.trim() : '');
      const payload = {
        erpType: 'factusol',
        factusol: {
          databasePath: cleanDbPath,
          tariffCode: document.getElementById('select-factusol-tariff').value,
          saleTariffCode: document.getElementById('select-factusol-sale-tariff') ? document.getElementById('select-factusol-sale-tariff').value : '',
          warehouseCode: document.getElementById('select-factusol-warehouse').value,
          orderSeries: ((document.getElementById('input-factusol-order-series') ? document.getElementById('input-factusol-order-series').value.trim() : '') || '1').toUpperCase().substring(0, 1),
        }
      };
      await submitConfigUpdates(payload, 'Ajustes de Factusol guardados con éxito.');
      loadArticlePreview();
    }

    async function loadArticlePreview() {
      const tbody = document.getElementById('articles-table-body');
      try {
        const res = await fetch('/api/local/factusol/preview');
        const data = await res.json();
        allArticles = data.articles || [];
        renderArticlesTable(allArticles);
        document.getElementById('article-count-tag').textContent = allArticles.length + ' arts. mostrados';
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--rose); padding: 20px;">Error al consultar la base de datos Factusol.</td></tr>';
      }
    }

    function renderArticlesTable(articles) {
      const tbody = document.getElementById('articles-table-body');
      if (!articles || articles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron artículos en la base de datos.</td></tr>';
        return;
      }
      const esc = window.escapeHtml || function(s) { return s; };
      tbody.innerHTML = articles.map(function(a) {
        const stockColor = a.stock > 0 ? '#34d399' : '#f87171';
        const displayPrice = (a.salePrice !== undefined && a.salePrice > 0) ? a.salePrice : a.costPrice;
        return '<tr>' +
          '<td><span class="tag tag-blue">' + esc(a.code) + '</span></td>' +
          '<td style="font-weight: 500;">' + esc(a.description || 'Sin descripción') + '</td>' +
          '<td><span class="tag tag-amber">' + esc(a.family || 'GEN') + '</span></td>' +
          '<td style="text-align: right; font-weight: 700; color: ' + stockColor + '">' + Number(a.stock || 0) + '</td>' +
          '<td style="text-align: right; font-family: monospace; font-weight: 600; color: #fff;">' + Number(displayPrice || 0).toFixed(2) + ' €</td>' +
          '<td style="color: var(--text-subtle); font-family: monospace;">' + esc(a.ean || '---') + '</td>' +
        '</tr>';
      }).join('');
    }

    function filterArticlesTable() {
      const q = (document.getElementById('filter-articles-input').value || '').toLowerCase();
      const filtered = allArticles.filter(function(a) {
        return a.code.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.ean && a.ean.toLowerCase().includes(q));
      });
      renderArticlesTable(filtered);
    }

    async function loadFactusolMetadata() {
      try {
        const res = await fetch('/api/local/factusol/metadata');
        if (!res.ok) return;
        const data = await res.json();
        const esc = window.escapeHtml || function(s) { return s; };
        if (data.tariffs && data.tariffs.length > 0) {
          const sel = document.getElementById('select-factusol-tariff');
          if (sel) {
            const currentTariff = sel.value;
            sel.innerHTML = data.tariffs.map(function(t) { return '<option value="' + esc(t.code) + '">' + esc(t.name) + '</option>'; }).join('');
            if (currentTariff) sel.value = currentTariff;
          }
          const saleSel = document.getElementById('select-factusol-sale-tariff');
          if (saleSel) {
            const currentVal = saleSel.value;
            saleSel.innerHTML = '<option value="">-- Ninguna (Sin precio tachado) --</option>' +
              data.tariffs.map(function(t) { return '<option value="' + esc(t.code) + '">' + esc(t.name) + '</option>'; }).join('');
            saleSel.value = currentVal;
          }
        }
        if (data.warehouses && data.warehouses.length > 0) {
          const sel = document.getElementById('select-factusol-warehouse');
          if (sel) {
            const currentWh = sel.value;
            sel.innerHTML = data.warehouses.map(function(w) { return '<option value="' + esc(w.code) + '">' + esc(w.name) + '</option>'; }).join('');
            if (currentWh) sel.value = currentWh;
          }
        }
      } catch (e) {}
    }

    // --- Soporte Multi-ERP & Selector Único con Confirmación Modal ---
    let currentErpType = 'factusol';
    let pendingModalErp = 'factusol';
    let allSimplyGestArticles = [];

    function openSwitchErpModal() {
      pendingModalErp = currentErpType || 'factusol';
      updateModalErpUI(pendingModalErp);
      const m = document.getElementById('modal-switch-erp');
      if (m) m.style.display = 'flex';
    }
    window.openSwitchErpModal = openSwitchErpModal;

    function closeSwitchErpModal() {
      const m = document.getElementById('modal-switch-erp');
      if (m) m.style.display = 'none';
    }
    window.closeSwitchErpModal = closeSwitchErpModal;

    function selectModalErp(type) {
      pendingModalErp = type || 'factusol';
      updateModalErpUI(pendingModalErp);
    }
    window.selectModalErp = selectModalErp;

    function updateModalErpUI(type) {
      const isSg = (type === 'simplygest');
      const cardF = document.getElementById('modal-choice-factusol');
      const cardS = document.getElementById('modal-choice-simplygest');
      const badgeF = document.getElementById('modal-badge-factusol');
      const badgeS = document.getElementById('modal-badge-simplygest');

      if (isSg) {
        if (cardF) cardF.classList.remove('selected');
        if (cardS) cardS.classList.add('selected');
        if (badgeF) { badgeF.className = 'tag'; badgeF.textContent = 'Disponible'; badgeF.style.background = 'rgba(255,255,255,0.06)'; badgeF.style.color = 'var(--text-muted)'; }
        if (badgeS) { badgeS.className = 'tag tag-green'; badgeS.textContent = 'Seleccionado'; badgeS.style.background = ''; badgeS.style.color = ''; }
      } else {
        if (cardF) cardF.classList.add('selected');
        if (cardS) cardS.classList.remove('selected');
        if (badgeF) { badgeF.className = 'tag tag-blue'; badgeF.textContent = 'Seleccionado'; badgeF.style.background = ''; badgeF.style.color = ''; }
        if (badgeS) { badgeS.className = 'tag'; badgeS.textContent = 'Disponible'; badgeS.style.background = 'rgba(255,255,255,0.06)'; badgeS.style.color = 'var(--text-muted)'; }
      }
    }

    async function confirmSwitchErp() {
      const targetErp = pendingModalErp || 'factusol';
      closeSwitchErpModal();
      selectErpType(targetErp);

      const friendlyName = targetErp === 'simplygest' ? 'SimplyGest Desktop' : 'Factusol ERP';
      if (typeof submitConfigUpdates === 'function') {
        await submitConfigUpdates({
          erpType: targetErp,
          softwareErp: {
            activeProvider: targetErp,
            provisioned: true
          }
        }, 'Software ERP cambiado a ' + friendlyName + ' con éxito.');
      }
    }
    window.confirmSwitchErp = confirmSwitchErp;

    function selectErpType(type) {
      currentErpType = type || 'factusol';
      const isSimplyGest = currentErpType === 'simplygest';

      const iconFact = document.getElementById('erp-active-icon-factusol');
      const iconSg = document.getElementById('erp-active-icon-simplygest');
      const iconContainer = document.getElementById('erp-active-icon-container');
      const activeTitle = document.getElementById('erp-active-title');
      const activeDesc = document.getElementById('erp-active-desc');
      const activeBadge = document.getElementById('erp-active-status-badge');
      const panelFact = document.getElementById('panel-erp-factusol');
      const panelSg = document.getElementById('panel-erp-simplygest');
      const sidebarLabel = document.getElementById('sidebar-erp-title');
      const sidebarBadge = document.getElementById('sidebar-erp-badge');
      const headerTitle = document.getElementById('header-page-title');

      if (sidebarLabel) {
        sidebarLabel.textContent = isSimplyGest ? 'SimplyGest Desktop' : 'Factusol ERP';
      }

      const activeTabPane = document.querySelector('.tab-pane.active');
      if (headerTitle && activeTabPane && activeTabPane.id === 'tab-factusol') {
        headerTitle.textContent = isSimplyGest ? 'SimplyGest Desktop' : 'Factusol ERP';
      }

      if (isSimplyGest) {
        if (iconFact) iconFact.style.display = 'none';
        if (iconSg) iconSg.style.display = 'block';
        if (iconContainer) {
          iconContainer.style.background = 'rgba(16,185,129,0.12)';
          iconContainer.style.color = '#34d399';
        }
        if (activeTitle) activeTitle.textContent = 'SimplyGest Desktop';
        if (activeDesc) activeDesc.textContent = 'Sincronización directa con base de datos Datos.mdb de SimplyGest.';
        if (activeBadge) {
          activeBadge.className = 'tag tag-green';
          activeBadge.textContent = '● Activo';
        }
        if (panelFact) panelFact.style.display = 'none';
        if (panelSg) panelSg.style.display = 'block';
        if (sidebarBadge) {
          sidebarBadge.textContent = 'SimplyGest';
          sidebarBadge.className = 'tag tag-green';
        }
        if (typeof loadSimplyGestPreview === 'function') loadSimplyGestPreview();
      } else {
        if (iconFact) iconFact.style.display = 'block';
        if (iconSg) iconSg.style.display = 'none';
        if (iconContainer) {
          iconContainer.style.background = 'rgba(59,130,246,0.12)';
          iconContainer.style.color = '#60a5fa';
        }
        if (activeTitle) activeTitle.textContent = 'Factusol (Software DELSOL)';
        if (activeDesc) activeDesc.textContent = 'Sincronización directa mediante motor OLEDB de Factusol (.accdb / .mdb).';
        if (activeBadge) {
          activeBadge.className = 'tag tag-blue';
          activeBadge.textContent = '● Activo';
        }
        if (panelFact) panelFact.style.display = 'block';
        if (panelSg) panelSg.style.display = 'none';
        if (sidebarBadge) {
          sidebarBadge.textContent = 'Factusol';
          sidebarBadge.className = 'tag tag-blue';
        }
        if (typeof loadArticlePreview === 'function') loadArticlePreview();
      }
    }
    window.selectErpType = selectErpType;

    function wizSelectErp(type) {
      const cardFact = document.getElementById('wiz-erp-choice-factusol');
      const cardSg = document.getElementById('wiz-erp-choice-simplygest');
      const badgeFact = document.getElementById('wiz-badge-erp-factusol');
      const badgeSg = document.getElementById('wiz-badge-erp-simplygest');
      const panelFact = document.getElementById('wiz-panel-factusol');
      const panelSg = document.getElementById('wiz-panel-simplygest');

      if (type === 'simplygest') {
        if (cardFact) cardFact.classList.remove('selected');
        if (cardSg) cardSg.classList.add('selected');
        if (badgeFact) { badgeFact.className = 'tag'; badgeFact.textContent = '○ Guardado / En pausa'; badgeFact.style.background = 'rgba(255,255,255,0.06)'; badgeFact.style.color = 'var(--text-muted)'; }
        if (badgeSg) { badgeSg.className = 'tag tag-green'; badgeSg.textContent = '● Activo en este equipo'; badgeSg.style.background = ''; badgeSg.style.color = ''; }
        if (panelFact) panelFact.style.display = 'none';
        if (panelSg) panelSg.style.display = 'block';
      } else {
        if (cardFact) cardFact.classList.add('selected');
        if (cardSg) cardSg.classList.remove('selected');
        if (badgeFact) { badgeFact.className = 'tag tag-blue'; badgeFact.textContent = '● Activo en este equipo'; badgeFact.style.background = ''; badgeFact.style.color = ''; }
        if (badgeSg) { badgeSg.className = 'tag'; badgeSg.textContent = '○ Guardado / En pausa'; badgeSg.style.background = 'rgba(255,255,255,0.06)'; badgeSg.style.color = 'var(--text-muted)'; }
        if (panelFact) panelFact.style.display = 'block';
        if (panelSg) panelSg.style.display = 'none';
      }
      selectErpType(type);
    }
    window.wizSelectErp = wizSelectErp;

    async function handleSimplyGestInputBlur(inputId) {
      inputId = inputId || 'input-simplygest-db';
      const el = document.getElementById(inputId);
      if (!el) return;
      if (typeof cleanPathInput === 'function') cleanPathInput(el);
      if (!el.value.trim()) return;

      try {
        const res = await fetch('/api/local/resolve-simplygest-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: el.value.trim() })
        });
        const data = await res.json();
        if (data.success && data.resolvedPath) {
          el.value = data.resolvedPath;
          if (data.isDirectory) {
            showToast(data.message, 'success');
          }
        }
      } catch (err) {}
    }

    let isOpeningSimplyGestNativeDialog = false;
    async function openNativeWindowsDialogSimplyGest(isWizard) {
      if (isOpeningSimplyGestNativeDialog) return;
      isOpeningSimplyGestNativeDialog = true;
      const targetIsWizard = !!isWizard;
      const btnNative = document.getElementById('btn-browse-native-simplygest');
      const btnWizNative = document.getElementById('wiz-btn-browse-native-simplygest');
      const originalNativeHtml = btnNative ? btnNative.innerHTML : '';
      const originalWizHtml = btnWizNative ? btnWizNative.innerHTML : '';

      const spinnerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Abriendo...';

      if (btnNative) {
        btnNative.disabled = true;
        btnNative.innerHTML = spinnerHTML;
      }
      if (btnWizNative) {
        btnWizNative.disabled = true;
        btnWizNative.innerHTML = spinnerHTML;
      }
      showToast('Abriendo selector de archivos de Windows (Datos.mdb)...', 'info');

      try {
        const targetInput = targetIsWizard 
          ? document.getElementById('wiz-input-simplygest-path') 
          : document.getElementById('input-simplygest-db');
        const currentPath = targetInput ? targetInput.value.trim() : '';

        const res = await fetch('/api/local/open-file-dialog-simplygest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPath })
        });
        const data = await res.json();
        if (data.success && data.filePath) {
          if (targetInput) {
            targetInput.value = data.filePath;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            handleSimplyGestInputBlur(targetInput.id);
          }
          const otherInput = targetIsWizard
            ? document.getElementById('input-simplygest-db')
            : document.getElementById('wiz-input-simplygest-path');
          if (otherInput) {
            otherInput.value = data.filePath;
          }

          showToast('Base de datos SimplyGest seleccionada: ' + data.filePath, 'success');

          if (targetIsWizard) {
            await testSimplyGestConnection('wiz-input-simplygest-path', 'wiz-simplygest-alert');
          } else {
            await testSimplyGestConnection('input-simplygest-db', 'simplygest-test-alert');
          }
        }
      } catch (err) {
        console.warn('Selector de archivos SimplyGest cancelado o cerrado:', err); // quality-allow-console (browser template script)
      } finally {
        isOpeningSimplyGestNativeDialog = false;
        if (btnNative) {
          btnNative.disabled = false;
          btnNative.innerHTML = originalNativeHtml;
        }
        if (btnWizNative) {
          btnWizNative.disabled = false;
          btnWizNative.innerHTML = originalWizHtml;
        }
      }
    }

    async function detectSimplyGest(isWizard) {
      const btn = isWizard 
        ? document.getElementById('wiz-btn-detect-simplygest') 
        : document.getElementById('btn-detect-simplygest');
      const originalHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Buscando SimplyGest...';
      }

      const box = isWizard ? document.getElementById('wiz-simplygest-detected-box') : document.getElementById('simplygest-detected-box');
      const list = isWizard ? document.getElementById('wiz-simplygest-detected-list') : document.getElementById('simplygest-detected-list');
      const label = isWizard ? null : document.getElementById('simplygest-detected-label');

      try {
        const res = await fetch('/api/local/detect-simplygest', { method: 'POST' });
        const data = await res.json();

        box.style.display = 'block';

        if (data.instances && data.instances.length > 0) {
          if (label) label.textContent = 'Bases de datos SimplyGest encontradas (' + data.instances.length + '):';
          const esc = window.escapeHtml || function(s) { return s; };
          list.innerHTML = data.instances.map(function(inst) {
            const cleanPath = String(inst.databasePath).split('"').join('&quot;');
            const labelText = inst.companyName || 'SimplyGest';
            const sizeMb = inst.fileSizeBytes ? ' • ' + (inst.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
            return '<div data-db-path="' + cleanPath + '" data-is-wiz="' + isWizard + '" onclick="selectSimplyGestInstance(this.getAttribute(&quot;data-db-path&quot;), this.getAttribute(&quot;data-is-wiz&quot;) === &quot;true&quot;)" style="background: #1e1e26; border: 1px solid var(--card-border); padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; transition: border-color 0.2s;" onmouseover="this.style.borderColor=&quot;#10b981&quot;" onmouseout="this.style.borderColor=&quot;var(--card-border)&quot;">' +
              '<div><strong>' + esc(labelText) + '</strong>' + sizeMb + '<div style="color: var(--text-subtle); font-family: monospace; font-size: 11px; margin-top: 2px;">' + esc(inst.databasePath) + '</div></div>' +
              '<span class="tag tag-green" style="margin-left: 8px;">Usar esta</span>' +
            '</div>';
          }).join('');

          const targetInput = isWizard ? document.getElementById('wiz-input-simplygest-path') : document.getElementById('input-simplygest-db');
          if (!targetInput.value.trim() && data.instances[0]) {
            targetInput.value = data.instances[0].databasePath;
            const otherInput = isWizard ? document.getElementById('input-simplygest-db') : document.getElementById('wiz-input-simplygest-path');
            if (otherInput) otherInput.value = data.instances[0].databasePath;
            if (isWizard) {
              await testSimplyGestConnection('wiz-input-simplygest-path', 'wiz-simplygest-alert');
            } else {
              await testSimplyGestConnection('input-simplygest-db', 'simplygest-test-alert');
            }
          }
          showToast('Se detectó ' + data.instances.length + ' instalación de SimplyGest', 'success');
        } else {
          if (label) label.textContent = 'Resultado del escaneo:';
          list.innerHTML = 
            '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #e4e4e7; line-height: 1.5;">' +
              '<div style="display:flex;align-items:center;gap:6px;font-weight:600;color:#fbbf24;margin-bottom:4px;">' +
                (typeof renderIcon === 'function' ? renderIcon('warn') : '') +
                '<span>No se detectó Datos.mdb en las carpetas por defecto:</span>' +
              '</div>' +
              '<div style="color: var(--text-muted); margin-top: 4px;">' +
                'Se buscaron archivos en las rutas habituales (<code>C:\\\\SimplyGest\\\\Datos.mdb</code>), pero no se detectaron instalaciones automáticas.<br>' +
                'Si tienes tu base de datos en otra carpeta o servidor, haz clic en <strong>Examinar en Windows</strong> para localizarla.' +
              '</div>' +
            '</div>';
          showToast('No se encontró SimplyGest en rutas habituales. Usa "Examinar en Windows".', 'warn');
        }
      } catch (err) {
        showToast('Error al escanear discos', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }
    }

    function selectSimplyGestInstance(dbPath, isWizard) {
      const targetInput = isWizard ? document.getElementById('wiz-input-simplygest-path') : document.getElementById('input-simplygest-db');
      if (targetInput) targetInput.value = dbPath;
      const otherInput = isWizard ? document.getElementById('input-simplygest-db') : document.getElementById('wiz-input-simplygest-path');
      if (otherInput) otherInput.value = dbPath;

      if (isWizard) {
        const box = document.getElementById('wiz-simplygest-detected-box');
        if (box) box.style.display = 'none';
        testSimplyGestConnection('wiz-input-simplygest-path', 'wiz-simplygest-alert');
      } else {
        const box = document.getElementById('simplygest-detected-box');
        if (box) box.style.display = 'none';
        testSimplyGestConnection('input-simplygest-db', 'simplygest-test-alert');
      }
    }

    async function testSimplyGestConnection(inputId, alertId) {
      inputId = inputId || 'input-simplygest-db';
      alertId = alertId || 'simplygest-test-alert';
      const inputEl = document.getElementById(inputId);
      const dbPath = (typeof cleanPathInput === 'function') ? cleanPathInput(inputEl) : (inputEl ? inputEl.value.trim() : '');
      const alertBox = document.getElementById(alertId);
      const btn = inputId === 'input-simplygest-db' ? document.getElementById('btn-test-simplygest') : null;
      const isWizard = (inputId === 'wiz-input-simplygest-path');

      if (!dbPath) {
        showSmartToast({
          title: 'Ruta no indicada',
          message: 'Introduce o selecciona la ruta de Datos.mdb de SimplyGest.',
          actionLabel: isWizard ? '' : 'Resolver en SimplyGest →',
          targetTab: 'factusol',
          targetInputId: inputId,
          type: 'warn'
        });
        return;
      }

      if (btn) btn.disabled = true;
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando conexión con SimplyGest...</div>';
      }

      try {
        const res = await fetch('/api/local/test-simplygest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databasePath: dbPath })
        });
        const data = await res.json();
        if (data.resolvedPath && inputEl && inputEl.value !== data.resolvedPath) {
          inputEl.value = data.resolvedPath;
        }

        if (alertBox) {
          alertBox.style.display = 'block';
          const esc = window.escapeHtml || function(s) { return s; };
          const timeSuffix = (typeof data.durationMs === 'number') ? ' (' + data.durationMs + ' ms)' : '';
          if (data.success) {
            const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(data.message) : (data.message || '');
            alertBox.innerHTML = 
              '<div class="smart-success-card">' +
                (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
                '<span>' + esc(cleanMsg) + timeSuffix + '</span>' +
              '</div>';
            showSmartToast({
              title: 'SimplyGest Conectado',
              message: 'Conexión verificada con éxito' + timeSuffix,
              type: 'success'
            });
            loadSimplyGestPreview();
          } else {
            const errInfo = humanizeErrorMessage(data.message, 'simplygest');
            const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(errInfo.title) : (errInfo.title || '');
            alertBox.innerHTML = 
              '<div class="smart-error-card">' +
                '<div class="smart-error-header">' +
                  (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') +
                  '<span>' + esc(cleanTitle) + '</span>' +
                '</div>' +
                '<div class="smart-error-desc">' + esc(errInfo.description) + '</div>' +
              '</div>';
            showSmartToast({
              title: cleanTitle,
              message: errInfo.description,
              actionLabel: isWizard ? '' : 'Resolver en SimplyGest →',
              targetTab: 'factusol',
              targetInputId: inputId,
              type: 'error'
            });
          }
        }
      } catch (err) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.innerHTML = '<div style="color:var(--rose);padding:6px 0;font-size:12px;">Error al conectar con SimplyGest: ' + String(err) + '</div>';
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function wizTestSimplyGestConnection() {
      await testSimplyGestConnection('wiz-input-simplygest-path', 'wiz-simplygest-alert');
    }

    async function saveSimplyGestSettings() {
      const inputEl = document.getElementById('input-simplygest-db');
      const cleanDbPath = (typeof cleanPathInput === 'function') ? cleanPathInput(inputEl) : (inputEl ? inputEl.value.trim() : '');
      const payload = {
        erpType: 'simplygest',
        simplygest: {
          databasePath: cleanDbPath,
          tariffCode: document.getElementById('select-simplygest-tariff') ? document.getElementById('select-simplygest-tariff').value : '1',
          warehouseCode: document.getElementById('select-simplygest-warehouse') ? document.getElementById('select-simplygest-warehouse').value : '1',
          orderSeries: ((document.getElementById('input-simplygest-order-series') ? document.getElementById('input-simplygest-order-series').value.trim() : '') || '1').toUpperCase().substring(0, 2),
        }
      };
      await submitConfigUpdates(payload, 'Ajustes de SimplyGest guardados con éxito.');
      loadSimplyGestPreview();
    }

    async function loadSimplyGestPreview() {
      const tbody = document.getElementById('simplygest-articles-table-body');
      if (!tbody) return;
      try {
        const res = await fetch('/api/local/simplygest/preview');
        const data = await res.json();
        allSimplyGestArticles = data.articles || [];
        renderSimplyGestArticlesTable(allSimplyGestArticles);
        const tag = document.getElementById('simplygest-article-count-tag');
        if (tag) tag.textContent = allSimplyGestArticles.length + ' arts. mostrados';
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--rose); padding: 20px;">Error al consultar la base de datos SimplyGest.</td></tr>';
      }
    }

    function renderSimplyGestArticlesTable(articles) {
      const tbody = document.getElementById('simplygest-articles-table-body');
      if (!tbody) return;
      if (!articles || articles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron artículos en la base de datos de SimplyGest.</td></tr>';
        return;
      }
      const esc = window.escapeHtml || function(s) { return s; };
      tbody.innerHTML = articles.map(function(a) {
        const stockColor = a.stock > 0 ? '#34d399' : '#f87171';
        const displayPrice = (a.salePrice !== undefined && a.salePrice > 0) ? a.salePrice : a.costPrice;
        return '<tr>' +
          '<td><span class="tag tag-green">' + esc(a.code) + '</span></td>' +
          '<td style="font-weight: 500;">' + esc(a.description || 'Sin descripción') + '</td>' +
          '<td><span class="tag tag-amber">' + esc(a.family || 'GEN') + '</span></td>' +
          '<td style="text-align: right; font-weight: 700; color: ' + stockColor + '">' + Number(a.stock || 0) + '</td>' +
          '<td style="text-align: right; font-family: monospace; font-weight: 600; color: #fff;">' + Number(displayPrice || 0).toFixed(2) + ' €</td>' +
          '<td style="color: var(--text-subtle); font-family: monospace;">' + esc(a.ean || '---') + '</td>' +
        '</tr>';
      }).join('');
    }

    function filterSimplyGestArticlesTable() {
      const q = (document.getElementById('filter-simplygest-articles-input').value || '').toLowerCase();
      const filtered = allSimplyGestArticles.filter(function(a) {
        return a.code.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.ean && a.ean.toLowerCase().includes(q));
      });
      renderSimplyGestArticlesTable(filtered);
    }
`;
