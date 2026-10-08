import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const companyDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const dComp = new AccessDriver({ databasePath: companyDbPath });

  console.log('=== INSPECCIÓN DE F_VER (VERIFACTU / VERSIONES) ===');
  try {
    const ver = await dComp.query<any>('SELECT * FROM F_VER');
    console.log('F_VER:', ver);
  } catch (e: any) {
    console.log('Error F_VER:', e.message);
  }

  console.log('\n=== FORMAS DE PAGO / COBRO (F_PAG) ===');
  try {
    const pags = await dComp.query<any>('SELECT * FROM F_PAG');
    console.log(`F_PAG (${pags.length} registros):`);
    for (const p of pags) {
      console.log(' ', p);
    }
  } catch (e: any) {
    console.log('Error F_PAG:', e.message);
  }

  console.log('\n=== FORMAS DE COBRO (F_FCO) ===');
  try {
    const fcos = await dComp.query<any>('SELECT * FROM F_FCO');
    console.log(`F_FCO (${fcos.length} registros):`);
    for (const f of fcos) {
      console.log(' ', f);
    }
  } catch (e: any) {
    console.log('Error F_FCO:', e.message);
  }
}

main().catch(console.error);
