import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function run() {
  const d = new AccessDriver({ databasePath: 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb' });
  const maxPcl = await d.query<{ maxid: number }>('SELECT MAX(CODPCL) as maxid FROM F_PCL WHERE TIPPCL = \'1\'');
  const nextId = (maxPcl[0]?.maxid || 0) + 1;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const fecpcl = `#${yyyy}/${mm}/${dd}#`;

  // Pedido con Base Imponible 73.55, IVA 15.45, Total 89.00 exacto
  const sqlHeader = `
    INSERT INTO F_PCL (
      TIPPCL, CODPCL, REFPCL, FECPCL, HORPCL, USUPCL, CPAPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL, TELPCL, CEMPCL,
      TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, BAS1PCL, PIVA1PCL, IIVA1PCL, PREC1PCL, IREC1PCL,
      NET2PCL, BAS2PCL, PIVA2PCL, IIVA2PCL, PREC2PCL, IREC2PCL,
      NET3PCL, BAS3PCL, PIVA3PCL, IIVA3PCL, PREC3PCL, IREC3PCL,
      NET4PCL, BAS4PCL, IPOR1PCL, TOTPCL,
      FOPPCL, OB1PCL
    ) VALUES (
      '1', ${nextId}, 'PRUEBA-IVA-89EUR', ${fecpcl}, #22:30:00#, 0, '724', 0, 1,
      'Cliente Prueba IVA', 'Calle Mayor 1', 'Madrid', '28001', 'Madrid', '12345678Z', '600000000', 'test@test.com',
      0, 0, 0, 'GEN',
      73.55, 73.55, 21.0, 15.45, 5.2, 0,
      0, 0, 10.0, 0, 1.4, 0,
      0, 0, 4.0, 0, 0.5, 0,
      0, 0, 0, 89.00,
      'TAR', 'Pedido prueba matematica IVA'
    )
  `;

  const sqlLine = `
    INSERT INTO F_LPC (
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, PRELPC, TOTLPC,
      PENLPC, IVALPC, MEMLPC, PIVLPC, TIVLPC
    ) VALUES (
      '1', ${nextId}, 1, '000001', 'Taladro Percutor 850W', 1, 0, 73.5537, 73.55,
      1, 0, 'Taladro Percutor 850W', 89.00, 89.00
    )
  `;

  await d.execute(sqlHeader);
  await d.execute(sqlLine);
  console.log('✓ PEDIDO DE PRUEBA INSERTADO CON ÉXITO: CODPCL =', nextId);
}

run().catch(console.error);
