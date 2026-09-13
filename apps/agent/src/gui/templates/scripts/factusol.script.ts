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
      try {
        const res = await fetch('/api/local/browse-factusol', { method: 'POST' });
        const data = await res.json();
        if (data.selectedPath) {
          const targetInput = isWizard ? document.getElementById('wiz-input-fact-path') : document.getElementById('input-factusol-db');
          targetInput.value = data.selectedPath;
          handleFactusolInputBlur(isWizard ? 'wiz-input-fact-path' : 'input-factusol-db');
          showToast('Base de datos seleccionada: ' + data.selectedPath);
          if (!isWizard) {
            await testFactusolConnection();
          }
        }
      } catch (err) {
        showToast('Error al abrir selector de Windows', 'error');
      }
    }

    async function detectFactusol(isWizard) {
      try {
        const res = await fetch('/api/local/detect-factusol', { method: 'POST' });
        const data = await res.json();
        const box = isWizard ? document.getElementById('wiz-fact-detected-box') : document.getElementById('factusol-detected-box');
        const list = isWizard ? document.getElementById('wiz-fact-detected-list') : document.getElementById('factusol-detected-list');

        if (data.instances && data.instances.length > 0) {
          box.style.display = 'block';
          list.innerHTML = data.instances.map(function(inst) {
            const safePath = inst.databasePath.replace(/\\\\/g, '\\\\\\\\');
            const label = inst.companyCode ? ('Empresa ' + inst.companyCode) : 'Factusol';
            return '<div onclick="selectFactusolInstance(\\'' + safePath + '\\', ' + isWizard + ')" style="background: #1e1e26; border: 1px solid var(--card-border); padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">' +
              '<div><strong>' + label + '</strong> <span style="color: var(--text-subtle); margin-left: 8px; font-family: monospace;">' + inst.databasePath + '</span></div>' +
              '<span class="tag tag-blue">Seleccionar</span>' +
            '</div>';
          }).join('');
          showToast('Se encontraron ' + data.instances.length + ' bases de datos Factusol');
        } else {
          showToast('No se encontraron bases de datos en las rutas estándar', 'warn');
        }
      } catch (err) {
        showToast('Error al escanear discos', 'error');
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
        return '<tr>' +
          '<td><span class="tag tag-blue">' + a.code + '</span></td>' +
          '<td style="font-weight: 500;">' + (a.description || 'Sin descripción') + '</td>' +
          '<td><span class="tag tag-amber">' + (a.family || 'GEN') + '</span></td>' +
          '<td style="text-align: right; font-weight: 700; color: ' + stockColor + '">' + a.stock + '</td>' +
          '<td style="text-align: right; font-family: monospace;">' + Number(a.costPrice).toFixed(2) + ' €</td>' +
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
          sel.innerHTML = data.tariffs.map(function(t) { return '<option value="' + t.code + '">' + t.name + '</option>'; }).join('');
        }
        if (data.warehouses && data.warehouses.length > 0) {
          const sel = document.getElementById('select-factusol-warehouse');
          sel.innerHTML = data.warehouses.map(function(w) { return '<option value="' + w.code + '">' + w.name + '</option>'; }).join('');
        }
      } catch (e) {}
    }
`;
