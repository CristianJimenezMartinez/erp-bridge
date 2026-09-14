import fs from 'fs';
import path from 'path';

export interface FiscalYearInfo {
  year: number;
  path: string;
}

export interface ParsedDatabaseName {
  companyCode: string;
  year: number;
  extension: string;
}

export interface YearResolutionResult {
  activePath: string;
  switched: boolean;
  previousYear?: number;
  currentYear?: number;
}

export class FactusolYearResolver {
  /**
   * Extrae mediante expresión regular el código de empresa y el año fiscal de 4 dígitos.
   * Formato Factusol: [CODEMPRESA][AÑO].[ext] (ej: 2252025.accdb -> 225, 2025, accdb)
   */
  public static parseDatabaseName(dbPath: string): ParsedDatabaseName | null {
    if (!dbPath || typeof dbPath !== 'string') {
      return null;
    }

    const cleanPath = dbPath.trim().replace(/^["']|["']$/g, '').trim();
    if (!cleanPath) {
      return null;
    }

    const filename = path.basename(cleanPath);

    // Filtrar archivos de bloqueo y temporales de Access
    if (
      filename.startsWith('.~') ||
      filename.startsWith('~$') ||
      filename.toLowerCase().endsWith('.ldb') ||
      filename.toLowerCase().endsWith('.laccdb')
    ) {
      return null;
    }

    // Factusol naming convention: [CODEMPRESA][AÑO].[ext]
    // CODEMPRESA: 1-10 caracteres alfanuméricos / guiones (ej: 225, 001, FS1, EMP_01)
    // AÑO: 4 dígitos numéricos (ej: 2024, 2025, 2026)
    // ext: accdb o mdb
    const match = filename.match(/^([a-zA-Z0-9_-]+?)(\d{4})\.(accdb|mdb)$/i);
    if (!match || !match[1] || !match[2] || !match[3]) {
      return null;
    }

    const companyCode = match[1];
    const year = parseInt(match[2], 10);
    const extension = match[3].toLowerCase();

    // Rango defensivo para años fiscales de Factusol
    if (isNaN(year) || year < 1900 || year > 2100) {
      return null;
    }

    return {
      companyCode,
      year,
      extension,
    };
  }

  /**
   * Escanea el directorio del archivo actual buscando todos los archivos que coincidan
   * con el prefijo de la empresa y extensiones .accdb o .mdb.
   * Devuelve los años ordenados ascendentemente.
   */
  public static getAvailableYears(dbPath: string): FiscalYearInfo[] {
    if (!dbPath || typeof dbPath !== 'string') {
      return [];
    }

    const cleanPath = dbPath.trim().replace(/^["']|["']$/g, '').trim();
    if (!cleanPath) {
      return [];
    }

    const parsed = this.parseDatabaseName(cleanPath);
    if (!parsed) {
      return [];
    }

    const dir = path.dirname(path.resolve(cleanPath));
    if (!fs.existsSync(dir)) {
      return [];
    }

    try {
      const stat = fs.statSync(dir);
      if (!stat.isDirectory()) {
        return [];
      }

      const files = fs.readdirSync(dir);
      const yearMap = new Map<number, FiscalYearInfo>();

      for (const file of files) {
        if (
          file.startsWith('.~') ||
          file.startsWith('~$') ||
          file.toLowerCase().endsWith('.ldb') ||
          file.toLowerCase().endsWith('.laccdb')
        ) {
          continue;
        }

        const fileParsed = this.parseDatabaseName(file);
        if (!fileParsed) {
          continue;
        }

        // Debe coincidir con el código de empresa (case-insensitive)
        if (fileParsed.companyCode.toUpperCase() !== parsed.companyCode.toUpperCase()) {
          continue;
        }

        const fullPath = path.isAbsolute(cleanPath)
          ? path.join(path.dirname(cleanPath), file)
          : path.resolve(dir, file);

        // Si ya existe el año, priorizar .accdb sobre .mdb
        if (!yearMap.has(fileParsed.year)) {
          yearMap.set(fileParsed.year, {
            year: fileParsed.year,
            path: fullPath,
          });
        } else if (fileParsed.extension === 'accdb') {
          yearMap.set(fileParsed.year, {
            year: fileParsed.year,
            path: fullPath,
          });
        }
      }

      return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
    } catch {
      return [];
    }
  }

  /**
   * Resuelve de forma inteligente la base de datos activa:
   * - Si autoRollover === false: retorna la ruta configurada sin cambios.
   * - Si autoRollover === true: comprueba el año del calendario actual (o targetYear).
   *   Si existe un archivo para el año en curso en la misma carpeta y es posterior al año configurado,
   *   cambia automáticamente a la base de datos del año en curso.
   *   Si no existe aún el del año nuevo (por ejemplo porque Factusol no lo ha creado todavía),
   *   mantiene el año más reciente disponible.
   */
  public static resolveActiveDatabase(
    currentPath: string,
    autoRollover = true,
    targetYear?: number
  ): YearResolutionResult {
    if (!currentPath || typeof currentPath !== 'string') {
      return {
        activePath: currentPath || '',
        switched: false,
      };
    }

    const cleanPath = currentPath.trim().replace(/^["']|["']$/g, '').trim();

    // Si autoRollover está desactivado, retornar ruta configurada sin cambios
    if (!autoRollover) {
      const parsed = this.parseDatabaseName(cleanPath);
      return {
        activePath: cleanPath,
        switched: false,
        currentYear: parsed?.year,
      };
    }

    const parsed = this.parseDatabaseName(cleanPath);
    if (!parsed) {
      // Formato no estándar (ej: factusol.accdb): mantener configurado defensivamente
      return {
        activePath: cleanPath,
        switched: false,
      };
    }

    const configuredYear = parsed.year;
    const calendarYear = targetYear ?? new Date().getFullYear();

    const available = this.getAvailableYears(cleanPath);
    if (!available || available.length === 0) {
      return {
        activePath: cleanPath,
        switched: false,
        currentYear: configuredYear,
      };
    }

    // 1. Comprobar si existe archivo para el año del calendario en curso
    const currentCalendarFile = available.find((item) => item.year === calendarYear);

    // Si existe y es posterior al año configurado, cambiar automáticamente a dicho año
    if (currentCalendarFile && calendarYear > configuredYear) {
      return {
        activePath: currentCalendarFile.path,
        switched: true,
        previousYear: configuredYear,
        currentYear: calendarYear,
      };
    }

    // 2. Si no existe aún el del año nuevo (ej: Factusol no lo ha creado todavía),
    // mantiene el año más reciente disponible posterior al año configurado
    const validAvailable = available.filter((item) => item.year <= calendarYear);
    const candidateList = validAvailable.length > 0 ? validAvailable : available;
    const mostRecentAvailable = candidateList[candidateList.length - 1];

    if (mostRecentAvailable && mostRecentAvailable.year > configuredYear) {
      return {
        activePath: mostRecentAvailable.path,
        switched: true,
        previousYear: configuredYear,
        currentYear: mostRecentAvailable.year,
      };
    }

    // Fallback defensivo: Si la ruta configurada no existe en disco, usar la más reciente disponible
    if (!fs.existsSync(cleanPath) && mostRecentAvailable && mostRecentAvailable.path !== cleanPath) {
      return {
        activePath: mostRecentAvailable.path,
        switched: true,
        previousYear: configuredYear,
        currentYear: mostRecentAvailable.year,
      };
    }

    // Mantener la ruta configurada
    return {
      activePath: cleanPath,
      switched: false,
      currentYear: configuredYear,
    };
  }

  // Delegados de instancia
  public parseDatabaseName(dbPath: string): ParsedDatabaseName | null {
    return FactusolYearResolver.parseDatabaseName(dbPath);
  }

  public getAvailableYears(dbPath: string): FiscalYearInfo[] {
    return FactusolYearResolver.getAvailableYears(dbPath);
  }

  public resolveActiveDatabase(
    currentPath: string,
    autoRollover = true,
    targetYear?: number
  ): YearResolutionResult {
    return FactusolYearResolver.resolveActiveDatabase(currentPath, autoRollover, targetYear);
  }
}
