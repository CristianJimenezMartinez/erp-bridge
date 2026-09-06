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
    const whereClause = activeOnly ? "WHERE (SUWART = '1' OR SUWART = 'S' OR SUWART = 'True' OR SUWART = '-1')" : '';
    return `
      SELECT ${topClause} 
        CODART, DESART, DEWART, EANART, FAMART, PCOART, SUWART, IMGART, UUMART, PESART, FALART, FUMART
      FROM F_ART
      ${whereClause}
      ORDER BY CODART
    `.trim();
  },

  getAllArticles: (limit?: number): string => {
    const topClause = limit ? `TOP ${limit}` : '';
    return `
      SELECT ${topClause} 
        CODART, DESART, DEWART, EANART, FAMART, PCOART, SUWART, IMGART, UUMART, PESART, FALART, FUMART
      FROM F_ART
      ORDER BY CODART
    `.trim();
  },

  getArticleByCode: (codart: string): string => {
    const safeCode = codart.replace(/'/g, "''");
    return `
      SELECT CODART, DESART, DEWART, EANART, FAMART, PCOART, SUWART, IMGART, UUMART, PESART, FALART, FUMART
      FROM F_ART
      WHERE CODART = '${safeCode}'
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
