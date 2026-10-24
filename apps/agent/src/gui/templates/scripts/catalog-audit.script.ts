export const catalogAuditScript = `
    // ================= AUDITORÍA DE CATÁLOGO MULTI-ERP =================
    let _catalogAuditReport = null;
    let _catalogAuditFilter = 'ALL';
    let _catalogAuditLastDemoMode = false;
    let _catalogAuditLastProvider = '';

    const AUDIT_ERP_META = {
      factusol: {
        name: 'Factusol ERP',
        badge: 'Factusol ERP',
        tagClass: 'tag tag-blue',
        engine: 'Microsoft Access OLEDB (.accdb)',
        tables: 'F_ART, F_STO, F_LTA'
      },
      simplygest: {
        name: 'SimplyGest Desktop',
        badge: 'SimplyGest',
        tagClass: 'tag tag-green',
        engine: 'DBISAM (.dat) / Access (Datos.mdb)',
        tables: 'Articulos, Tarifas, Almacenes'
      },
      agora: {
        name: 'Ágora Retail / POS',
        badge: 'Ágora POS',
        tagClass: 'tag tag-amber',
        engine: 'SQL Server Local (AgoraDB)',
        tables: 'SaleItem, PriceList, WarehouseStock'
      },
      sage50: {
        name: 'Sage 50 ERP',
        badge: 'Sage 50',
        tagClass: 'tag tag-green',
        engine: 'SQL Server Ejercicio Activo (GESTION)',
        tables: 'articulo, pvp, stocks, ART_FOTO'
      },
      a3erp: {
        name: 'Wolters Kluwer a3ERP',
        badge: 'a3ERP',
        tagClass: 'tag tag-amber',
        engine: 'SQL Server + ActiveX (A3ERP)',
        tables: 'ARTICULO, STOCKALM'
      },
      sage200: {
        name: 'Sage 200 (Sage Murano)',
        badge: 'Sage 200',
        tagClass: 'tag tag-green',
        engine: 'SQL Server Local (SAGE200)',
        tables: 'Articulos, AcumuladosStock (Periodo 99)'
      },
      icg: {
        name: 'ICG Manager / FrontRetail',
        badge: 'ICG Manager',
        tagClass: 'tag tag-blue',
        engine: 'SQL Server (ICGDB / HIOPOS)',
        tables: 'ARTICULOS, ARTICULOSLIN, PRECIOSVENTA, STOCKS'
      },
      visionwin: {
        name: 'Visionwin Gestión',
        badge: 'Visionwin',
        tagClass: 'tag tag-blue',
        engine: 'Motor Local / SQL (VISIONWIN)',
        tables: 'ARTICULOS (PVP1..5), STOCK_ALMACEN'
      },
      aplifisa: {
        name: 'Aplifisa (GestFuturo / Factus)',
        badge: 'Aplifisa',
        tagClass: 'tag tag-amber',
        engine: 'SQL Server / Local (GESTFUTURO)',
        tables: 'ARTICULOS, EXISTENCIAS'
      },
      odoo: {
        name: 'Odoo ERP (v14–v18)',
        badge: 'Odoo ERP',
        tagClass: 'tag tag-blue',
        engine: 'JSON-RPC 2.0 + PostgreSQL (odoo_prod)',
        tables: 'product_product, product_template, stock_quant'
      },
      facturascripts: {
        name: 'FacturaScripts',
        badge: 'FacturaScripts',
        tagClass: 'tag tag-blue',
        engine: 'API REST v3 + MySQL/PostgreSQL',
        tables: 'productos, variantes, stocks'
      },
      businesscentral: {
        name: 'Dynamics 365 Business Central / NAV',
        badge: 'Dynamics BC',
        tagClass: 'tag tag-blue',
        engine: 'SQL Server On-Prem / OData v2.0 (BC240)',
        tables: '[CRONUS$Item], [CRONUS$Item Ledger Entry]'
      }
    };

    const AUDIT_MINIMAL_ICONS = {
      critical: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warning: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      database: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>'
    };

    function getActiveAuditErpType() {
      if (typeof currentErpType !== 'undefined' && currentErpType) return currentErpType;
      if (typeof currentStatus !== 'undefined' && currentStatus) {
        if (currentStatus.softwareErp && currentStatus.softwareErp.activeProvider) {
          return currentStatus.softwareErp.activeProvider;
        }
        if (currentStatus.erpType) return currentStatus.erpType;
      }
      return 'factusol';
    }

    function syncCatalogAuditErpBanner(erpTypeOverride) {
      const providerId = erpTypeOverride || getActiveAuditErpType();
      const meta = AUDIT_ERP_META[providerId] || AUDIT_ERP_META.factusol;

      const badgeEl = document.getElementById('audit-active-erp-badge');
      const nameEl = document.getElementById('audit-active-erp-name');
      const engineEl = document.getElementById('audit-active-erp-engine');
      const tablesEl = document.getElementById('audit-active-erp-tables');

      if (badgeEl) {
        badgeEl.className = meta.tagClass;
        badgeEl.textContent = meta.badge;
      }
      if (nameEl) nameEl.textContent = meta.name;
      if (engineEl) engineEl.textContent = meta.engine;
      if (tablesEl) tablesEl.textContent = meta.tables;

      // Si el usuario cambió de ERP y ya había un informe de otro ERP distinto, refrescar si la pestaña está activa
      if (_catalogAuditLastProvider && _catalogAuditLastProvider !== providerId) {
        const pane = document.getElementById('tab-catalog-audit');
        if (pane && pane.classList.contains('active')) {
          loadCatalogAudit(_catalogAuditLastDemoMode);
        } else {
          _catalogAuditReport = null;
        }
      }
    }
    window.syncCatalogAuditErpBanner = syncCatalogAuditErpBanner;

    async function loadCatalogAudit(forceDemo) {
      const providerId = getActiveAuditErpType();
      syncCatalogAuditErpBanner(providerId);

      const useDemo = Boolean(forceDemo);
      _catalogAuditLastDemoMode = useDemo;
      _catalogAuditLastProvider = providerId;

      const btnRun = document.getElementById('btn-audit-run');
      const originalBtnHtml = btnRun ? btnRun.innerHTML : '';
      if (btnRun) {
        btnRun.disabled = true;
        btnRun.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Analizando...';
      }

      const tbody = document.getElementById('catalog-audit-table-body');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px;"><span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.25);border-top-color:#818cf8;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Inspeccionando catálogo de ' + (AUDIT_ERP_META[providerId] ? AUDIT_ERP_META[providerId].name : 'ERP') + '...</td></tr>';
      }

      try {
        const query = '/api/local/erp/preview?mode=audit&provider=' + encodeURIComponent(providerId) + (useDemo ? '&demo=1' : '');
        const res = await fetch(query);
        const data = await res.json();

        if (!res.ok || !data || !data.success) {
          throw new Error((data && data.message) || 'No se pudo completar la auditoría del catálogo.');
        }

        _catalogAuditReport = data;
        renderCatalogAuditSummary(data);
        renderCatalogAuditTable();
      } catch (err) {
        if (tbody) {
          const esc = window.escapeHtml || function(s) { return s; };
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #f87171; padding: 24px;">' + esc(err && err.message ? err.message : String(err)) + '</td></tr>';
        }
      } finally {
        if (btnRun) {
          btnRun.disabled = false;
          btnRun.innerHTML = originalBtnHtml;
        }
      }
    }
    window.loadCatalogAudit = loadCatalogAudit;

    function renderCatalogAuditSummary(report) {
      if (!report) return;
      const summary = report.summary || {};
      const counts = summary.countsByType || {};

      const scoreEl = document.getElementById('audit-kpi-health-score');
      const totalSubEl = document.getElementById('audit-kpi-total-sub');
      const zeroPriceEl = document.getElementById('audit-kpi-zero-price');
      const belowCostEl = document.getElementById('audit-kpi-below-cost');
      const negStockEl = document.getElementById('audit-kpi-negative-stock');
      const missingImgEl = document.getElementById('audit-kpi-missing-image');
      const incompleteEl = document.getElementById('audit-kpi-incomplete-data');
      const sourceBadgeEl = document.getElementById('audit-source-mode-badge');
      const lastRunEl = document.getElementById('audit-last-run-label');
      const sidebarBadge = document.getElementById('sidebar-audit-badge');

      const score = typeof summary.healthScore === 'number' ? summary.healthScore : 100;
      if (scoreEl) {
        scoreEl.textContent = report.dataSourceMode === 'unconfigured' ? '--%' : (score + '%');
        scoreEl.style.color = score >= 85 ? '#34d399' : (score >= 60 ? '#fbbf24' : '#f87171');
      }
      if (totalSubEl) {
        totalSubEl.textContent = (summary.totalInspected || 0).toLocaleString('es-ES') + ' artículos (' + (summary.healthyArticlesCount || 0).toLocaleString('es-ES') + ' óptimos)';
      }
      if (zeroPriceEl) zeroPriceEl.textContent = String(counts.ZERO_PRICE || 0);
      if (belowCostEl) belowCostEl.textContent = String(counts.BELOW_COST || 0);
      if (negStockEl) negStockEl.textContent = String(counts.NEGATIVE_STOCK || 0);
      if (missingImgEl) missingImgEl.textContent = String(counts.MISSING_IMAGE || 0);
      if (incompleteEl) incompleteEl.textContent = String(counts.INCOMPLETE_DATA || 0);

      if (sourceBadgeEl) {
        if (report.dataSourceMode === 'demo') {
          sourceBadgeEl.className = 'tag tag-amber';
          sourceBadgeEl.style.background = '';
          sourceBadgeEl.style.color = '';
          sourceBadgeEl.textContent = 'Simulación Demo (' + (report.erpDisplayName || report.providerId) + ')';
        } else if (report.dataSourceMode === 'live') {
          sourceBadgeEl.className = 'tag tag-green';
          sourceBadgeEl.style.background = '';
          sourceBadgeEl.style.color = '';
          sourceBadgeEl.textContent = 'Base de Datos Real Conectada';
        } else {
          sourceBadgeEl.className = 'tag';
          sourceBadgeEl.style.background = 'rgba(255,255,255,0.06)';
          sourceBadgeEl.style.color = 'var(--text-muted)';
          sourceBadgeEl.textContent = 'ERP Pendiente de Conectar';
        }
      }

      if (lastRunEl) {
        const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastRunEl.textContent = 'Último análisis: ' + timeStr + (typeof report.durationMs === 'number' ? ' (' + report.durationMs + ' ms)' : '');
      }

      if (sidebarBadge) {
        const totalIssues = summary.affectedArticlesCount || 0;
        if (report.dataSourceMode === 'unconfigured') {
          sidebarBadge.textContent = 'Auditor';
          sidebarBadge.className = 'tag';
        } else if (totalIssues > 0) {
          sidebarBadge.textContent = totalIssues + ' avisos';
          sidebarBadge.className = (counts.ZERO_PRICE || 0) > 0 ? 'tag tag-rose' : 'tag tag-amber';
        } else {
          sidebarBadge.textContent = '100% OK';
          sidebarBadge.className = 'tag tag-green';
        }
      }
    }

    function setCatalogAuditFilter(filterType) {
      _catalogAuditFilter = filterType || 'ALL';
      document.querySelectorAll('.audit-filter-btn').forEach(function(btn) {
        if (btn.getAttribute('data-audit-filter') === _catalogAuditFilter) {
          btn.classList.add('active');
          btn.style.borderColor = '#6366f1';
          btn.style.color = '#fff';
          btn.style.background = 'rgba(99, 102, 241, 0.18)';
        } else {
          btn.classList.remove('active');
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.style.background = '';
        }
      });
      renderCatalogAuditTable();
    }
    window.setCatalogAuditFilter = setCatalogAuditFilter;

    function renderCatalogAuditTable() {
      const tbody = document.getElementById('catalog-audit-table-body');
      if (!tbody) return;
      const esc = window.escapeHtml || function(s) { return s; };
      const providerId = getActiveAuditErpType();
      const erpMeta = AUDIT_ERP_META[providerId] || AUDIT_ERP_META.factusol;

      if (!_catalogAuditReport) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px;">Pulsa en <strong>Analizar Catálogo</strong> para inspeccionar los artículos de ' + esc(erpMeta.name) + '.</td></tr>';
        return;
      }

      if (_catalogAuditReport.dataSourceMode === 'unconfigured') {
        tbody.innerHTML =
          '<tr><td colspan="7" style="text-align: center; padding: 32px 20px;">' +
            '<div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.04); color: #94a3b8; margin-bottom: 10px;">' +
              AUDIT_MINIMAL_ICONS.database +
            '</div>' +
            '<div style="font-size: 13.5px; font-weight: 600; color: #e4e4e7; margin-bottom: 4px;">' + esc(erpMeta.name) + ' aún no tiene una base de datos conectada</div>' +
            '<div style="font-size: 12px; color: var(--text-muted); max-width: 520px; margin: 0 auto 14px auto; line-height: 1.5;">' +
              'Puedes conectar la base de datos local de <strong>' + esc(erpMeta.name) + '</strong> o ejecutar una simulación interactiva con anomalías de muestra adaptadas a las tablas de ' + esc(erpMeta.name) + '.' +
            '</div>' +
            '<div style="display: inline-flex; gap: 10px; flex-wrap: wrap; justify-content: center;">' +
              '<button type="button" class="btn btn-primary btn-sm" onclick="loadCatalogAudit(true)">Simular Auditoría Demo (' + esc(erpMeta.badge) + ')</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" onclick="switchTab(&apos;factusol&apos;)">Configurar ' + esc(erpMeta.name) + '</button>' +
            '</div>' +
          '</td></tr>';
        return;
      }

      const searchInput = document.getElementById('audit-search-input');
      const q = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
      const allIssues = _catalogAuditReport.issues || [];

      const filtered = allIssues.filter(function(item) {
        if (_catalogAuditFilter !== 'ALL') {
          if (!item.issueTypes || item.issueTypes.indexOf(_catalogAuditFilter) === -1) {
            return false;
          }
        }
        if (q) {
          const matchCode = (item.code || '').toLowerCase().indexOf(q) !== -1;
          const matchName = (item.name || '').toLowerCase().indexOf(q) !== -1;
          const matchFam = (item.family || '').toLowerCase().indexOf(q) !== -1;
          const matchBar = (item.barcode || '').toLowerCase().indexOf(q) !== -1;
          return matchCode || matchName || matchFam || matchBar;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">' +
            '<div style="display: inline-flex; align-items: center; gap: 8px; color: #34d399; font-weight: 600; font-size: 13px;">' +
              AUDIT_MINIMAL_ICONS.check +
              '<span>No se encontraron anomalías con el filtro seleccionado en ' + esc(erpMeta.name) + '.</span>' +
            '</div>' +
          '</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(function(item) {
        let sevTagClass = 'tag tag-blue';
        let sevLabel = 'Aviso';
        let sevIcon = AUDIT_MINIMAL_ICONS.info;

        if (item.severity === 'critical') {
          sevTagClass = 'tag tag-rose';
          sevLabel = 'Crítico';
          sevIcon = AUDIT_MINIMAL_ICONS.critical;
        } else if (item.severity === 'warning') {
          sevTagClass = 'tag tag-amber';
          sevLabel = 'Advertencia';
          sevIcon = AUDIT_MINIMAL_ICONS.warning;
        }

        const stockColor = item.stock < 0 ? '#f87171' : (item.stock === 0 ? '#fbbf24' : '#34d399');
        const priceColor = item.price <= 0 ? '#f87171' : (item.costPrice > 0 && item.price < item.costPrice ? '#fbbf24' : '#e4e4e7');

        const badgesHtml = (item.issueLabels || []).map(function(lbl) {
          return '<span style="display:inline-block; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #e4e4e7; margin: 2px 4px 2px 0;">' + esc(lbl) + '</span>';
        }).join('');

        return '<tr>' +
          '<td>' +
            '<span class="' + sevTagClass + '" style="display: inline-flex; align-items: center; gap: 5px;">' +
              sevIcon +
              '<span>' + sevLabel + '</span>' +
            '</span>' +
          '</td>' +
          '<td><span style="font-family: monospace; font-weight: 600; font-size: 12px; color: #a5b4fc;">' + esc(item.code) + '</span></td>' +
          '<td>' +
            '<div style="font-weight: 600; color: #f4f4f5; font-size: 12.5px;">' + esc(item.name) + '</div>' +
            '<div style="font-size: 11px; color: var(--text-subtle); margin-top: 2px;">Familia: <strong>' + esc(item.family) + '</strong> · EAN: <span style="font-family: monospace;">' + esc(item.barcode) + '</span></div>' +
          '</td>' +
          '<td style="text-align: right; font-family: monospace; font-weight: 700; color: ' + stockColor + ';">' + Number(item.stock).toLocaleString('es-ES') + '</td>' +
          '<td style="text-align: right; font-family: monospace;">' +
            '<div style="font-weight: 700; color: ' + priceColor + ';">' + Number(item.price || 0).toFixed(2) + ' €</div>' +
            '<div style="font-size: 10.5px; color: var(--text-subtle);">Coste: ' + Number(item.costPrice || 0).toFixed(2) + ' €</div>' +
          '</td>' +
          '<td>' + badgesHtml + '</td>' +
          '<td>' +
            '<div style="font-size: 11px; font-family: monospace; color: #818cf8; margin-bottom: 2px;">[' + esc(item.erpTableRef) + ']</div>' +
            '<div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">' + esc(item.remediationHint) + '</div>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
    window.renderCatalogAuditTable = renderCatalogAuditTable;

    function exportCatalogAuditCsv() {
      const providerId = getActiveAuditErpType();
      const useDemo = _catalogAuditLastDemoMode || (_catalogAuditReport && _catalogAuditReport.dataSourceMode === 'demo');
      const url = '/api/local/erp/preview?mode=audit-csv&provider=' + encodeURIComponent(providerId) + (useDemo ? '&demo=1' : '');
      window.open(url, '_blank');
      if (typeof showToast === 'function') {
        showToast('Exportando informe CSV de auditoría para ' + (AUDIT_ERP_META[providerId] ? AUDIT_ERP_META[providerId].name : providerId) + '...', 'info');
      }
    }
    window.exportCatalogAuditCsv = exportCatalogAuditCsv;
`;
