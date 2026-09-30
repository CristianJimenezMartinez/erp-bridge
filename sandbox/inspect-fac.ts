import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function inspectFac() {
  const companyPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const driver = new AccessDriver({ databasePath: companyPath });

  const rows = await driver.query<any>('SELECT TOP 1 * FROM F_FAC');
  if (rows.length > 0) {
    console.log('Columnas en F_FAC:', Object.keys(rows[0]));
    console.log('Registro en F_FAC:', rows[0]);
  } else {
    console.log('F_FAC está vacía');
  }
}

inspectFac().catch(console.error);
