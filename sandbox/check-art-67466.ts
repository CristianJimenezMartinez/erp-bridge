import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const companyDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const dComp = new AccessDriver({ databasePath: companyDbPath });

  console.log('=== BUSCANDO ARTÍCULO 67466 EN FACTUSOL ===');
  try {
    const arts = await dComp.query<any>("SELECT CODART, DESART, FAMART, TIVART, PCOART FROM F_ART WHERE CODART LIKE '%67466%' OR DESART LIKE '%PRUEBAS%'");
    console.log('Resultados F_ART:', JSON.stringify(arts, null, 2));
  } catch (e: any) {
    console.log('Error F_ART:', e.message);
  }

  console.log('\n=== ÚLTIMOS PEDIDOS EN F_PCL ===');
  try {
    const pcls = await dComp.query<any>("SELECT TOP 5 TIPPCL, CODPCL, REFPCL, FECPCL, TOTPCL, ESTPCL, CNOPCL FROM F_PCL ORDER BY FECPCL DESC, CODPCL DESC");
    console.log('Últimos F_PCL:', JSON.stringify(pcls, null, 2));
  } catch (e: any) {
    console.log('Error F_PCL:', e.message);
  }
}

main().catch(console.error);
