import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const companyDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const dComp = new AccessDriver({ databasePath: companyDbPath });

  console.log('=== FORMAS DE PAGO EN FACTUSOL (F_FOP) ===');
  try {
    const fops = await dComp.query<any>('SELECT CODFOP, DESFOP FROM F_FOP');
    for (const f of fops) {
      console.log(`  Código: '${f.CODFOP}' -> ${f.DESFOP}`);
    }
  } catch (e: any) {
    console.log('Error F_FOP:', e.message);
  }

  console.log('\n=== ARTÍCULOS EN FACTUSOL (F_ART TOP 5) ===');
  try {
    const arts = await dComp.query<any>('SELECT CODART, DESART, FAMART, TIVART, PCOART, EQUART FROM F_ART');
    for (const a of arts) {
      console.log(`  Art: ${a.CODART} - ${a.DESART} (Familia: ${a.FAMART}, Tipo IVA: ${a.TIVART}, Coste: ${a.PCOART}€)`);
    }
  } catch (e: any) {
    console.log('Error F_ART:', e.message);
  }
}

main().catch(console.error);
