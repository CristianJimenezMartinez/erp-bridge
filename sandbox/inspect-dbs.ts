import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function inspect() {
  const generalPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\Datos generales\\General.accdb';
  const companyPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';

  console.log('=== INSPECCIONANDO GENERAL.ACCDB ===');
  const dGeneral = new AccessDriver({ databasePath: generalPath });
  const generalCandidateTables = [
    'F_EMP', 'EMPRESAS', 'F_USU', 'USUARIOS', 'F_EJE', 'EJERCICIOS',
    'F_CON', 'F_SEC', 'CONFIG', 'F_PAR', 'PARMETROS', 'F_MOD'
  ];

  for (const t of generalCandidateTables) {
    try {
      const res = await dGeneral.query<any>(`SELECT TOP 5 * FROM ${t}`);
      console.log(`✓ Tabla en General.accdb [${t}]:`, Object.keys(res[0] || {}));
      console.log(`  Datos:`, res);
    } catch (e: any) {
      // not found
    }
  }

  console.log('\n=== INSPECCIONANDO 0012026.ACCDB ===');
  const dCompany = new AccessDriver({ databasePath: companyPath });
  const companyCandidateTables = [
    'F_CLI', 'F_ART', 'F_STO', 'F_PCL', 'F_LPC', 'F_ALB', 'F_LAL',
    'F_FAC', 'F_LFA', 'F_FCO', 'F_CON', 'F_SEC', 'F_IVA', 'F_TAR',
    'F_FAM', 'F_SEC', 'F_PRO', 'F_AGE', 'F_FOR', 'F_BAN', 'F_OBR',
    'F_EJE', 'F_EMP', 'F_DIR', 'F_LCO'
  ];

  for (const t of companyCandidateTables) {
    try {
      const res = await dCompany.query<any>(`SELECT COUNT(*) AS total FROM ${t}`);
      console.log(`✓ Tabla en 0012026.accdb [${t}]: total =`, res[0]?.total);
    } catch (e: any) {
      // not found
    }
  }
}

inspect().catch(console.error);
