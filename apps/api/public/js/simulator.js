// Micro-interacción: Simulación de Modificación de Stock
(function initStockSimulator() {
  var btn = document.getElementById('btn-simulate-sync');
  var factusolStock = document.getElementById('demo-factusol-stock');
  var wcStock = document.getElementById('demo-wc-stock');
  var statusTag = document.getElementById('demo-sync-status');
  var packetStock = document.getElementById('live-packet-stock');
  var packetTs = document.getElementById('live-packet-ts');

  var currentStock = 42;
  if (!btn) return;

  btn.addEventListener('click', function() {
    currentStock = currentStock === 42 ? 41 : (currentStock === 41 ? 39 : 42);
    
    if (statusTag) {
      statusTag.innerHTML = '<span class="text-amber-400">● Propagando delta...</span>';
    }

    setTimeout(function() {
      if (factusolStock) factusolStock.innerText = currentStock.toFixed(3);
      if (wcStock) wcStock.innerText = currentStock.toString();
      if (packetStock) packetStock.innerText = currentStock.toString();
      
      var now = new Date();
      var timeStr = now.toTimeString().split(' ')[0];
      if (packetTs) packetTs.innerText = timeStr;

      if (statusTag) {
        statusTag.innerHTML = '<span class="text-emerald-400">● Sincronizado (' + (280 + Math.floor(Math.random() * 150)) + 'ms)</span>';
      }
    }, 320);
  });
})();
