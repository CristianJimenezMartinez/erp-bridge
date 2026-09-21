export const factusolScript = `
    // Auto-resolución de carpeta Factusol
    async function handleFactusolInputBlur(inputId) {
      inputId = inputId || 'input-factusol-db';
      const el = document.getElementById(inputId);
      if (!el || !el.value.trim()) return;

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

    // Explorador de Archivos y Carpetas (100% Web Nativo, Cero PowerShell, Cero Antivirus)
    let explorerIsWizard = false;
    let explorerCurrentPath = '';
    let explorerParentPath = null;

    async function openNativeWindowsDialog(isWizard) {
      if (typeof isWizard !== 'undefined') {
        explorerIsWizard = !!isWizard;
      }
      showToast('Abriendo selector de archivos de Windows...', 'info');
      try {
        const res = await fetch('/api/local/open-file-dialog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success && data.filePath) {
          const targetInput = explorerIsWizard 
            ? document.getElementById('wiz-input-fact-path') 
            : document.getElementById('input-factusol-db');
          if (targetInput) {
            targetInput.value = data.filePath;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            handleFactusolInputBlur(targetInput.id);
          }
          // Sincronizar el otro input si está en el DOM
          const otherInput = explorerIsWizard
            ? document.getElementById('input-factusol-db')
            : document.getElementById('wiz-input-fact-path');
          if (otherInput) {
            otherInput.value = data.filePath;
          }

          closeExplorerModal();
          showToast('Base de datos seleccionada: ' + data.filePath, 'success');

          // Disparar comprobación de conexión inmediata
          if (explorerIsWizard) {
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
        console.warn('Selector de archivos de Windows cancelado o cerrado:', err);
      }
    }

    function browseFactusol(isWizard) {
      openNativeWindowsDialog(isWizard);
    }

    function openExplorerModal() {
      const modal = document.getElementById('modal-fs-explorer');
      if (modal) {
        modal.classList.add('open');
        const targetInput = explorerIsWizard 
          ? document.getElementById('wiz-input-fact-path') 
          : document.getElementById('input-factusol-db');
        const initPath = targetInput && targetInput.value.trim() ? targetInput.value.trim() : '';
        explorerNavigateTo(initPath);
      }
    }

    function closeExplorerModal() {
      const modal = document.getElementById('modal-fs-explorer');
      if (modal) modal.classList.remove('open');
    }

    async function explorerNavigateTo(dirPath) {
      const fileList = document.getElementById('explorer-file-list');
      if (fileList) {
        fileList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;"><span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#60a5fa;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Explorando carpeta...</div>';
      }

      try {
        const res = await fetch('/api/local/fs/browse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: dirPath || '' })
        });
        const data = await res.json();
        if (data.success) {
          explorerCurrentPath = data.currentPath;
          explorerParentPath = data.parentPath;
          renderExplorerContent(data);
        } else {
          showToast(data.message || 'Error al acceder a la ruta', 'error');
        }
      } catch (err) {
        showToast('No se pudo conectar con el explorador', 'error');
      }
    }

    function explorerGoUp() {
      if (explorerParentPath) {
        explorerNavigateTo(explorerParentPath);
      } else {
        showToast('Ya estás en la raíz del disco', 'info');
      }
    }

    function renderExplorerContent(data) {
      const pathInput = document.getElementById('explorer-current-path-input');
      if (pathInput) pathInput.value = data.currentPath;

      const upBtn = document.getElementById('btn-explorer-up');
      if (upBtn) upBtn.disabled = !data.parentPath;

      // Unidades y Atajos
      const drivesList = document.getElementById('explorer-drives-list');
      if (drivesList) {
        const drivesHtml = (data.drives || []).map(function(d) {
          const isSelected = data.currentPath && data.currentPath.toUpperCase().startsWith(d.path.toUpperCase());
          return '<button onclick="explorerNavigateTo(\\'' + d.path.replace(/\\\\/g, '\\\\\\\\') + '\\')" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:11px;' + (isSelected ? 'border-color:#6366f1;color:#a5b4fc;' : '') + '">' + d.label + '</button>';
        }).join('');

        const shortcutsHtml = (data.shortcuts || []).map(function(s) {
          return '<button onclick="explorerNavigateTo(\\'' + s.path.replace(/\\\\/g, '\\\\\\\\') + '\\')" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:11px;">' + s.label + '</button>';
        }).join('');

        drivesList.innerHTML = drivesHtml + shortcutsHtml;
      }

      // Archivos y Carpetas
      const fileList = document.getElementById('explorer-file-list');
      if (!fileList) return;

      if (!data.items || data.items.length === 0) {
        fileList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">Esta carpeta no contiene subcarpetas ni bases de datos Factusol (.accdb).</div>';
        return;
      }

      fileList.innerHTML = data.items.map(function(item) {
        const safePath = item.fullPath.replace(/\\\\/g, '\\\\\\\\');
        if (item.isDirectory) {
          return '<div onclick="explorerNavigateTo(\\'' + safePath + '\\')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;cursor:pointer;background:#15151b;border:1px solid transparent;font-size:12px;transition:all 0.15s;" onmouseover="this.style.borderColor=\\'var(--card-border)\\';this.style.background=\\'#1e1e26\\'" onmouseout="this.style.borderColor=\\'transparent\\';this.style.background=\\'#15151b\\'">' +
            '<span style="font-size:15px;">📁</span>' +
            '<span style="font-weight:500;color:#e4e4e7;flex:1;">' + item.name + '</span>' +
            '<span style="font-size:11px;color:var(--text-subtle);">Carpeta</span>' +
          '</div>';
        } else {
          const sizeMb = item.sizeBytes ? (item.sizeBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:6px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);font-size:12px;margin:2px 0;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<span style="font-size:16px;">💾</span>' +
              '<div>' +
                '<strong style="color:#fff;">' + item.name + '</strong>' +
                '<span style="color:var(--text-subtle);font-size:11px;margin-left:8px;">' + sizeMb + (item.mtime ? ' • ' + item.mtime : '') + '</span>' +
              '</div>' +
            '</div>' +
            '<button onclick="explorerSelectFile(\\'' + safePath + '\\')" class="btn btn-primary btn-sm" style="padding:4px 10px;">' +
              '<span>Seleccionar</span>' +
            '</button>' +
          '</div>';
        }
      }).join('');
    }

    async function explorerSelectFile(filePath) {
      closeExplorerModal();
      selectFactusolInstance(filePath, explorerIsWizard);
      showToast('✓ Base de datos seleccionada con éxito', 'success');
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
          list.innerHTML = data.instances.map(function(inst) {
            const safePath = inst.databasePath.replace(/\\\\/g, '\\\\\\\\');
            const labelText = inst.companyCode ? ('Empresa ' + inst.companyCode + (inst.year ? ' (' + inst.year + ')' : '')) : 'Factusol';
            const sizeMb = inst.fileSizeBytes ? ' • ' + (inst.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
            return '<div onclick="selectFactusolInstance(\\'' + safePath + '\\', ' + isWizard + ')" style="background: #1e1e26; border: 1px solid var(--card-border); padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; transition: border-color 0.2s;" onmouseover="this.style.borderColor=\\'#6366f1\\'" onmouseout="this.style.borderColor=\\'var(--card-border)\\'">' +
              '<div><strong>' + labelText + '</strong>' + sizeMb + '<div style="color: var(--text-subtle); font-family: monospace; font-size: 11px; margin-top: 2px;">' + inst.databasePath + '</div></div>' +
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
          showToast('✓ Se encontraron ' + data.instances.length + ' bases de datos Factusol', 'success');
        } else {
          if (label) label.textContent = 'Resultado del escaneo:';
          list.innerHTML = 
            '<div style="background: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.3); padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #fde047; line-height: 1.5;">' +
              '<strong>⚠️ No se detectó Factusol en las carpetas por defecto:</strong>' +
              '<div style="color: var(--text-muted); margin-top: 4px;">' +
                'Se buscaron archivos en las carpetas habituales (<code>C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\...</code>), pero no se detectaron instalaciones estándar.<br>' +
                'Si tienes tu empresa en otra carpeta, disco de red o pendrive, pulsa en <strong>📁 Examinar en Windows</strong> para seleccionarla directamente.' +
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
      const dbPath = inputEl ? inputEl.value.trim() : '';
      const alertBox = document.getElementById(alertId);
      const btn = inputId === 'input-factusol-db' ? document.getElementById('btn-test-fact') : null;
      if (!dbPath) {
        showToast('Selecciona la ruta de tu Factusol', 'warn');
        return;
      }
      if (btn) btn.disabled = true;
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.color = 'var(--text-muted)';
        alertBox.textContent = 'Comprobando conexión con Factusol...';
      }
      try {
        const res = await fetch('/api/local/test-factusol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databasePath: dbPath })
        });
        const data = await res.json();
        if (alertBox) {
          alertBox.style.display = 'block';
          if (data.success) {
            alertBox.style.color = '#34d399';
            alertBox.textContent = '✓ ' + data.message;
            showToast('Conexión con Factusol exitosa');
            if (typeof loadArticlePreview === 'function') {
              loadArticlePreview();
            }
          } else {
            alertBox.style.color = '#f87171';
            alertBox.textContent = '✕ ' + data.message;
            showToast('Error conectando con Factusol', 'error');
          }
        }
      } catch (err) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.color = '#f87171';
          alertBox.textContent = 'Error al comunicar con Factusol';
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function saveFactusolSettings() {
      const payload = {
        factusol: {
          databasePath: document.getElementById('input-factusol-db').value.trim(),
          tariffCode: document.getElementById('select-factusol-tariff').value,
          saleTariffCode: document.getElementById('select-factusol-sale-tariff') ? document.getElementById('select-factusol-sale-tariff').value : '',
          warehouseCode: document.getElementById('select-factusol-warehouse').value,
          orderSeries: document.getElementById('input-factusol-order-series').value.trim(),
          invoiceSeries: document.getElementById('input-factusol-inv-series').value.trim(),
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
      tbody.innerHTML = articles.map(function(a) {
        const stockColor = a.stock > 0 ? '#34d399' : '#f87171';
        const displayPrice = (a.salePrice !== undefined && a.salePrice > 0) ? a.salePrice : a.costPrice;
        return '<tr>' +
          '<td><span class="tag tag-blue">' + a.code + '</span></td>' +
          '<td style="font-weight: 500;">' + (a.description || 'Sin descripción') + '</td>' +
          '<td><span class="tag tag-amber">' + (a.family || 'GEN') + '</span></td>' +
          '<td style="text-align: right; font-weight: 700; color: ' + stockColor + '">' + a.stock + '</td>' +
          '<td style="text-align: right; font-family: monospace; font-weight: 600; color: #fff;">' + Number(displayPrice).toFixed(2) + ' €</td>' +
          '<td style="color: var(--text-subtle); font-family: monospace;">' + (a.ean || '---') + '</td>' +
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
        if (data.tariffs && data.tariffs.length > 0) {
          const sel = document.getElementById('select-factusol-tariff');
          if (sel) {
            sel.innerHTML = data.tariffs.map(function(t) { return '<option value="' + t.code + '">' + t.name + '</option>'; }).join('');
          }
          const saleSel = document.getElementById('select-factusol-sale-tariff');
          if (saleSel) {
            const currentVal = saleSel.value;
            saleSel.innerHTML = '<option value="">-- Ninguna (Sin precio tachado) --</option>' +
              data.tariffs.map(function(t) { return '<option value="' + t.code + '">' + t.name + '</option>'; }).join('');
            saleSel.value = currentVal;
          }
        }
        if (data.warehouses && data.warehouses.length > 0) {
          const sel = document.getElementById('select-factusol-warehouse');
          sel.innerHTML = data.warehouses.map(function(w) { return '<option value="' + w.code + '">' + w.name + '</option>'; }).join('');
        }
      } catch (e) {}
    }
`;
