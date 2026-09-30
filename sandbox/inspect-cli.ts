import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function inspectCli() {
  const companyPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const driver = new AccessDriver({ databasePath: companyPath });

  const rows = await driver.query<any>('SELECT * FROM F_CLI');
  console.log('Total clientes en F_CLI:', rows.length);
  if (rows.length > 0) {
    console.log('Cliente 1 en F_CLI:', rows[0]);
  }
}

inspectCli().catch(console.error);
