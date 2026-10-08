import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const generalDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\Datos generales\\General.accdb';
  const dGen = new AccessDriver({ databasePath: generalDbPath });

  console.log('=== FORMAS DE PAGO EN GENERAL.ACCDB (F_FOP) ===');
  try {
    const fops = await dGen.query<any>('SELECT CODFOP, DESFOP FROM F_FOP');
    for (const f of fops) {
      console.log(`  Código: '${f.CODFOP}' -> ${f.DESFOP}`);
    }
  } catch (e: any) {
    console.log('Error F_FOP en General:', e.message);
  }
}

main().catch(console.error);
