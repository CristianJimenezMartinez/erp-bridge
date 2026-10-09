export const salesHistoryScript = `
    let _salesOrdersCurrentPage = 1;
    let _salesOrdersCurrentLimit = 20;
    let _salesOrdersCurrentRange = 'all';
    let _salesOrdersCurrentSearch = '';
    let _salesOrdersSearchTimeout = null;
    let _salesOrdersCache = [];

    function switchHistorySubTab(subTab) {
      loadSalesOrders();
    }

    function onSalesRangeChange(range) {
      _salesOrdersCurrentRange = range || 'all';
      _salesOrdersCurrentPage = 1;
      loadSalesOrders();
    }

    function onSalesLimitChange(limit) {
      _salesOrdersCurrentLimit = parseInt(limit, 10) || 20;
      _salesOrdersCurrentPage = 1;
      loadSalesOrders();
    }

    function onSalesSearchInput(query) {
      if (_salesOrdersSearchTimeout) clearTimeout(_salesOrdersSearchTimeout);
      _salesOrdersSearchTimeout = setTimeout(function() {
        _salesOrdersCurrentSearch = (query || '').trim();
        _salesOrdersCurrentPage = 1;
        loadSalesOrders();
      }, 300);
    }

    function changeSalesPage(delta) {
      _salesOrdersCurrentPage = Math.max(1, _salesOrdersCurrentPage + delta);
      loadSalesOrders();
    }

    async function loadSalesOrders(page, range, search) {
      if (typeof page === 'number') _salesOrdersCurrentPage = page;
      if (typeof range === 'string') _salesOrdersCurrentRange = range;
      if (typeof search === 'string') _salesOrdersCurrentSearch = search;

      const p = _salesOrdersCurrentPage || 1;
      const l = _salesOrdersCurrentLimit || 20;
      const r = encodeURIComponent(_salesOrdersCurrentRange || 'all');
      const q = encodeURIComponent(_salesOrdersCurrentSearch || '');

      const tbody = document.getElementById('sales-table-body');
      try {
        const res = await fetch('/api/local/sales-orders?page=' + p + '&limit=' + l + '&range=' + r + '&search=' + q);
        if (!res.ok) return;
        const data = await res.json();
        _salesOrdersCache = data.orders || [];

        // 1. Tarjetas KPI
        if (data.metrics) {
          const kpiEur = document.getElementById('kpi-sales-today-eur');
          const kpiCount = document.getElementById('kpi-sales-today-count');
          const kpiIssues = document.getElementById('kpi-sales-issues-count');
          const kpiIssuesTag = document.getElementById('kpi-sales-issues-tag');

          if (kpiEur) kpiEur.textContent = (Number(data.metrics.totalTodayEur) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
          if (kpiCount) kpiCount.textContent = String(data.metrics.ordersTodayCount || 0);
          if (kpiIssues) kpiIssues.textContent = String(data.metrics.issuesCount || 0);
          if (kpiIssuesTag) {
            if ((data.metrics.issuesCount || 0) > 0) {
              kpiIssuesTag.className = 'tag tag-rose';
              kpiIssuesTag.textContent = 'Atención';
            } else {
              kpiIssuesTag.className = 'tag tag-green';
              kpiIssuesTag.textContent = 'Al día';
            }
          }
        }

        // 2. Renderizado de Tabla
        renderSalesOrdersTable(_salesOrdersCache, data.total, data.page, data.totalPages);
      } catch (err) {
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--rose); padding: 20px;">Error al cargar ventas: ' + (err.message || String(err)) + '</td></tr>';
        }
      }
    }

    function renderSalesOrdersTable(orders, total, page, totalPages) {
      const tbody = document.getElementById('sales-table-body');
      if (!tbody) return;

      const esc = window.escapeHtml || function(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px;">No se encontraron pedidos con los filtros aplicados.</td></tr>';
      } else {
        tbody.innerHTML = orders.map(function(o) {
          const channelBadge = o.channel === 'woocommerce'
            ? '<span class="tag tag-blue" style="font-size: 9px; margin-left: 4px;">WC</span>'
            : '<span class="tag tag-amber" style="font-size: 9px; margin-left: 4px;">WEB</span>';

          const formattedDate = o.date ? new Date(o.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '---';
          const factNum = (o.factusolSeries && o.factusolOrderNumber)
            ? (esc(o.factusolSeries) + '-' + esc(o.factusolOrderNumber))
            : (o.factusolOrderNumber ? esc(o.factusolOrderNumber) : '<span style="color: var(--text-subtle);">---</span>');

          const formattedAmount = (Number(o.totalAmount) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (o.currency || '€');

          let statusBadge = '<span class="tag tag-amber">Pendiente</span>';
          if (o.status === 'synced') {
            statusBadge = '<span class="tag tag-green">Sincronizado</span>';
          } else if (o.status === 'failed') {
            statusBadge = '<span class="tag tag-rose" title="' + esc(o.error || '') + '">Incidencia</span>';
          }

          let actionButtons = '<button class="btn btn-secondary btn-sm" onclick="openOrderDetailModal(\\'' + esc(o.id) + '\\')">Ver Detalle</button>';
          if (o.status === 'failed') {
            actionButtons += ' <button class="btn btn-primary btn-sm" onclick="retrySalesOrder(\\'' + esc(o.id) + '\\', this)">Reintentar</button>';
          }

          const customerSub = o.customerEmail ? ('<div style="font-size: 11px; color: var(--text-subtle);">' + esc(o.customerEmail) + '</div>') : '';

          return '<tr>' +
            '<td><strong>#' + esc(o.orderNumber || o.webOrderId) + '</strong>' + channelBadge + '</td>' +
            '<td style="font-family: monospace; font-size: 11px;">' + formattedDate + '</td>' +
            '<td><div style="font-weight: 500;">' + esc(o.customerName || 'Cliente Web') + '</div>' + customerSub + '</td>' +
            '<td style="font-family: monospace;">' + factNum + '</td>' +
            '<td style="text-align: right; font-weight: 600; font-family: monospace;">' + formattedAmount + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td style="text-align: right;">' + actionButtons + '</td>' +
          '</tr>';
        }).join('');
      }

      // 3. Paginador
      const infoEl = document.getElementById('sales-pagination-info');
      const pageEl = document.getElementById('sales-page-indicator');
      const btnPrev = document.getElementById('btn-sales-prev');
      const btnNext = document.getElementById('btn-sales-next');

      if (infoEl) {
        const start = total === 0 ? 0 : ((page - 1) * _salesOrdersCurrentLimit + 1);
        const end = Math.min(total, page * _salesOrdersCurrentLimit);
        infoEl.textContent = 'Mostrando pedidos ' + start + ' a ' + end + ' de ' + total;
      }
      if (pageEl) pageEl.textContent = 'Página ' + (page || 1) + ' de ' + (totalPages || 1);
      if (btnPrev) btnPrev.disabled = (page <= 1);
      if (btnNext) btnNext.disabled = (page >= totalPages);
    }

    async function openOrderDetailModal(orderId) {
      const modal = document.getElementById('modal-order-detail');
      const titleEl = document.getElementById('modal-order-title');
      const subtitleEl = document.getElementById('modal-order-subtitle');
      const bodyEl = document.getElementById('modal-order-body');
      const footerLeft = document.getElementById('modal-order-footer-left');
      const retrySlot = document.getElementById('modal-order-retry-slot');

      if (!modal) return;

      let order = _salesOrdersCache.find(function(o) { return o.id === orderId; });
      if (!order) {
        try {
          const res = await fetch('/api/local/sales-orders/' + encodeURIComponent(orderId));
          if (res.ok) order = await res.json();
        } catch (e) {}
      }

      if (!order) {
        showToast('No se pudo cargar la información del pedido.');
        return;
      }

      const esc = window.escapeHtml || function(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const channelName = order.channel === 'woocommerce' ? 'WooCommerce' : 'Universal Bridge';
      if (titleEl) titleEl.textContent = 'Pedido #' + (order.orderNumber || order.webOrderId) + ' (' + channelName + ')';
      if (subtitleEl) {
        const factNum = (order.factusolSeries && order.factusolOrderNumber)
          ? ('Factusol Serie ' + order.factusolSeries + ' Nº ' + order.factusolOrderNumber)
          : (order.factusolOrderNumber ? ('Factusol Nº ' + order.factusolOrderNumber) : 'No asignado en Factusol');
        subtitleEl.textContent = factNum + ' • ' + (order.date ? new Date(order.date).toLocaleString('es-ES') : '');
      }

      let errorBanner = '';
      if (order.status === 'failed' && order.error) {
        errorBanner = '<div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #fca5a5; font-size: 12px;">' +
          '<strong>Error registrado en Factusol:</strong> ' + esc(order.error) +
        '</div>';
      }

      const lines = order.lines || [];
      let linesHtml = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Sin líneas detalladas.</td></tr>';
      if (lines.length > 0) {
        linesHtml = lines.map(function(l) {
          const q = Number(l.quantity) || 1;
          const u = Number(l.unitPrice) || 0;
          const t = Number(l.total) || (q * u);
          return '<tr>' +
            '<td style="font-family: monospace; font-size: 11px;">' + esc(l.sku || '---') + '</td>' +
            '<td>' + esc(l.name || 'Artículo') + '</td>' +
            '<td style="text-align: right; font-weight: 600;">' + q + '</td>' +
            '<td style="text-align: right; font-family: monospace;">' + u.toFixed(2) + ' €</td>' +
            '<td style="text-align: right; font-weight: 600; font-family: monospace;">' + t.toFixed(2) + ' €</td>' +
          '</tr>';
        }).join('');
      }

      if (bodyEl) {
        bodyEl.innerHTML = errorBanner +
          '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; font-size: 12px;">' +
            '<div style="background: #181820; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--card-border);">' +
              '<div style="font-weight: 600; color: #fff; margin-bottom: 6px;">Datos del Cliente</div>' +
              '<div><strong>Nombre:</strong> ' + esc(order.customerName || 'Cliente Web') + '</div>' +
              '<div><strong>Email:</strong> ' + esc(order.customerEmail || '---') + '</div>' +
              '<div><strong>Teléfono:</strong> ' + esc(order.customerPhone || '---') + '</div>' +
            '</div>' +
            '<div style="background: #181820; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--card-border);">' +
              '<div style="font-weight: 600; color: #fff; margin-bottom: 6px;">Envío y Pago</div>' +
              '<div><strong>Dirección:</strong> ' + esc(order.shippingAddress || 'No especificada') + '</div>' +
              '<div><strong>Método de Pago:</strong> ' + esc(order.paymentMethod || 'Web') + '</div>' +
              '<div><strong>Estado:</strong> ' + esc(order.status) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 8px;">Artículos del Pedido</div>' +
          '<div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--card-border); border-radius: 8px; margin-bottom: 14px;">' +
            '<table class="data-table" style="margin: 0;">' +
              '<thead><tr><th style="width: 100px;">SKU</th><th>Artículo</th><th style="width: 70px; text-align: right;">Cant.</th><th style="width: 90px; text-align: right;">Precio</th><th style="width: 90px; text-align: right;">Total</th></tr></thead>' +
              '<tbody>' + linesHtml + '</tbody>' +
            '</table>' +
          '</div>' +
          '<div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; font-size: 14px;">' +
            '<span style="color: var(--text-muted);">Total del Pedido:</span>' +
            '<strong style="font-size: 18px; color: #34d399; font-family: monospace;">' + (Number(order.totalAmount) || 0).toFixed(2) + ' ' + (order.currency || '€') + '</strong>' +
          '</div>';
      }

      if (footerLeft) {
        footerLeft.textContent = 'ID Interno: ' + order.id + (order.retryCount ? (' • Reintentos: ' + order.retryCount) : '');
      }

      if (retrySlot) {
        if (order.status === 'failed') {
          retrySlot.innerHTML = '<button class="btn btn-primary btn-sm" onclick="retrySalesOrder(\\'' + esc(order.id) + '\\', this)">Reintentar en Factusol</button>';
        } else {
          retrySlot.innerHTML = '';
        }
      }

      modal.classList.add('open');
    }

    function closeOrderDetailModal() {
      const modal = document.getElementById('modal-order-detail');
      if (modal) modal.classList.remove('open');
    }

    async function retrySalesOrder(orderId, btn) {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Reintentando...';
      }
      showToast('Reintentando inserción en Factusol...');

      try {
        const res = await fetch('/api/local/sales-orders/' + encodeURIComponent(orderId) + '/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          showSmartToast({
            title: 'Pedido Registrado',
            message: data.message || 'Pedido sincronizado correctamente con Factusol.',
            type: 'success',
          });
          closeOrderDetailModal();
          loadSalesOrders();
        } else {
          showSmartToast({
            title: 'Error al reintentar',
            message: data.message || data.error || 'No se pudo insertar el pedido en Factusol.',
            type: 'error',
          });
          loadSalesOrders();
        }
      } catch (err) {
        showSmartToast({
          title: 'Error de Red',
          message: 'Fallo al comunicar con el agente local: ' + (err.message || String(err)),
          type: 'error',
        });
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Reintentar';
        }
      }
    }

    window.switchHistorySubTab = switchHistorySubTab;
    window.onSalesRangeChange = onSalesRangeChange;
    window.onSalesLimitChange = onSalesLimitChange;
    window.onSalesSearchInput = onSalesSearchInput;
    window.changeSalesPage = changeSalesPage;
    window.loadSalesOrders = loadSalesOrders;
    window.openOrderDetailModal = openOrderDetailModal;
    window.closeOrderDetailModal = closeOrderDetailModal;
    window.retrySalesOrder = retrySalesOrder;
`;
