export const licenseScript = `
    async function activateLicenseKey() {
      const key = document.getElementById('input-lic-key').value.trim();
      const alertBox = document.getElementById('lic-activate-alert');
      const btn = document.getElementById('btn-activate-lic');
      if (!key) {
        showToast('Introduce una clave de licencia válida', 'warn');
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch('/api/local/activate-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key })
        });
        const data = await res.json();
        alertBox.style.display = 'block';
        if (data.success) {
          alertBox.style.color = '#34d399';
          alertBox.textContent = '✓ Licencia activada con éxito.';
          showToast('Licencia vinculada a este equipo con éxito');
          fetchStatus();
        } else {
          alertBox.style.color = '#f87171';
          alertBox.textContent = '✕ Error: ' + (data.error || 'No se pudo activar la clave');
          showToast('Error al activar clave', 'error');
        }
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error de red al activar licencia';
      } finally {
        btn.disabled = false;
      }
    }

    function openCloudDashboard(e) {
      if (e) e.preventDefault();
      const key = (typeof currentStatus !== 'undefined' && currentStatus && currentStatus.licenseKey) || 
                  (document.getElementById('input-lic-key') ? document.getElementById('input-lic-key').value.trim() : '');
      let url = 'https://bridge.cristianjm.com/dashboard/';
      if (key && key.startsWith('EB-')) {
        url += '?key=' + encodeURIComponent(key);
      }
      window.open(url, '_blank');
    }

    async function submitConfigUpdates(updates, successMsg) {
      try {
        const res = await fetch('/api/local/save-full-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (data.success) {
          showToast(successMsg);
          fetchStatus(true);
        } else {
          showToast('Error al guardar: ' + data.message, 'error');
        }
      } catch (err) {
        showToast('Error al guardar configuración', 'error');
      }
    }

    function copyHwid() {
      const val = document.getElementById('lic-hwid-val').value;
      if (val) {
        navigator.clipboard.writeText(val);
        showToast('HWID copiado al portapapeles');
      }
    }
`;
