/**
 * (c) 2026 Cristian Jiménez Martínez / Bentian. Todos los derechos reservados.
 * Tests de estabilidad y resiliencia de Hardware ID (HWID).
 */

import assert from 'assert';
import * as os from 'os';
import { HWIDManager } from '../src/security/hwid';

async function run() {
  console.log('=== Iniciando Suite de Estabilidad y Resiliencia de HWID ===\n');

  // --------------------------------------------------------------------------
  // TEST 1: Determinismo absoluto en múltiples ejecuciones sucesivas
  // --------------------------------------------------------------------------
  console.log('▶ [Test 1/5] Verificando determinismo absoluto en ejecuciones repetidas...');
  const baseFp = await HWIDManager.calculate();
  assert(baseFp.fingerprint, 'Fingerprint debe estar presente');
  assert.strictEqual(baseFp.fingerprint.length, 64, 'El hash SHA-256 debe tener exactamente 64 caracteres hex');
  assert(baseFp.macAddress, 'MAC address debe estar presente');
  assert(baseFp.diskSerial, 'Serial de disco/placa base debe estar presente');
  assert(baseFp.windowsSID, 'Machine GUID / SID debe estar presente');

  for (let i = 0; i < 5; i++) {
    const iterFp = await HWIDManager.calculate({ bypassCache: i === 0 });
    assert.strictEqual(iterFp.fingerprint, baseFp.fingerprint, `Iteración ${i}: Fingerprint no determinista`);
    assert.strictEqual(iterFp.macAddress, baseFp.macAddress, `Iteración ${i}: MAC address fluctuó`);
    assert.strictEqual(iterFp.diskSerial, baseFp.diskSerial, `Iteración ${i}: Serial de disco fluctuó`);
    assert.strictEqual(iterFp.windowsSID, baseFp.windowsSID, `Iteración ${i}: Machine GUID fluctuó`);
  }
  console.log(`  ✓ Ejecuciones consecutivas (con y sin cache) 100% deterministas: ${baseFp.fingerprint.substring(0, 16)}...`);

  // --------------------------------------------------------------------------
  // TEST 2: Invarianza ante cambio legítimo de Hostname (Renombrado del equipo)
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 2/5] Verificando invarianza del HWID ante renombramiento del equipo...');
  const realOs = require('os');
  const origHostnameFn = realOs.hostname;

  try {
    // 2a. Probar con customHostname en options
    const fpCustom1 = await HWIDManager.calculate({ customHostname: 'DESKTOP-98X' });
    const fpCustom2 = await HWIDManager.calculate({ customHostname: 'SERVIDOR-FACTUSOL' });
    const fpCustom3 = await HWIDManager.calculate({ customHostname: 'PC-ADMINISTRACION-01' });

    assert.strictEqual(fpCustom1.fingerprint, fpCustom2.fingerprint, 'HWID fingerprint debe ser idéntico entre DESKTOP-98X y SERVIDOR-FACTUSOL');
    assert.strictEqual(fpCustom2.fingerprint, fpCustom3.fingerprint, 'HWID fingerprint debe ser idéntico con PC-ADMINISTRACION-01');
    assert.strictEqual(fpCustom1.fingerprint, baseFp.fingerprint, 'HWID con customHostname debe coincidir con el base');

    // 2b. Probar sobrescribiendo os.hostname() directamente en el runtime
    realOs.hostname = () => 'SERVIDOR-FACTUSOL-RENAMED';
    const fpOsMocked = await HWIDManager.calculate();
    assert.strictEqual(fpOsMocked.fingerprint, baseFp.fingerprint, 'HWID no debe cambiar al cambiar os.hostname()');
    assert.strictEqual(fpOsMocked.computerName, 'SERVIDOR-FACTUSOL-RENAMED');

    realOs.hostname = () => 'NUEVO-HOST-CONTABILIDAD';
    const fpOsMocked2 = await HWIDManager.calculate();
    assert.strictEqual(fpOsMocked2.fingerprint, baseFp.fingerprint, 'HWID no debe cambiar tras segundo renombramiento');
    assert.strictEqual(fpOsMocked2.computerName, 'NUEVO-HOST-CONTABILIDAD');

    console.log('  ✓ Invarianza de HWID probada: Renombrar el equipo conserva intacto el token y HWID fingerprint.');
  } finally {
    realOs.hostname = origHostnameFn;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Filtrado estricto de VPNs y Adaptadores Virtuales
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 3/5] Verificando filtrado estricto de adaptadores virtuales y VPNs...');

  const mockPhysicalMac = 'B4:2E:99:A1:C2:E0';
  const simulatedInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
    'tailscale0': [
      { address: '100.64.0.1', netmask: '255.255.255.255', family: 'IPv4' as const, mac: '00:00:00:00:00:01', internal: false, cidr: '100.64.0.1/32' },
    ],
    'nordlynx': [
      { address: '10.5.0.2', netmask: '255.255.255.255', family: 'IPv4' as const, mac: '00:00:00:00:00:02', internal: false, cidr: '10.5.0.2/32' },
    ],
    'wg0-wireguard': [
      { address: '10.8.0.3', netmask: '255.255.255.0', family: 'IPv4' as const, mac: '00:00:00:00:00:03', internal: false, cidr: '10.8.0.3/24' },
    ],
    'zerotier-one': [
      { address: '10.147.17.1', netmask: '255.255.255.0', family: 'IPv4' as const, mac: '00:00:00:00:00:04', internal: false, cidr: '10.147.17.1/24' },
    ],
    'vEthernet (Hyper-V firewall)': [
      { address: '172.27.240.1', netmask: '255.255.240.0', family: 'IPv4' as const, mac: '00:15:5D:F3:CA:AF', internal: false, cidr: '172.27.240.1/20' },
    ],
    'vEthernet (WSL)': [
      { address: '172.28.0.1', netmask: '255.255.240.0', family: 'IPv4' as const, mac: '00:15:5D:AA:BB:CC', internal: false, cidr: '172.28.0.1/20' },
    ],
    'docker0': [
      { address: '172.17.0.1', netmask: '255.255.0.0', family: 'IPv4' as const, mac: '02:42:AC:11:00:01', internal: false, cidr: '172.17.0.1/16' },
    ],
    'VirtualBox Host-Only Network': [
      { address: '192.168.56.1', netmask: '255.255.255.0', family: 'IPv4' as const, mac: '0A:00:27:00:00:00', internal: false, cidr: '192.168.56.1/24' },
    ],
    'TAP-Windows Adapter V9': [
      { address: '10.9.0.1', netmask: '255.255.255.0', family: 'IPv4' as const, mac: '00:FF:11:22:33:44', internal: false, cidr: '10.9.0.1/24' },
    ],
    'Bluetooth Network Connection': [
      { address: '192.168.3.1', netmask: '255.255.255.0', family: 'IPv4' as const, mac: 'CC:DD:EE:00:11:22', internal: false, cidr: '192.168.3.1/24' },
    ],
    'Loopback Pseudo-Interface 1': [
      { address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4' as const, mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' },
    ],
    'Wi-Fi': [
      { address: '192.168.1.150', netmask: '255.255.255.0', family: 'IPv4' as const, mac: mockPhysicalMac, internal: false, cidr: '192.168.1.150/24' },
    ],
  };

  const primaryMac = HWIDManager.getPrimaryMacAddress(simulatedInterfaces);
  assert.strictEqual(
    primaryMac,
    mockPhysicalMac,
    `La MAC detectada debe ser la física (${mockPhysicalMac}), pero se obtuvo: ${primaryMac}`
  );

  const physicalMacs = HWIDManager.getPhysicalMacAddresses(simulatedInterfaces);
  assert.strictEqual(physicalMacs.length, 1, 'Solo debe haber 1 MAC física válida tras filtrar adaptadores virtuales');
  assert.strictEqual(physicalMacs[0], mockPhysicalMac);

  console.log('  ✓ 10 adaptadores virtuales/VPN ignorados correctamente. Solo se seleccionó la MAC física real.');

  // --------------------------------------------------------------------------
  // TEST 4: Estabilidad de HWID con VPNs conectadas en caliente
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 4/5] Verificando estabilidad de HWID al conectar/desconectar VPNs en caliente...');

  const realInterfaces = os.networkInterfaces();
  const interfacesWithTailscale: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
    ...realInterfaces,
    'tailscale0': [
      { address: '100.100.100.1', netmask: '255.255.255.255', family: 'IPv4' as const, mac: '00:00:00:00:00:99', internal: false, cidr: '100.100.100.1/32' },
    ],
  };
  const interfacesWithNord: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
    ...realInterfaces,
    'nordlynx': [
      { address: '10.5.0.10', netmask: '255.255.255.255', family: 'IPv4' as const, mac: '00:00:00:00:00:88', internal: false, cidr: '10.5.0.10/32' },
    ],
  };

  const fpReal = await HWIDManager.calculate({ customInterfaces: realInterfaces });
  const fpWithTailscale = await HWIDManager.calculate({ customInterfaces: interfacesWithTailscale });
  const fpWithNord = await HWIDManager.calculate({ customInterfaces: interfacesWithNord });

  assert.strictEqual(fpReal.macAddress, fpWithTailscale.macAddress, 'MAC física debe ser idéntica con Tailscale activo');
  assert.strictEqual(fpReal.fingerprint, fpWithTailscale.fingerprint, 'HWID debe ser idéntico con Tailscale activo');
  assert.strictEqual(fpReal.macAddress, fpWithNord.macAddress, 'MAC física debe ser idéntica con NordVPN activo');
  assert.strictEqual(fpReal.fingerprint, fpWithNord.fingerprint, 'HWID debe ser idéntico con NordVPN activo');

  console.log('  ✓ HWID blindado e idéntico ante arranques en caliente de Tailscale y NordVPN.');

  // --------------------------------------------------------------------------
  // TEST 5: Determinismo en orden de enumeración de múltiples MACs físicas
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 5/5] Verificando ordenamiento alfabético determinista de interfaces físicas...');

  const order1: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
    'Wi-Fi': [{ address: '192.168.1.10', netmask: '255.255.255.0', family: 'IPv4' as const, mac: 'CC:11:22:33:44:55', internal: false, cidr: '192.168.1.10/24' }],
    'Ethernet': [{ address: '192.168.1.11', netmask: '255.255.255.0', family: 'IPv4' as const, mac: 'AA:11:22:33:44:55', internal: false, cidr: '192.168.1.11/24' }],
  };

  const order2: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
    'Ethernet': [{ address: '192.168.1.11', netmask: '255.255.255.0', family: 'IPv4' as const, mac: 'AA:11:22:33:44:55', internal: false, cidr: '192.168.1.11/24' }],
    'Wi-Fi': [{ address: '192.168.1.10', netmask: '255.255.255.0', family: 'IPv4' as const, mac: 'CC:11:22:33:44:55', internal: false, cidr: '192.168.1.10/24' }],
  };

  const macOrder1 = HWIDManager.getPrimaryMacAddress(order1);
  const macOrder2 = HWIDManager.getPrimaryMacAddress(order2);

  assert.strictEqual(macOrder1, 'AA:11:22:33:44:55', 'Debe seleccionar la menor MAC física alfabéticamente');
  assert.strictEqual(macOrder2, 'AA:11:22:33:44:55', 'Debe seleccionar la menor MAC física alfabéticamente');
  assert.strictEqual(macOrder1, macOrder2, 'El orden de enumeración del SO no debe alterar la MAC seleccionada');

  console.log('  ✓ Orden determinista verificado (AA:11:22:33:44:55 seleccionada independientemente del orden de inserción).');

  console.log('\n======================================================================');
  console.log('🎉 TODOS LOS TESTS DE RESILIENCIA Y ESTABILIDAD DE HWID PASARON CON ÉXITO');
  console.log('======================================================================\n');
}

run().catch((err) => {
  console.error('❌ Error en tests de estabilidad HWID:', err);
  process.exit(1);
});
