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

    // Pruebas y Guardado Factusol
    async function browseFactusol(isWizard) {
      const btn = isWizard 
        ? document.getElementById('wiz-btn-browse-fact') 
        : document.getElementById('btn-browse-fact');
      const originalHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Abriendo...';
      }

      try {
        const res = await fetch('/api/local/browse-factusol', { method: 'POST' });
        const data = await res.json();
        if (data.selectedPath) {
          const targetInput = isWizard ? document.getElementById('wiz-input-fact-path') : document.getElementById('input-factusol-db');
          targetInput.value = data.selectedPath;
          handleFactusolInputBlur(isWizard ? 'wiz-input-fact-path' : 'input-factusol-db');
          showToast('Base de datos seleccionada: ' + data.selectedPath, 'success');
          if (!isWizard) {
            await testFactusolConnection();
          }
        }
      } catch (err) {
        showToast('Error al abrir selector de Windows', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }
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
            if (!isWizard) {
              await testFactusolConnection();
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
                'Si tienes tu empresa en otra carpeta, disco de red o pendrive, pulsa en <strong>📁 Examinar mi PC</strong> para seleccionarla directamente.' +
              '</div>' +
            '</div>';
          showToast('No se encontró Factusol en rutas habituales. Usa "Examinar mi PC".', 'warn');
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
      targetInput.value = dbPath;
      if (isWizard) {
        document.getElementById('wiz-fact-detected-box').style.display = 'none';
        const alertBox = document.getElementById('wiz-fact-alert');
        alertBox.style.display = 'block';
        alertBox.style.color = '#34d399';
        alertBox.textContent = '✓ Base de datos seleccionada';
      } else {
        document.getElementById('factusol-detected-box').style.display = 'none';
        testFactusolConnection();
      }
    }

    async function testFactusolConnection() {
      const dbPath = document.getElementById('input-factusol-db').value.trim();
      const alertBox = document.getElementById('fact-test-alert');
      const btn = document.getElementById('btn-test-fact');
      if (!dbPath) {
        showToast('Selecciona la ruta de tu Factusol', 'warn');
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch('/api/local/test-factusol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databasePath: dbPath })
        });
        const data = await res.json();
        alertBox.style.display = 'block';
        if (data.success) {
          alertBox.style.color = '#34d399';
          alertBox.textContent = '✓ ' + data.message;
          showToast('Conexión con Factusol exitosa');
          loadArticlePreview();
        } else {
          alertBox.style.color = '#f87171';
          alertBox.textContent = '✕ ' + data.message;
          showToast('Error conectando con Factusol', 'error');
        }
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error al comunicar con Factusol';
      } finally {
        btn.disabled = false;
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
