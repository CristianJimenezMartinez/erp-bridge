export interface FactusolRawArticle {
  CODART: string;
  DESART: string;
  DEWART?: string;
  EANART?: string;
  FAMART?: string;
  PCOART?: number;
  SUWART?: string;
  IMGART?: string;
  UUMART?: string;
  PESART?: number;
  FALART?: string;
  FUMART?: string;
  UMEART?: string;
  DESUME?: string;
  CP1ART?: string;
  CP2ART?: string;
  CP3ART?: string;
  CP4ART?: string;
  CP5ART?: string;
  MEWART?: string;
}

export interface FactusolRawStock {
  ARTSTO: string;
  ALMSTO: string;
  ACTSTO: number;
  DISSTO: number;
}

export interface FactusolRawPrice {
  TARLTA: string;
  ARTLTA: string;
  PRELTA: number;
}

export interface FactusolRawFamily {
  CODFAM: string;
  DESFAM: string;
}

export const FACTUSOL_QUERIES = {
  getArticles: (activeOnly = true, limit?: number): string => {
    const topClause = limit ? `TOP ${limit}` : '';
    const whereClause = activeOnly ? "WHERE (F_ART.SUWART = '1' OR F_ART.SUWART = 'S' OR F_ART.SUWART = 'True' OR F_ART.SUWART = '-1')" : '';
    return `
      SELECT ${topClause} 
        F_ART.CODART, F_ART.DESART, F_ART.DEWART, F_ART.EANART, F_ART.FAMART, F_ART.PCOART, F_ART.SUWART,
        F_ART.IMGART, F_ART.UUMART, F_ART.PESART, F_ART.FALART, F_ART.FUMART,
        F_ART.UMEART, F_UME.DESUME,
        F_ART.CP1ART, F_ART.CP2ART, F_ART.CP3ART, F_ART.CP4ART, F_ART.CP5ART, F_ART.MEWART
      FROM F_ART LEFT JOIN F_UME ON F_ART.UMEART = F_UME.CODUME
      ${whereClause}
      ORDER BY F_ART.CODART
    `.trim();
  },

  getAllArticles: (limit?: number): string => {
    const topClause = limit ? `TOP ${limit}` : '';
    return `
      SELECT ${topClause} 
        F_ART.CODART, F_ART.DESART, F_ART.DEWART, F_ART.EANART, F_ART.FAMART, F_ART.PCOART, F_ART.SUWART,
        F_ART.IMGART, F_ART.UUMART, F_ART.PESART, F_ART.FALART, F_ART.FUMART,
        F_ART.UMEART, F_UME.DESUME,
        F_ART.CP1ART, F_ART.CP2ART, F_ART.CP3ART, F_ART.CP4ART, F_ART.CP5ART, F_ART.MEWART
      FROM F_ART LEFT JOIN F_UME ON F_ART.UMEART = F_UME.CODUME
      ORDER BY F_ART.CODART
    `.trim();
  },

  getArticleByCode: (codart: string): string => {
    const safeCode = codart.replace(/'/g, "''");
    return `
      SELECT 
        F_ART.CODART, F_ART.DESART, F_ART.DEWART, F_ART.EANART, F_ART.FAMART, F_ART.PCOART, F_ART.SUWART,
        F_ART.IMGART, F_ART.UUMART, F_ART.PESART, F_ART.FALART, F_ART.FUMART,
        F_ART.UMEART, F_UME.DESUME,
        F_ART.CP1ART, F_ART.CP2ART, F_ART.CP3ART, F_ART.CP4ART, F_ART.CP5ART, F_ART.MEWART
      FROM F_ART LEFT JOIN F_UME ON F_ART.UMEART = F_UME.CODUME
      WHERE F_ART.CODART = '${safeCode}'
    `.trim();
  },

  getStock: (): string => {
    return `
      SELECT ARTSTO, ALMSTO, ACTSTO, DISSTO
      FROM F_STO
    `.trim();
  },

  getPrices: (tarifaCode = '1'): string => {
    const tarifaNum = parseInt(tarifaCode, 10) || 1;
    return `
      SELECT TARLTA, ARTLTA, PRELTA
      FROM F_LTA
      WHERE TARLTA = ${tarifaNum}
    `.trim();
  },

  getFamilies: (): string => {
    return `
      SELECT CODFAM, DESFAM
      FROM F_FAM
    `.trim();
  },

  healthCheck: (): string => {
    return `SELECT TOP 1 CODART FROM F_ART`.trim();
  },
};
