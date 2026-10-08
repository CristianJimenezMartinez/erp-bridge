import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const companyDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const dComp = new AccessDriver({ databasePath: companyDbPath });

  console.log('=== 1. TABLA F_CFG EN EMPRESA 0012026 ===');
  try {
    const cfgs = await dComp.query<any>('SELECT * FROM F_CFG');
    console.log(`Registros en F_CFG: ${cfgs.length}`);
    for (const c of cfgs) {
      console.log(' ', JSON.stringify(c));
    }
  } catch (e: any) {
    console.log('Error F_CFG:', e.message);
  }

  console.log('\n=== 2. TABLA F_EMP EN EMPRESA 0012026 ===');
  try {
    const emps = await dComp.query<any>('SELECT * FROM F_EMP');
    console.log(`Registros en F_EMP: ${emps.length}`);
    for (const emp of emps) {
      for (const [k, v] of Object.entries(emp)) {
        if (v !== null && v !== '' && v !== 0) {
          console.log(`  ${k}: ${v}`);
        }
      }
    }
  } catch (e: any) {
    console.log('Error F_EMP:', e.message);
  }

  console.log('\n=== 3. CLIENTES EN F_CLI (TOP 2) ===');
  try {
    const clis = await dComp.query<any>('SELECT TOP 3 * FROM F_CLI');
    console.log(`Clientes encontrados: ${clis.length}`);
    for (const c of clis) {
      console.log(`Cliente CODCLI=${c.CODCLI}, NOFCLI=${c.NOFCLI}, NIFCLI=${c.NIFCLI}, TIVCLI=${c.TIVCLI}, FOPCLI=${c.FOPCLI}, TLLCLI=${c.TLLCLI}`);
    }
  } catch (e: any) {
    console.log('Error F_CLI:', e.message);
  }

  console.log('\n=== 4. STOCK DE ARTÍCULO 000001 (F_STO) ===');
  try {
    const stos = await dComp.query<any>("SELECT * FROM F_STO WHERE ARTSTO = '000001'");
    for (const s of stos) {
      console.log(`Almacén: ${s.ALMSTO}, Actual (ACTSTO): ${s.ACTSTO}, Disponible (DISSTO): ${s.DISSTO}, Reservado Clientes (RESCLI): ${s.RESCLI}, Pendiente Entrada (PENENT): ${s.PENENT}`);
    }
  } catch (e: any) {
    console.log('Error F_STO:', e.message);
  }

  console.log('\n=== 5. FACTURAS EXISTENTES (F_FAC) Y ORIGEN ===');
  try {
    const facs = await dComp.query<any>('SELECT TIPFAC, CODFAC, REFFAC, FECFAC, TOTFAC, CLIFAC, CNOFAC, PEDFAC, ITBFAC, STBFAC, TRZFAC FROM F_FAC');
    for (const f of facs) {
      console.log(`Factura ${f.TIPFAC}/${f.CODFAC}: Ref=${f.REFFAC}, Fecha=${f.FECFAC}, Total=${f.TOTFAC}€, Cliente=${f.CLIFAC} (${f.CNOFAC}), PedidoOrigen=${f.PEDFAC}`);
      console.log(`  TRZFAC (Hash Chaining): ${f.TRZFAC ? f.TRZFAC.substring(0, 40) + '... (len: ' + f.TRZFAC.length + ')' : '<VACÍO>'}`);
      console.log(`  ITBFAC=${f.ITBFAC}, STBFAC=${f.STBFAC}`);
    }
  } catch (e: any) {
    console.log('Error F_FAC:', e.message);
  }

  console.log('\n=== 6. ALBARANES EXISTENTES (F_ALB) ===');
  try {
    const albs = await dComp.query<any>('SELECT TIPALB, CODALB, REFALB, FECALB, TOTALB, FACALB, FCOALB FROM F_ALB');
    for (const a of albs) {
      console.log(`Albarán ${a.TIPALB}/${a.CODALB}: Ref=${a.REFALB}, Fecha=${a.FECALB}, Total=${a.TOTALB}€, Facturado=${a.FACALB}, Factura=${a.FCOALB}`);
    }
  } catch (e: any) {
    console.log('Error F_ALB:', e.message);
  }

  console.log('\n=== 7. PEDIDOS DE CLIENTE (F_PCL) ===');
  try {
    const pcls = await dComp.query<any>('SELECT TIPPCL, CODPCL, REFPCL, FECPCL, TOTPCL, BAS1PCL, IIVA1PCL, ESTPCL FROM F_PCL');
    for (const p of pcls) {
      console.log(`Pedido ${p.TIPPCL}/${p.CODPCL}: Ref=${p.REFPCL}, Fecha=${p.FECPCL}, Base=${p.BAS1PCL}€, IVA=${p.IIVA1PCL}€, Total=${p.TOTPCL}€, Estado (ESTPCL)=${p.ESTPCL}`);
    }
  } catch (e: any) {
    console.log('Error F_PCL:', e.message);
  }

  console.log('\n=== 8. LÍNEAS DE PEDIDO 5 (F_LPC) ===');
  try {
    const lpcs = await dComp.query<any>('SELECT CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, PRELPC, TOTLPC, PIVLPC FROM F_LPC WHERE CODLPC = 5');
    for (const l of lpcs) {
      console.log(`  Línea ${l.POSLPC}: Art=${l.ARTLPC} (${l.DESLPC}), Cant=${l.CANLPC}, PrecioNeto=${l.PRELPC}€, TotalNeto=${l.TOTLPC}€, PVP=${l.PIVLPC}€`);
    }
  } catch (e: any) {
    console.log('Error F_LPC:', e.message);
  }
}

main().catch(console.error);
