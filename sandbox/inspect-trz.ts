import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const companyDbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const dComp = new AccessDriver({ databasePath: companyDbPath });

  console.log('=== INSPECCIÓN DE F_TRZ (TABLA DE TRAZABILIDAD / AUDITORÍA) ===');
  try {
    const trzCols = await dComp.query<any>('SELECT TOP 1 * FROM F_TRZ');
    console.log('F_TRZ registros:', trzCols);
  } catch (e: any) {
    console.log('Error F_TRZ:', e.message);
  }

  console.log('\n=== DECODIFICANDO TRZFAC DE FACTURA 3 ===');
  const fac3 = await dComp.query<any>('SELECT TRZFAC FROM F_FAC WHERE CODFAC = 3');
  const rawTrz = fac3[0]?.TRZFAC;
  if (rawTrz) {
    console.log('Longitud:', rawTrz.length);
    console.log('Primeros 200 caracteres:');
    console.log(rawTrz.substring(0, 200));
    try {
      const decoded = Buffer.from(rawTrz, 'base64').toString('utf8');
      console.log('Decodificado Base64 (primeros 200 chars):');
      console.log(decoded.substring(0, 200));
    } catch (e: any) {
      console.log('No es utf8 directo');
    }
  }

  console.log('\n=== COMPROBAR SI EXISTE QR O HUELLA EN F_FAC ===');
  const facCols = await dComp.query<any>('SELECT TOP 1 * FROM F_FAC');
  if (facCols.length > 0) {
    const keys = Object.keys(facCols[0]);
    console.log('Columnas totales en F_FAC:', keys.length);
    const vfCols = keys.filter(k => 
      k.includes('TRZ') || k.includes('QRC') || k.includes('HUV') || k.includes('ITB') || 
      k.includes('STB') || k.includes('VER') || k.includes('SIF') || k.includes('AEAT')
    );
    console.log('Columnas relacionadas con Veri*Factu / Ley Antifraude:', vfCols);
  }
}

main().catch(console.error);
