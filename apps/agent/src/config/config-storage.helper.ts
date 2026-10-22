import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Logger } from '@erp-bridge/shared';
import { AgentConfigFile } from './config.types';

const ENC_PREFIX = 'enc:v1:';

function deriveLocalConfigKey(): Buffer {
  let user = 'default';
  try {
    user = os.userInfo().username || 'default';
  } catch {}
  const material = `${os.hostname()}:${os.platform()}:${os.arch()}:${user}:bentian-config-key-v1`;
  return crypto.createHash('sha256').update(material, 'utf8').digest();
}

export function encryptConfigSecret(plain?: string): string | undefined {
  if (!plain || typeof plain !== 'string') return plain;
  if (plain.startsWith(ENC_PREFIX)) return plain;
  try {
    const key = deriveLocalConfigKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch {
    return plain;
  }
}

export function decryptConfigSecret(stored?: string): string | undefined {
  if (!stored || typeof stored !== 'string') return stored;
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const raw = stored.slice(ENC_PREFIX.length);
    const [ivHex, tagHex, cipherHex] = raw.split(':');
    if (!ivHex || !tagHex || cipherHex === undefined) return '';
    const key = deriveLocalConfigKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

function transformConfigSecrets(
  cfg: AgentConfigFile,
  fn: (val?: string) => string | undefined
): AgentConfigFile {
  const clone: AgentConfigFile = JSON.parse(JSON.stringify(cfg));
  if (clone.authToken) clone.authToken = fn(clone.authToken);
  if (clone.universalBridge) {
    if (clone.universalBridge.secretKey) clone.universalBridge.secretKey = fn(clone.universalBridge.secretKey);
    if (clone.universalBridge.dbPass) clone.universalBridge.dbPass = fn(clone.universalBridge.dbPass);
  }
  if (clone.woocommerce) {
    if (clone.woocommerce.consumerKey) clone.woocommerce.consumerKey = fn(clone.woocommerce.consumerKey);
    if (clone.woocommerce.consumerSecret) clone.woocommerce.consumerSecret = fn(clone.woocommerce.consumerSecret);
  }
  if (clone.shopify?.accessToken) clone.shopify.accessToken = fn(clone.shopify.accessToken);
  if (clone.holded?.apiKey) clone.holded.apiKey = fn(clone.holded.apiKey);
  if (clone.prestashop?.apiKey) clone.prestashop.apiKey = fn(clone.prestashop.apiKey);
  if (clone.notifications) {
    if (clone.notifications.smtpPass) clone.notifications.smtpPass = fn(clone.notifications.smtpPass);
    if (clone.notifications.telegramBotToken) clone.notifications.telegramBotToken = fn(clone.notifications.telegramBotToken);
  }
  if (clone.softwareErp?.providers) {
    for (const prov of Object.values(clone.softwareErp.providers)) {
      if (prov?.password) prov.password = fn(prov.password);
    }
  }
  if (clone.agora?.password) clone.agora.password = fn(clone.agora.password);
  if (clone.sage50?.password) clone.sage50.password = fn(clone.sage50.password);
  if (clone.a3erp?.password) clone.a3erp.password = fn(clone.a3erp.password);
  return clone;
}

export function resolveAgentConfigPaths(): { primaryPath: string; secondaryPath?: string } {
  if (process.env.BENTIAN_DATA_DIR) {
    return {
      primaryPath: path.join(process.env.BENTIAN_DATA_DIR, 'agent-config.json'),
      secondaryPath: process.env.BENTIAN_LEGACY_CONFIG_PATH,
    };
  }
  if (process.env.BENTIAN_CONFIG_PATH) {
    return {
      primaryPath: process.env.BENTIAN_CONFIG_PATH,
      secondaryPath: process.env.BENTIAN_LEGACY_CONFIG_PATH,
    };
  }

  const appData = process.env.APPDATA || (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : path.join(os.homedir(), '.config'));

  const userBentianDir = path.join(appData, 'Bentian Agent');
  const userConfigPath = path.join(userBentianDir, 'agent-config.json');

  const exeDir = path.dirname(process.execPath);
  const exeConfigPath = path.join(exeDir, 'agent-config.json');
  const isPortable = fs.existsSync(path.join(exeDir, '.portable'));

  if (isPortable) {
    return { primaryPath: exeConfigPath, secondaryPath: userConfigPath };
  }

  const secondaryCandidate = fs.existsSync(exeConfigPath) && exeConfigPath !== userConfigPath
    ? exeConfigPath
    : undefined;

  return {
    primaryPath: userConfigPath,
    secondaryPath: secondaryCandidate,
  };
}

export function readConfigFromDiskWithMigration(
  primaryPath: string,
  secondaryPath: string | undefined,
  logger: Logger
): AgentConfigFile {
  const tryReadFile = (filePath: string): AgentConfigFile | null => {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw) as AgentConfigFile;
    if (parsed && typeof parsed === 'object') {
      return transformConfigSecrets(parsed, decryptConfigSecret);
    }
    return null;
  };

  try {
    const primary = tryReadFile(primaryPath);
    if (primary) return primary;
  } catch (err) {
    logger.warn(`Aviso al leer configuración primaria (${primaryPath}): ${String(err)}`);
    try {
      const backup = tryReadFile(`${primaryPath}.bak`);
      if (backup) {
        logger.info(`✓ Configuración recuperada desde respaldo defensivo: ${primaryPath}.bak`);
        return backup;
      }
    } catch {}
  }

  if (secondaryPath && secondaryPath !== primaryPath) {
    try {
      const secondary = tryReadFile(secondaryPath);
      if (secondary) {
        logger.info(`✓ Configuración migrada desde ubicación previa: ${secondaryPath} -> ${primaryPath}`);
        return secondary;
      }
    } catch (err) {
      logger.warn(`Aviso al leer configuración secundaria: ${String(err)}`);
    }
  }

  return {};
}

export function writeConfigAtomicallyToDisk(
  configFilePath: string,
  config: AgentConfigFile,
  logger: Logger
): { success: boolean; filePath: string; error?: string } {
  let tempFile: string | null = null;
  try {
    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const diskPayload = transformConfigSecrets(config, encryptConfigSecret);
    tempFile = `${configFilePath}.tmp.${Date.now()}.${process.pid}`;
    const content = JSON.stringify(diskPayload, null, 2);
    fs.writeFileSync(tempFile, content, { encoding: 'utf8', mode: 0o600 });

    if (fs.existsSync(configFilePath)) {
      try {
        fs.copyFileSync(configFilePath, `${configFilePath}.bak`);
      } catch {}
    }

    let replaced = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (fs.existsSync(configFilePath)) {
          try { fs.unlinkSync(configFilePath); } catch {}
        }
        fs.renameSync(tempFile, configFilePath);
        replaced = true;
        break;
      } catch {
        const end = Date.now() + (attempt + 1) * 30;
        while (Date.now() < end) {}
      }
    }

    if (!replaced) {
      fs.copyFileSync(tempFile, configFilePath);
      try { fs.unlinkSync(tempFile); } catch {}
    }

    logger.info(`✓ Configuración guardada en disco: ${configFilePath}`);
    return { success: true, filePath: configFilePath };
  } catch (err) {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    const msg = `Error al persistir configuración en ${configFilePath}: ${String(err)}`;
    logger.error(msg);
    return { success: false, filePath: configFilePath, error: String(err) };
  }
}
