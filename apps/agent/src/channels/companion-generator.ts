import fs from 'fs';
import path from 'path';

export class CompanionGenerator {
  public static generate(options: {
    secretKey?: string;
    dbName?: string;
    dbUser?: string;
    dbPass?: string;
  }): string | null {
    const candidatePaths = [
      path.resolve(__dirname, '../../../packages/connectors/universal-bridge/erp-bridge-endpoint.php'),
      path.resolve(__dirname, '../../packages/connectors/universal-bridge/erp-bridge-endpoint.php'),
      path.resolve(process.cwd(), 'packages/connectors/universal-bridge/erp-bridge-endpoint.php'),
      path.resolve(path.dirname(process.execPath), 'erp-bridge-endpoint.php'),
    ];

    let phpTemplate = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          phpTemplate = fs.readFileSync(p, 'utf8');
          break;
        } catch {}
      }
    }

    if (!phpTemplate) {
      return null;
    }

    const secret = options.secretKey || 'eb_sec_' + Math.random().toString(36).substring(2, 15);
    let customized = phpTemplate.replace(/%%EB_SECRET_KEY%%/g, secret);
    customized = customized.replace(/%%EB_DB_HOST%%/g, 'localhost');
    if (options.dbName) customized = customized.replace(/%%EB_DB_NAME%%/g, options.dbName);
    if (options.dbUser) customized = customized.replace(/%%EB_DB_USER%%/g, options.dbUser);
    if (options.dbPass) customized = customized.replace(/%%EB_DB_PASS%%/g, options.dbPass);

    return customized;
  }
}
