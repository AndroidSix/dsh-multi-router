import { randomBytes, scrypt, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { validateConfig, writePrivateJson } from './config.mjs';
import { importAccount, readPortableCredential } from './accounts.mjs';

const derive = promisify(scrypt);
const FORMAT = 'dsh-multi-router';
const MAX_BYTES = 512 * 1024;
const pick = (value, keys) => Object.fromEntries(keys.filter(k => Object.hasOwn(value ?? {}, k)).map(k => [k, value[k]]));
const options = ['cooldownMs', 'requestTimeoutMs', 'catalogTtlMs', 'retryServerErrors', 'modelVisibility', 'usageRetentionDays'];
function settings(config) {
  return { ...pick(config, options), models: Object.fromEntries(Object.entries(config.models ?? {}).map(([p, rows]) => [p, Object.fromEntries(Object.entries(rows).map(([id, pref]) => [id, pick(pref, ['name', 'visible'])]))])),
    accounts: config.accounts.map(a => pick(a, ['id', 'provider', 'name', 'enabled', 'autoCheckin'])),
    routes: Object.fromEntries(Object.entries(config.routes).map(([id, r]) => [id, {
      ...pick(r, ['name', 'visible', 'strategy', 'contextWindow', 'maxTokens', 'preferExpiringCredits', 'expiringWithinDays', 'freeOnly', 'freeModels']),
      targets: r.targets.map(t => pick(t, ['provider', 'account', 'model', 'models', 'weight', 'tokenBudget', 'creditBudget'])),
    }])) };
}
const problem = message => { throw Error(message); };
function password(value, exporting = false) {
  if (typeof value !== 'string' || value.length > 1024 || value.length < (exporting ? 10 : 1)) problem(exporting ? '迁移密码至少 10 个字符' : '请输入迁移密码');
}
export async function exportConfiguration(manager, input) {
  const payload = { format: FORMAT, version: 1, encrypted: false, createdAt: new Date().toISOString(), config: settings(manager.config) };
  if (!input.includeCredentials) return payload;
  password(input.password, true);
  payload.credentials = {};
  for (const account of manager.config.accounts) {
    try {
      const credential = await readPortableCredential(account);
      if (credential) Object.defineProperty(payload.credentials, account.id, { value: credential, enumerable: true });
    } catch { problem(`账号 ${account.id} 的凭证不可读，请修复后导出或选择仅配置`); }
  }
  const salt = randomBytes(16), iv = randomBytes(12), key = await derive(input.password, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const bytes = Buffer.from(JSON.stringify(payload));
  if (bytes.length > MAX_BYTES) problem('配置过大，无法导出');
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return { format: FORMAT, version: 1, encrypted: true, cipher: 'aes-256-gcm', kdf: 'scrypt',
    salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}
export async function decodeConfiguration(input) {
  let payload;
  try {
    if (typeof input.document !== 'string' || Buffer.byteLength(input.document) > 900 * 1024) problem('迁移文件过大');
    payload = JSON.parse(input.document);
  } catch { problem('请选择有效的插件迁移 JSON 文件（小于 900 KB）'); }
  if (payload?.format !== FORMAT || payload.version !== 1) problem('不是受支持的插件迁移文件');
  const encrypted = payload.encrypted === true;
  if (encrypted) {
    password(input.password);
    try {
      if (payload.cipher !== 'aes-256-gcm' || payload.kdf !== 'scrypt') throw Error();
      const salt = Buffer.from(payload.salt, 'base64'), iv = Buffer.from(payload.iv, 'base64'), tag = Buffer.from(payload.tag, 'base64'), data = Buffer.from(payload.data, 'base64');
      if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || data.length > MAX_BYTES) throw Error();
      const decipher = createDecipheriv('aes-256-gcm', await derive(input.password, salt, 32), iv);
      decipher.setAuthTag(tag);
      payload = JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
    } catch { problem('密码错误或迁移文件已损坏'); }
  }
  if (payload?.format !== FORMAT || payload.version !== 1 || !Array.isArray(payload.config?.accounts) || payload.config.accounts.length > 200 || !payload.config.routes || typeof payload.config.routes !== 'object' || Object.keys(payload.config.routes).length > 500) problem('迁移配置格式无效');
  if (payload.credentials && !encrypted) problem('含凭证的迁移文件必须加密');
  if (payload.credentials && (typeof payload.credentials !== 'object' || Array.isArray(payload.credentials))) problem('迁移凭证格式无效');
  // Imported paths are never read: every credential receives a new local private file.
  const config = settings(payload.config);
  validateConfig({ ...config, accounts: config.accounts.map(a => ({ ...a, credentialFile: 'placeholder.json' })) });
  if (payload.credentials && Object.keys(payload.credentials).some(id => !config.accounts.some(a => a.id === id))) problem('迁移凭证存在未知账号');
  return { config, credentials: payload.credentials ?? {}, encrypted };
}
export function migrationSummary(manager, portable, mode) {
  if (!['merge', 'replace'].includes(mode)) problem('请选择合并或替换');
  for (const a of portable.config.accounts) {
    const old = manager.config.accounts.find(b => b.id === a.id);
    if (mode === 'merge' && old && old.provider !== a.provider) problem(`账号 ${a.id} 的供应商冲突，请改用替换或修改导入文件`);
  }
  const existing = id => mode === 'merge' && manager.config.accounts.some(a => a.id === id);
  return { mode, accounts: portable.config.accounts.length, newAccounts: portable.config.accounts.filter(a => !existing(a.id)).length,
    credentials: Object.keys(portable.credentials).length,
    needsLogin: portable.config.accounts.filter(a => !Object.hasOwn(portable.credentials, a.id) && !existing(a.id)).length,
    routes: Object.keys(portable.config.routes).length,
    overwrittenRoutes: Object.keys(portable.config.routes).filter(id => Object.hasOwn(manager.config.routes, id)).length };
}
export async function prepareMigration(manager, raw, portable, mode) {
  migrationSummary(manager, portable, mode);
  const base = join(dirname(manager.file), 'accounts'); await mkdir(base, { recursive: true, mode: 0o700 });
  const staging = await mkdtemp(join(base, 'migration-'));
  try {
    const imported = [];
    for (const a of portable.config.accounts) {
      const old = mode === 'merge' && raw.accounts.find(b => b.id === a.id), secret = Object.hasOwn(portable.credentials, a.id) ? portable.credentials[a.id] : undefined;
      if (!secret && old) { imported.push({ ...old, ...a }); continue; }
      const credentialFile = join(staging, a.id, 'credential.json'), identityFile = join(staging, a.id, 'identity.json');
      if (secret) await importAccount({ provider: a.provider, credentialFile, identityFile, document: secret.document, identityDocument: secret.identity });
      else { await writePrivateJson(credentialFile, {}); if (a.provider.startsWith('trae')) await writePrivateJson(identityFile, {}); }
      imported.push({ ...a, ...(!secret ? { enabled: false } : {}), credentialFile: relative(dirname(manager.file), credentialFile),
        ...(a.provider.startsWith('trae') ? { identityFile: relative(dirname(manager.file), identityFile) } : {}) });
    }
    const next = mode === 'replace' ? { ...portable.config, accounts: imported } : { ...raw, ...pick(portable.config, options),
      accounts: [...raw.accounts.map(a => imported.find(b => b.id === a.id) ?? a), ...imported.filter(a => !raw.accounts.some(b => b.id === a.id))],
      routes: { ...raw.routes, ...portable.config.routes },
      models: Object.fromEntries([...new Set([...Object.keys(raw.models ?? {}), ...Object.keys(portable.config.models)])].map(p => [p, { ...raw.models?.[p], ...portable.config.models[p] }])) };
    validateConfig(next, manager.file);
    return { raw: next, staging };
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
}
