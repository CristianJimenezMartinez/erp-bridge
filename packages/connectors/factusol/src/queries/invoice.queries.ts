export const GET_NEXT_INVOICE_ID_QUERY = `
  SELECT MAX(CODFAC) AS maxid FROM F_FAC WHERE TIPFAC = ?
`;

export const CHECK_INVOICE_BY_REF_QUERY = `
  SELECT CODFAC, TIPFAC, REFFAC, TOTFAC, ESTFAC, FECFAC 
  FROM F_FAC 
  WHERE REFFAC = ?
`;

export const CHECK_INVOICE_BY_ID_QUERY = `
  SELECT CODFAC, TIPFAC, REFFAC, TOTFAC, ESTFAC, FECFAC 
  FROM F_FAC 
  WHERE TIPFAC = ? AND CODFAC = ?
`;

export const SELECT_INVOICES_HEADER_QUERY = `
  SELECT 
    TIPFAC, CODFAC, REFFAC, FECFAC, ESTFAC, ALMFAC, AGEFAC, CLIFAC,
    CNOFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, TELFAC, CEMFAC, CPAFAC,
    PIVA1FAC, PIVA2FAC, PIVA3FAC, NET1FAC, IIVA1FAC, IPOR1FAC, TOTFAC
  FROM F_FAC
  ORDER BY FECFAC DESC, CODFAC DESC
`;

export const SELECT_INVOICE_LINES_QUERY = `
  SELECT 
    TIPLFA, CODLFA, POSLFA, ARTLFA, DESLFA, CANLFA, PRELFA, TOTLFA
  FROM F_LFA
  WHERE TIPLFA = ? AND CODLFA = ?
  ORDER BY POSLFA ASC
`;

export const INSERT_INVOICE_HEADER_QUERY = `
  INSERT INTO F_FAC (
    TIPFAC, CODFAC, REFFAC, FECFAC, HORFAC, USUFAC, ESTFAC, ALMFAC, AGEFAC, CLIFAC,
    CNOFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, CNIFAC, TELFAC, CEMFAC, CPAFAC, FOPFAC,
    PIVA1FAC, PIVA2FAC, PIVA3FAC, IPOR1FAC, BAS1FAC, IIVA1FAC, NET1FAC, TOTFAC
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?
  )
`;

export function insertInvoiceHeaderQuery(header: {
  tipfac: string;
  codfac: number;
  reffac: string;
  fecfac: string;
  horfac: string;
  usufac?: number;
  estfac: number;
  almfac: string;
  agefac: number | null;
  clifac: number;
  cnofac: string;
  cdofac: string | null;
  cpofac: string | null;
  ccpfac: string | null;
  cprfac: string | null;
  cnifac?: string | null;
  telfac: string | null;
  cemfac: string | null;
  cpafac: string | null;
  fopfac?: string | null;
  piva1fac: number;
  piva2fac: number;
  piva3fac: number;
  ipor1fac: number;
  bas1fac?: number;
  iiva1fac: number;
  net1fac: number;
  totfac: number;
}): string {
  const cdofacVal = header.cdofac ? `'${header.cdofac.replace(/'/g, "''")}'` : "''";
  const cpofacVal = header.cpofac ? `'${header.cpofac.replace(/'/g, "''")}'` : "''";
  const ccpfacVal = header.ccpfac ? `'${header.ccpfac.replace(/'/g, "''")}'` : "''";
  const cprfacVal = header.cprfac ? `'${header.cprfac.replace(/'/g, "''")}'` : "''";
  const cnifacVal = header.cnifac ? `'${header.cnifac.replace(/'/g, "''")}'` : "''";
  const telfacVal = header.telfac ? `'${header.telfac.replace(/'/g, "''")}'` : "''";
  const cemfacVal = header.cemfac ? `'${header.cemfac.replace(/'/g, "''")}'` : "''";
  const cpafacVal = header.cpafac ? `'${header.cpafac.replace(/'/g, "''")}'` : "'ESPAÑA'";
  const fopfacVal = header.fopfac ? `'${header.fopfac.replace(/'/g, "''")}'` : "'TAR'";
  const bas1 = typeof header.bas1fac === 'number' ? header.bas1fac : Number((header.net1fac + header.ipor1fac).toFixed(2));

  return `
    INSERT INTO F_FAC (
      TIPFAC, CODFAC, REFFAC, FECFAC, HORFAC, USUFAC, ESTFAC, ALMFAC, AGEFAC, CLIFAC,
      CNOFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, CNIFAC, TELFAC, CEMFAC, CPAFAC, FOPFAC,
      PIVA1FAC, PIVA2FAC, PIVA3FAC, IPOR1FAC, BAS1FAC, IIVA1FAC, NET1FAC, TOTFAC
    ) VALUES (
      '${header.tipfac}',
      ${header.codfac},
      '${header.reffac.replace(/'/g, "''")}',
      ${header.fecfac},
      ${header.horfac},
      ${header.usufac ?? 0},
      ${header.estfac},
      '${header.almfac}',
      ${header.agefac ? header.agefac : 0},
      ${header.clifac},
      '${header.cnofac.replace(/'/g, "''")}',
      ${cdofacVal},
      ${cpofacVal},
      ${ccpfacVal},
      ${cprfacVal},
      ${cnifacVal},
      ${telfacVal},
      ${cemfacVal},
      ${cpafacVal},
      ${fopfacVal},
      ${header.piva1fac},
      ${header.piva2fac},
      ${header.piva3fac},
      ${header.ipor1fac},
      ${bas1},
      ${header.iiva1fac},
      ${header.net1fac},
      ${header.totfac}
    )
  `.trim();
}

export const INSERT_INVOICE_LINE_QUERY = `
  INSERT INTO F_LFA (
    TIPLFA, CODLFA, POSLFA, ARTLFA, DESLFA, CANLFA, PRELFA, TOTLFA
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?
  )
`;

export const UPDATE_INVOICE_STATUS_QUERY = `
  UPDATE F_FAC 
  SET ESTFAC = ? 
  WHERE TIPFAC = ? AND CODFAC = ?
`;

export const DELETE_TEST_INVOICE_QUERY = `
  DELETE FROM F_FAC WHERE TIPFAC = ? AND CODFAC = ?
`;

export const DELETE_TEST_INVOICE_LINES_QUERY = `
  DELETE FROM F_LFA WHERE TIPLFA = ? AND CODLFA = ?
`;
