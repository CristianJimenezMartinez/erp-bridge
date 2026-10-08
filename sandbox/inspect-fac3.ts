import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const companyDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const dComp = new AccessDriver({ databasePath: companyDbPath });

  console.log('=== INSPECCIÓN DETALLADA DE FACTURA 3 (GENERADA A PARTIR DE PEDIDO 5) ===');
  const fac3 = await dComp.query<any>('SELECT * FROM F_FAC WHERE CODFAC = 3');
  if (fac3.length > 0) {
    const f = fac3[0];
    console.log('Cabecera Factura 3:');
    console.log(`  Serie: ${f.TIPFAC}, Número: ${f.CODFAC}`);
    console.log(`  Referencia: ${f.REFFAC}`);
    console.log(`  Base Imponible 1 (BAS1FAC): ${f.BAS1FAC} €`);
    console.log(`  % IVA 1 (PIVA1FAC): ${f.PIVA1FAC} %`);
    console.log(`  Cuota IVA 1 (IIVA1FAC): ${f.IIVA1FAC} €`);
    console.log(`  Total Factura (TOTFAC): ${f.TOTFAC} €`);
    console.log(`  Cliente: ${f.CLIFAC} - ${f.CNOFAC}`);
    console.log(`  NIF: ${f.CNIFAC}`);
    console.log(`  Forma de Pago: ${f.FOPFAC}`);
    console.log(`  TRZFAC (Trazabilidad / Encadenamiento Veri*Factu): ${f.TRZFAC ? f.TRZFAC.substring(0, 80) + '...' : 'VACÍO'}`);
    console.log(`  Longitud de TRZFAC: ${f.TRZFAC ? f.TRZFAC.length : 0} bytes`);
    console.log(`  Estado Verifactu / TicketBAI: ITBFAC=${f.ITBFAC}, STBFAC=${f.STBFAC}`);
  }

  console.log('\n=== LÍNEAS DE FACTURA 3 (F_LFA) ===');
  const lfas = await dComp.query<any>('SELECT * FROM F_LFA WHERE CODLFA = 3');
  for (const l of lfas) {
    console.log(`  Línea ${l.POSLFA}: Art=${l.ARTLFA} (${l.DESLFA}), Cant=${l.CANLFA}, PrecioNeto=${l.PRELFA}€, TotalNeto=${l.TOTLFA}€`);
  }
}

main().catch(console.error);
