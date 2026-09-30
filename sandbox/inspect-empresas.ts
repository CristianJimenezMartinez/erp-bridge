import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function inspectEmpresas() {
  const generalPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\Datos generales\\General.accdb';
  const companyPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';

  console.log('=== F_EMP EN GENERAL.ACCDB ===');
  const dGeneral = new AccessDriver({ databasePath: generalPath });
  const empGeneral = await dGeneral.query<any>('SELECT * FROM F_EMP');
  console.log('Empresas en General.accdb:', JSON.stringify(empGeneral, null, 2));

  console.log('\n=== F_EMP EN 0012026.ACCDB ===');
  const dCompany = new AccessDriver({ databasePath: companyPath });
  const empCompany = await dCompany.query<any>('SELECT * FROM F_EMP');
  console.log('Empresa en 0012026.accdb:', JSON.stringify(empCompany, null, 2));

  console.log('\n=== F_VER EN 0012026.ACCDB ===');
  try {
    const ver = await dCompany.query<any>('SELECT * FROM F_VER');
    console.log('F_VER:', JSON.stringify(ver, null, 2));
  } catch (e: any) {
    console.log('Error F_VER:', e.message);
  }

  console.log('\n=== F_CFG EN 0012026.ACCDB ===');
  try {
    const cfg = await dCompany.query<any>('SELECT * FROM F_CFG');
    console.log('F_CFG:', JSON.stringify(cfg, null, 2));
  } catch (e: any) {
    console.log('Error F_CFG:', e.message);
  }
}

inspectEmpresas().catch(console.error);
