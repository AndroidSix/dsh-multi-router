import {
  regionOfCredential,
  regionOfEdition
} from "./chunk-S5KMFAQM.js";
import {
  regionOf
} from "./chunk-TEZ2FMEO.js";

// upstream/workbuddy/src/status-paths.ts
var WORKBUDDY_STATUS_PATH = "/plugins/dsh-workbuddy-connect/status";
var WORKBUDDY_PROBE_PATH = "/plugins/dsh-workbuddy-connect/probe";
var WORKBUDDY_AI_STATUS_PATH = "/plugins/dsh-workbuddy-connect/ai/status";
var WORKBUDDY_AI_PROBE_PATH = "/plugins/dsh-workbuddy-connect/ai/probe";

// upstream/workbuddy/src/variants.ts
var WORKBUDDY_VARIANTS = [
  {
    id: "workbuddy",
    displayName: "WorkBuddy",
    appName: "WorkBuddy",
    region: "cn",
    env: "WORKBUDDY_AUTH_FILE",
    electron: {
      productName: "WorkBuddy",
      envVar: "WORKBUDDY_ELECTRON_BIN",
      macOS: {
        bundleId: "com.tencent.workbuddy.mac",
        defaultPath: "/Applications/WorkBuddy.app/Contents/MacOS/Electron"
      },
      windows: {
        displayNamePattern: /^WorkBuddy(?:\s+\d+(?:\.\d+)+(?:[-+][0-9A-Za-z.-]+)?)?$/u,
        exeBasename: "workbuddy.exe",
        defaultPathSegments: ["Programs", "WorkBuddy", "WorkBuddy.exe"]
      }
    },
    desktopFilename: "workbuddy-desktop.info",
    ownFilename: ".workbuddy-auth.json",
    probeFilename: ".workbuddy-probe.json",
    catalogFilename: ".workbuddy-catalog.json",
    visibilityFilename: ".workbuddy-model-visibility.json",
    statusPath: WORKBUDDY_STATUS_PATH,
    probePath: WORKBUDDY_PROBE_PATH
  },
  {
    id: "workbuddy-ai",
    displayName: "WorkBuddy AI",
    appName: "WorkBuddy AI",
    region: "global",
    env: "WORKBUDDY_AI_AUTH_FILE",
    electron: {
      productName: "WorkBuddy AI",
      envVar: "WORKBUDDY_AI_ELECTRON_BIN",
      macOS: {
        bundleId: "com.workbuddy.workbuddy-ai",
        defaultPath: "/Applications/WorkBuddy AI.app/Contents/MacOS/Electron"
      },
      windows: {
        // Measured in #60: `WorkBuddy AI 5.6.2`. The CN pattern cannot match
        // this value ("AI" is not a version) and this pattern cannot match
        // `WorkBuddy 5.6.2` (missing the literal " AI"), so the two records
        // never feed each other's discovery.
        displayNamePattern: /^WorkBuddy AI(?:\s+\d+(?:\.\d+)+(?:[-+][0-9A-Za-z.-]+)?)?$/u,
        exeBasename: "workbuddyai.exe"
      }
    },
    desktopFilename: "workbuddy-desktop-ai.info",
    ownFilename: ".workbuddy-ai-auth.json",
    probeFilename: ".workbuddy-ai-probe.json",
    catalogFilename: ".workbuddy-ai-catalog.json",
    visibilityFilename: ".workbuddy-ai-model-visibility.json",
    statusPath: WORKBUDDY_AI_STATUS_PATH,
    probePath: WORKBUDDY_AI_PROBE_PATH
  }
];
var CN_VARIANT = WORKBUDDY_VARIANTS[0];
var AI_VARIANT = WORKBUDDY_VARIANTS[1];
function electronProfileFor(variant) {
  return variant?.electron ?? (variant?.id === AI_VARIANT.id ? AI_VARIANT : CN_VARIANT).electron;
}

// upstream/workbuddy/src/desktop-credential-protection.ts
import { execFile } from "node:child_process";
import { accessSync, constants, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { basename, dirname, join } from "node:path";
function defaultWorkBuddyElectronPath(product, platform = process.platform) {
  if (platform === "darwin") return product.macOS.defaultPath;
  if (platform !== "win32" || product.windows.defaultPathSegments === void 0) return void 0;
  const localAppData = process.env.LOCALAPPDATA?.trim();
  return localAppData === void 0 || localAppData === "" ? void 0 : join(localAppData, ...product.windows.defaultPathSegments);
}
function keyIdsOf(fields) {
  return [...new Set(fields.map((wrapped) => wrapped.envelope.keyId))];
}
function parseWrappedField(field, value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const wrapped = value;
  if (wrapped["$wbEncrypted"] !== 1 || typeof wrapped["envelope"] !== "string") return void 0;
  let inner;
  try {
    inner = JSON.parse(Buffer.from(wrapped["envelope"], "base64").toString("utf8"));
  } catch {
    return void 0;
  }
  if (typeof inner !== "object" || inner === null || Array.isArray(inner)) return void 0;
  const parts = inner;
  const nonce = parseBase64(parts["nonce"], 12);
  const authTag = parseBase64(parts["authTag"], 16);
  const ciphertext = parseBase64(parts["ciphertext"]);
  if (nonce === void 0 || authTag === void 0 || ciphertext === void 0) return void 0;
  if (typeof parts["suite"] !== "number" || !Number.isInteger(parts["suite"])) return void 0;
  if (parts["suite"] !== 1) return void 0;
  if (typeof parts["keyId"] !== "string" || !/^[0-9a-f]{16}$/u.test(parts["keyId"])) return void 0;
  return {
    field,
    envelope: {
      suite: parts["suite"],
      keyId: parts["keyId"],
      nonce,
      authTag,
      ciphertext
    }
  };
}
function parseBase64(value, length) {
  if (typeof value !== "string" || value === "") return void 0;
  let decoded;
  try {
    decoded = Buffer.from(value, "base64");
  } catch {
    return void 0;
  }
  if (decoded.length === 0 || decoded.toString("base64").replace(/=+$/u, "") !== value.replace(/=+$/u, "")) return void 0;
  return length === void 0 || decoded.length === length ? decoded : void 0;
}
var AUTH_FIELDS = ["accessToken", "refreshToken"];
function classifyDesktopAuthDocument(text) {
  if (text.trim() === "") return { format: "absent" };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { format: "unrecognized" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { format: "unrecognized" };
  const document = parsed;
  const auth = typeof document["auth"] === "object" && document["auth"] !== null ? document["auth"] : document;
  const fields = [];
  for (const field of AUTH_FIELDS) {
    const value = auth[field];
    if (typeof value === "string") continue;
    const wrapped = parseWrappedField(field, value);
    if (wrapped === void 0 && value !== void 0) return { format: "unrecognized" };
    if (wrapped !== void 0) fields.push(wrapped);
  }
  if (fields.length === 0) return { format: "plaintext" };
  return { format: "encrypted", wrapped: { document, fields } };
}
function unwrapDesktopAuthDocument(classification, openField) {
  const wrapped = classification.wrapped;
  const rebuilt = structuredClone(wrapped.document);
  const auth = typeof rebuilt["auth"] === "object" && rebuilt["auth"] !== null ? rebuilt["auth"] : rebuilt;
  for (const field of wrapped.fields) {
    auth[field.field] = openField(field);
  }
  return JSON.stringify(rebuilt);
}
function buildAuthenticatedContextAad(keyId, suite) {
  const prefix = Buffer.from("WB-AAD\0", "ascii");
  const lengthPrefixed = (value) => {
    const bytes = Buffer.from(value, "utf8");
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32BE(bytes.length);
    return Buffer.concat([header, bytes]);
  };
  const suiteBytes = Buffer.allocUnsafe(4);
  suiteBytes.writeUInt32BE(suite);
  return Buffer.concat([
    prefix,
    Buffer.from([1]),
    lengthPrefixed("WBEV1"),
    lengthPrefixed("sym-v1"),
    suiteBytes,
    lengthPrefixed(keyId),
    Buffer.from([2]),
    Buffer.from([0]),
    Buffer.from([0])
  ]);
}
function openAuthField(key, envelope) {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, envelope.nonce, { authTagLength: 16 });
    decipher.setAAD(buildAuthenticatedContextAad(envelope.keyId, envelope.suite));
    decipher.setAuthTag(envelope.authTag);
    return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return void 0;
  }
}
function parseAtRestPayload(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return void 0;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
  const payload = parsed;
  if (payload["version"] !== 1) return void 0;
  const secret = payload["atRestSecretKey"];
  if (typeof secret !== "string" || secret === "") return void 0;
  let decoded;
  try {
    decoded = Buffer.from(secret, "base64");
  } catch {
    return void 0;
  }
  if (decoded.length !== 32) return void 0;
  if (decoded.toString("base64") !== secret) return void 0;
  if (decoded.every((byte) => byte === 0)) return void 0;
  return { atRestSecretKey: secret };
}
function deriveProtectorKey(secret) {
  return createHash("sha256").update(secret, "utf8").digest();
}
function electronDiscoveryFor(platform = process.platform) {
  if (platform === "darwin") return "macos-workbuddy";
  if (platform === "win32") return "windows-workbuddy";
  return "none";
}
function atRestKeyProviderFor(variant) {
  return new WorkBuddyAtRestKeyProvider({
    product: electronProfileFor(variant),
    discovery: electronDiscoveryFor()
  });
}
var MDFIND_BIN = "/usr/bin/mdfind";
var PLUTIL_BIN = "/usr/bin/plutil";
var WINDOWS_REGISTRY_ROOTS = [
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
];
var WINDOWS_REGISTRY_OUTPUT_MAX_BYTES = 1024 * 1024;
var WINDOWS_ELECTRON_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
var WINDOWS_REGISTRY_RELATIVE_POWERSHELL = "System32\\WindowsPowerShell\\v1.0\\powershell.exe";
var WINDOWS_POWERSHELL_ROOT_ABSENT = 2;
var WINDOWS_POWERSHELL_ROOT_UNREADABLE = 3;
var WINDOWS_POWERSHELL_QUERY_SCRIPT = [
  "param([string]$Root)",
  "[Console]::OutputEncoding=[Text.Encoding]::UTF8;",
  '$ErrorActionPreference="Stop";',
  '$path="Registry::"+$Root;',
  'if (-not (Test-Path -LiteralPath $path)) { [Console]::Error.Write("root absent"); exit 2 };',
  'try { $k=Get-Item -LiteralPath $path -ErrorAction Stop } catch { [Console]::Error.Write("root unreadable"); exit 3 };',
  "$out=@();",
  "foreach ($n in $k.GetSubKeyNames()) {",
  '  try { $p=$k.OpenSubKey($n); if ($null -eq $p) { throw "null" } } catch { [Console]::Error.Write("subkey unreadable"); exit 3 };',
  '  $d=$p.GetValue("DisplayName");$i=$p.GetValue("DisplayIcon");',
  "  if ($null -ne $d -or $null -ne $i) { $out += [pscustomobject]@{ displayName=[string]$d; displayIcon=[string]$i } }",
  "};",
  "ConvertTo-Json -InputObject @($out) -Compress -Depth 3"
].join(" ");
var WINDOWS_POWERSHELL_QUERY_COMMAND = `& { ${WINDOWS_POWERSHELL_QUERY_SCRIPT} }`;
var WINDOWS_REGISTRY_ROOT_PATTERN = /^HK(?:LM|CU)(?:\\[A-Za-z0-9._-]+)+$/u;
var WORKBUDDY_DISCOVERY_STEP_TIMEOUT_MS = 3e3;
var WORKBUDDY_DISCOVERY_BUDGET_MS = 1e4;
var WINDOWS_REGISTRY_STEP_TIMEOUT_MS = 1e4;
var MDFIND_MAX_OUTPUT_BYTES = 1024 * 1024;
var PLUTIL_MAX_OUTPUT_BYTES = 64 * 1024;
var DiscoveryIncompleteError = class extends Error {
};
function workBuddyDiscoveryTools(bundleId) {
  const runTool = (bin, args, maxBytes, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DiscoveryIncompleteError(`${bin} was not started: the discovery budget was already spent`));
      return;
    }
    let settled = false;
    const child = execFile(bin, [...args], { maxBuffer: maxBytes, timeout: WORKBUDDY_DISCOVERY_STEP_TIMEOUT_MS }, (error, stdout) => {
      if (settled) return;
      settled = true;
      if (error !== null && error !== void 0) {
        reject(new DiscoveryIncompleteError(`${bin} could not complete (${error.killed === true ? "timed out" : String(error.code ?? "unavailable")})`));
        return;
      }
      resolve(stdout);
    });
    const abort = () => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new DiscoveryIncompleteError(`${bin} was abandoned: the discovery budget was spent`));
    };
    signal.addEventListener("abort", abort, { once: true });
    child.on("close", () => {
      signal.removeEventListener("abort", abort);
    });
  });
  return {
    findApps: async (signal) => {
      const out = await runTool(
        MDFIND_BIN,
        [`kMDItemCFBundleIdentifier == '${bundleId}'`],
        MDFIND_MAX_OUTPUT_BYTES,
        signal
      );
      return out.split("\n").map((line) => line.trim()).filter((line) => line.endsWith(".app"));
    },
    bundleIdentifier: async (bundlePath, signal) => {
      try {
        const out = await runTool(
          PLUTIL_BIN,
          ["-extract", "CFBundleIdentifier", "raw", "-o", "-", join(bundlePath, "Contents", "Info.plist")],
          PLUTIL_MAX_OUTPUT_BYTES,
          signal
        );
        return out.trim();
      } catch {
        return void 0;
      }
    },
    bundleVersion: async (bundlePath, signal) => {
      try {
        const out = await runTool(
          PLUTIL_BIN,
          ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", join(bundlePath, "Contents", "Info.plist")],
          PLUTIL_MAX_OUTPUT_BYTES,
          signal
        );
        const version = out.trim();
        return version === "" ? void 0 : version;
      } catch {
        return void 0;
      }
    }
  };
}
function workBuddyWindowsDiscoveryTools() {
  const systemRoot = process.env.SystemRoot?.trim();
  const regPath = systemRoot === void 0 || systemRoot === "" ? void 0 : join(systemRoot, "System32", "reg.exe");
  const powershellPath = systemRoot === void 0 || systemRoot === "" ? void 0 : join(systemRoot, WINDOWS_REGISTRY_RELATIVE_POWERSHELL);
  const runTool = (root, signal) => new Promise((resolve, reject) => {
    if (regPath === void 0) {
      reject(new DiscoveryIncompleteError("SystemRoot is not configured"));
      return;
    }
    if (signal.aborted) {
      reject(new DiscoveryIncompleteError("reg.exe was not started: the discovery budget was already spent"));
      return;
    }
    let settled = false;
    const child = execFile(regPath, ["query", root, "/s"], {
      maxBuffer: WINDOWS_REGISTRY_OUTPUT_MAX_BYTES,
      timeout: WINDOWS_REGISTRY_STEP_TIMEOUT_MS,
      windowsHide: true,
      // Raw bytes, not a decode: whether this output is ambiguous is decided
      // from the bytes themselves (#88), so Node must not pick an encoding.
      encoding: "buffer"
    }, (error, stdout, stderr) => {
      if (settled) return;
      settled = true;
      if (error !== null && error !== void 0) {
        if (error.killed !== true && (error.code === 1 || error.code === "1") && windowsRegistryKeyMissing(stderr.toString("utf8"))) {
          resolve(Buffer.alloc(0));
          return;
        }
        reject(new DiscoveryIncompleteError(`reg.exe could not complete (${error.killed === true ? "timed out" : String(error.code ?? "unavailable")})`));
        return;
      }
      resolve(stdout);
    });
    const abort = () => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new DiscoveryIncompleteError("reg.exe was abandoned: the discovery budget was spent"));
    };
    signal.addEventListener("abort", abort, { once: true });
    child.on("close", () => {
      signal.removeEventListener("abort", abort);
    });
  });
  const runFallback = (root, signal) => new Promise((resolve, reject) => {
    if (!WINDOWS_REGISTRY_ROOT_PATTERN.test(root)) {
      reject(new DiscoveryIncompleteError("the registry root was not a plain HKLM/HKCU path this tool may query"));
      return;
    }
    if (powershellPath === void 0) {
      reject(new DiscoveryIncompleteError("SystemRoot is not configured"));
      return;
    }
    if (signal.aborted) {
      reject(new DiscoveryIncompleteError("powershell.exe was not started: the discovery budget was already spent"));
      return;
    }
    let settled = false;
    const child = execFile(powershellPath, [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      WINDOWS_POWERSHELL_QUERY_COMMAND,
      "-Root",
      root
    ], {
      maxBuffer: WINDOWS_REGISTRY_OUTPUT_MAX_BYTES,
      timeout: WINDOWS_REGISTRY_STEP_TIMEOUT_MS,
      windowsHide: true,
      encoding: "utf8"
    }, (error, stdout) => {
      if (settled) return;
      settled = true;
      if (error !== null && error !== void 0) {
        const code = error.killed === true ? void 0 : Number(error.code);
        if (code === WINDOWS_POWERSHELL_ROOT_ABSENT) {
          resolve("");
          return;
        }
        if (code === WINDOWS_POWERSHELL_ROOT_UNREADABLE) {
          reject(new DiscoveryIncompleteError(`powershell.exe could not read the registry root ${root}`));
          return;
        }
        reject(new DiscoveryIncompleteError(`powershell.exe could not complete (${error.killed === true ? "timed out" : String(error.code ?? "unavailable")})`));
        return;
      }
      const records = parseWindowsUninstallJson(stdout);
      if (records === void 0) {
        reject(new DiscoveryIncompleteError("powershell.exe output was not the expected registry document"));
        return;
      }
      resolve(records);
    });
    const abort = () => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new DiscoveryIncompleteError("powershell.exe was abandoned: the discovery budget was spent"));
    };
    signal.addEventListener("abort", abort, { once: true });
    child.on("close", () => {
      signal.removeEventListener("abort", abort);
    });
  });
  return {
    queryUninstallRoot: async (root, signal) => {
      const raw = await runTool(root, signal);
      if (isAsciiOnly(raw)) return raw.toString("utf8");
      return await runFallback(root, signal);
    }
  };
}
function isAsciiOnly(bytes) {
  for (const byte of bytes) {
    if (byte >= 128) return false;
  }
  return true;
}
function parseWindowsUninstallJson(output) {
  let document;
  try {
    document = JSON.parse(output);
  } catch {
    return void 0;
  }
  const rows = Array.isArray(document) ? document : [document];
  const lines = [];
  for (const [index, row] of rows.entries()) {
    if (typeof row !== "object" || row === null) continue;
    const record = row;
    const displayName = record["displayName"];
    const displayIcon = record["displayIcon"];
    if (typeof displayName !== "string" && typeof displayIcon !== "string") continue;
    lines.push(`HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{PS-${String(index)}}`);
    if (typeof displayName === "string") lines.push(`    DisplayName    REG_SZ    ${displayName}`);
    if (typeof displayIcon === "string") lines.push(`    DisplayIcon    REG_SZ    ${displayIcon}`);
  }
  return lines.join("\r\n");
}
var WorkBuddyAtRestKeyProvider = class {
  /**
   * The explicit binary, when one was configured. `undefined` here means "the
   * caller did not name one", which is what lets discovery run — an explicit
   * path that turns out to be unusable is an error, never a reason to look for
   * a different app.
   */
  explicitPath;
  product;
  defaultPath;
  discovery;
  tools;
  windowsTools;
  platform;
  discoveryBudgetMs;
  timeoutMs;
  source;
  spawnHelper;
  /**
   * The path discovery settled on, cached only on success. A failure leaves
   * this unset so the next attempt tries again — the user may install or move
   * the app without restarting DSH.
   */
  discoveredPath;
  cache;
  inflight;
  constructor(options) {
    this.product = options.product;
    const fromEnv = process.env[options.product.envVar]?.trim();
    const envPath = fromEnv === void 0 || fromEnv === "" ? void 0 : fromEnv;
    this.explicitPath = options.electronPath ?? envPath;
    this.discovery = options.discovery ?? "none";
    this.platform = options.platform ?? process.platform;
    this.defaultPath = this.discovery === "none" ? void 0 : options.defaultElectronPath === void 0 ? defaultWorkBuddyElectronPath(options.product, this.platform) : options.defaultElectronPath ?? void 0;
    this.tools = options.tools ?? workBuddyDiscoveryTools(options.product.macOS.bundleId);
    this.windowsTools = options.windowsTools ?? workBuddyWindowsDiscoveryTools();
    this.discoveryBudgetMs = options.discoveryBudgetMs ?? WORKBUDDY_DISCOVERY_BUDGET_MS;
    this.timeoutMs = options.timeoutMs ?? 1e4;
    this.spawnHelper = options.spawnHelper ?? ((path) => this.spawnAt(path));
    this.source = options.source ?? (() => this.spawnPayload());
  }
  /**
   * The binary the default helper would use, for diagnostics.
   *
   * Reports a *discovery result* once one exists, so diagnostics describe what
   * would actually run rather than the default that was bypassed. Discovery
   * itself stays in {@link resolveElectronPath}: this accessor never triggers a
   * search (the constructor must remain I/O-free, and callers may ask before
   * any resolution has happened).
   */
  helperPath() {
    if (this.explicitPath !== void 0) return this.explicitPath;
    if (this.discovery === "none") return void 0;
    return this.discoveredPath ?? this.defaultPath;
  }
  /**
   * A protector key matching one of the requested envelope key ids. The first
   * id the cache answers wins; otherwise one spawn resolves the current key,
   * which must match a request — a mismatch means the envelopes were sealed by
   * a different install than the one this machine now runs, and no key we can
   * reach will open them.
   */
  async protectorKeyFor(requested) {
    if (requested.length === 0) {
      throw new WorkBuddyElectronPathError(
        "encrypted-credential-unreadable",
        "encrypted desktop credential carries no key ids"
      );
    }
    const cached = this.cache;
    if (cached !== void 0 && requested.includes(cached.keyId)) return cached.key;
    this.inflight ??= this.source().then((text) => this.ingest(text)).finally(() => {
      this.inflight = void 0;
    });
    const resolved = await this.inflight;
    if (!requested.includes(resolved.keyId)) {
      throw new WorkBuddyElectronPathError(
        "encrypted-credential-unreadable",
        `WorkBuddy's current at-rest key (id ${resolved.keyId}) does not match the credential's envelope (id ${requested.join(" or ")}); the desktop credential was sealed by a different WorkBuddy installation`
      );
    }
    return resolved.key;
  }
  ingest(text) {
    const payload = parseAtRestPayload(text);
    if (payload === void 0) {
      throw new WorkBuddyElectronPathError(
        "encrypted-credential-unreadable",
        "WorkBuddy key helper returned an unusable at-rest payload (expected {version:1, atRestSecretKey})"
      );
    }
    const key = deriveProtectorKey(payload.atRestSecretKey);
    const resolved = {
      key,
      keyId: createHash("sha256").update(key).digest("hex").slice(0, 16)
    };
    this.cache = resolved;
    return resolved;
  }
  /**
   * The binary to spawn, or a diagnosable error saying why there is none.
   *
   * Order is the contract: an explicit path is used as-is and never falls back;
   * discovery runs only for a provider that was configured for it, and only
   * after the platform default has been tried and found unusable.
   */
  async resolveElectronPath() {
    if (this.explicitPath !== void 0) {
      if (!isExecutable(this.explicitPath)) {
        throw new WorkBuddyElectronPathError(
          "electron-path-invalid",
          `the configured ${this.product.productName} Electron binary is not available at ${this.explicitPath}; check ${this.product.envVar} or unset it to let the plugin look for the app itself`
        );
      }
      return this.explicitPath;
    }
    if (this.discovery === "none") {
      throw new WorkBuddyElectronPathError(
        "electron-binary-unavailable",
        `no ${this.product.productName} Electron binary is configured for this platform; set ${this.product.envVar} to the app's Electron binary`
      );
    }
    if (this.defaultPath !== void 0 && isExecutable(this.defaultPath)) return this.defaultPath;
    if (this.discoveredPath !== void 0) {
      if (isExecutable(this.discoveredPath)) return this.discoveredPath;
      this.discoveredPath = void 0;
    }
    const found = this.discovery === "macos-workbuddy" ? await this.discoverMacosApp() : await this.discoverWindowsApp();
    this.discoveredPath = found;
    return found;
  }
  /**
   * Resolve this product's app through Spotlight, then prove each candidate's
   * identity before it can be executed.
   *
   * The whole flow shares one budget: a hang in one candidate must not extend
   * the wait for the others, and running out of budget is reported as an
   * unfinished check rather than an absent app.
   */
  async discoverMacosApp() {
    if (this.platform !== "darwin") {
      throw new WorkBuddyElectronPathError(
        "electron-binary-unavailable",
        `no ${this.product.productName} Electron binary is configured for this platform; set ${this.product.envVar} to the app's Electron binary`
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.discoveryBudgetMs);
    try {
      let candidates;
      try {
        candidates = await this.tools.findApps(controller.signal);
      } catch {
        throw discoveryIncomplete(this.product.productName, "the app search did not complete");
      }
      const seen = /* @__PURE__ */ new Map();
      let unresolved = false;
      for (const candidate of candidates) {
        try {
          statSync(candidate);
        } catch (error) {
          if (isENOENT(error)) continue;
          unresolved = true;
          continue;
        }
        let bundleIdentifier;
        try {
          bundleIdentifier = await this.tools.bundleIdentifier(candidate, controller.signal);
        } catch {
          unresolved = true;
          continue;
        }
        if (bundleIdentifier === void 0) {
          unresolved = true;
          continue;
        }
        if (bundleIdentifier !== this.product.macOS.bundleId) continue;
        const electronPath = join(candidate, "Contents", "MacOS", "Electron");
        if (!isExecutable(electronPath)) continue;
        let identity;
        try {
          identity = realpathSync(candidate);
        } catch {
          identity = candidate;
        }
        if (seen.has(identity)) continue;
        let version;
        try {
          version = await this.tools.bundleVersion(candidate, controller.signal);
        } catch {
          version = void 0;
        }
        seen.set(identity, { bundlePath: candidate, electronPath, ...version === void 0 ? {} : { version } });
      }
      if (seen.size > 1) {
        const listed = [...seen.values()].map((app) => `  - ${app.bundlePath}${app.version === void 0 ? "" : ` (${app.version})`}`).join("\n");
        throw new WorkBuddyElectronPathError(
          "electron-binary-ambiguous",
          `more than one ${this.product.productName} application was found, so none was chosen:
${listed}
 set ${this.product.envVar} to the one to use`
        );
      }
      if (unresolved) throw discoveryIncomplete(this.product.productName, "some candidates could not be checked");
      if (seen.size === 0) {
        throw new WorkBuddyElectronPathError(
          "electron-binary-not-found",
          `no ${this.product.productName} application was found in the default location or the system index; if it is installed elsewhere, it may not be indexed yet; set ${this.product.envVar} to the app's Electron binary`
        );
      }
      return [...seen.values()][0].electronPath;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  /**
   * Resolve this product's app through Windows uninstall records. Registry
   * entries provide hints, not trust: every DisplayIcon candidate must still
   * be the product's Electron binary with the known Electron layout before
   * execution.
   */
  async discoverWindowsApp() {
    if (this.platform !== "win32") {
      throw new WorkBuddyElectronPathError(
        "electron-binary-unavailable",
        `no ${this.product.productName} Electron binary is configured for this platform; set ${this.product.envVar} to the app's Electron binary`
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.discoveryBudgetMs);
    try {
      const candidates = [];
      let unresolved = false;
      for (const root of WINDOWS_REGISTRY_ROOTS) {
        let output;
        try {
          output = await this.windowsTools.queryUninstallRoot(root, controller.signal);
        } catch {
          unresolved = true;
          continue;
        }
        const parsed = parseWindowsRegistryOutput(output, this.product.windows.displayNamePattern);
        candidates.push(...parsed.candidates);
        unresolved ||= parsed.incomplete;
      }
      const seen = /* @__PURE__ */ new Map();
      const rejected = [];
      for (const candidate of new Set(candidates)) {
        const inspection = inspectWindowsElectronCandidate(candidate, this.platform, this.product.windows.exeBasename);
        if (inspection === "unresolved") {
          unresolved = true;
          continue;
        }
        if (inspection === void 0) {
          rejected.push(candidate);
          continue;
        }
        seen.set(inspection.identity, inspection.electronPath);
      }
      if (unresolved) throw discoveryIncomplete(this.product.productName, "some registry entries or candidates could not be checked");
      if (seen.size > 1) {
        const listed = [...seen.values()].map((path) => `  - ${path}`).join("\n");
        throw new WorkBuddyElectronPathError(
          "electron-binary-ambiguous",
          `more than one ${this.product.productName} application was found, so none was chosen:
${listed}
 set ${this.product.envVar} to the one to use`
        );
      }
      if (seen.size === 0) {
        const message = rejected.length === 0 ? `no usable ${this.product.productName} Electron binary was found in the default location or Windows uninstall records; set ${this.product.envVar} to the app's Electron binary` : `Windows uninstall records found ${rejected.length} ${this.product.productName} candidate${rejected.length > 1 ? "s" : ""}, but ${rejected.length > 1 ? "none" : "it"} did not match the expected app layout (the app's exe beside a version file and resources\\app.asar); set ${this.product.envVar} to the installed app's executable to use it`;
        throw new WorkBuddyElectronPathError("electron-binary-not-found", message);
      }
      return [...seen.values()][0];
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  async spawnPayload() {
    return await this.spawnHelper(await this.resolveElectronPath());
  }
  async spawnAt(electronPath) {
    return await new Promise((resolve, reject) => {
      execFile(electronPath, [HELPER_SCRIPT_ARGUMENT_FLAG, HELPER_SCRIPT], {
        timeout: this.timeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
      }, (error, stdout) => {
        if (error !== null && error !== void 0) {
          const reason = error.killed === true ? `timed out or was killed after ${String(this.timeoutMs)}ms` : error.code !== void 0 ? `exited with code ${String(error.code)}` : "could not be started";
          reject(new WorkBuddyElectronPathError(
            "encrypted-credential-unreadable",
            `the WorkBuddy key helper (${electronPath}) ${reason}`
          ));
          return;
        }
        const output = stdout.trim();
        if (output === "") {
          reject(new WorkBuddyElectronPathError(
            "encrypted-credential-unreadable",
            `the WorkBuddy key helper (${electronPath}) produced no payload`
          ));
          return;
        }
        resolve(output);
      });
    });
  }
};
function windowsRegistryKeyMissing(stderr) {
  const detail = stderr.trim();
  return /^ERROR:\s*The system was unable to find the specified registry key or value\.?$/iu.test(detail) || /^错误[:：]\s*系统找不到指定的注册表项或值[。.]?$/u.test(detail);
}
function parseWindowsRegistryOutput(output, displayNamePattern) {
  const entries = /* @__PURE__ */ new Map();
  let currentKey;
  for (const line of output.split(/\r?\n/u)) {
    const keyMatch = /^\s*(HKEY_[^\r\n]+?)\s*$/iu.exec(line);
    if (keyMatch !== null) {
      currentKey = keyMatch[1];
      entries.set(currentKey, {});
      continue;
    }
    if (currentKey === void 0) continue;
    const valueMatch = /^\s+(DisplayName|DisplayIcon)\s+REG_[A-Z0-9_]+\s*(.*?)\s*$/iu.exec(line);
    if (valueMatch === null) continue;
    const entry = entries.get(currentKey);
    if (entry === void 0) continue;
    const value = valueMatch[2] ?? "";
    if (valueMatch[1].toLowerCase() === "displayname") entry.displayName = value;
    else entry.displayIcon = value;
  }
  const candidates = [];
  let incomplete = false;
  for (const entry of entries.values()) {
    if (entry.displayName === void 0) continue;
    if (!displayNamePattern.test(entry.displayName.trim())) continue;
    const displayIcon = entry.displayIcon === void 0 ? void 0 : parseWindowsDisplayIcon(entry.displayIcon);
    if (displayIcon === void 0) incomplete = true;
    else candidates.push(displayIcon);
  }
  return { candidates, incomplete };
}
function parseWindowsDisplayIcon(value) {
  const raw = value.trim();
  let path;
  if (raw.startsWith('"')) {
    const closingQuote = raw.indexOf('"', 1);
    if (closingQuote < 0) return void 0;
    const suffix = raw.slice(closingQuote + 1).trim();
    if (suffix !== "" && !/^,\d+$/u.test(suffix)) return void 0;
    path = raw.slice(1, closingQuote).replace(/,\d+$/u, "");
  } else {
    const match = /^(.+?\.exe)(?:,\d+)?$/iu.exec(raw);
    if (match === null) return void 0;
    path = match[1];
  }
  path = path.trim();
  return /\.exe$/iu.test(path) ? path : void 0;
}
function inspectWindowsElectronCandidate(electronPath, platform, exeBasename) {
  if (platform !== "win32" || basename(electronPath).toLowerCase() !== exeBasename) return void 0;
  let binaryStat;
  try {
    binaryStat = statSync(electronPath);
  } catch (error) {
    return isENOENT(error) ? void 0 : "unresolved";
  }
  if (!binaryStat.isFile()) return void 0;
  try {
    accessSync(electronPath, constants.X_OK);
  } catch (error) {
    return isENOENT(error) ? void 0 : "unresolved";
  }
  const installRoot = dirname(electronPath);
  let version;
  try {
    version = readFileSync(join(installRoot, "version"), "utf8").trim();
  } catch (error) {
    return isENOENT(error) ? void 0 : "unresolved";
  }
  if (!WINDOWS_ELECTRON_VERSION_PATTERN.test(version)) return void 0;
  try {
    if (!readdirSync(join(installRoot, "resources")).includes("app.asar")) return void 0;
  } catch (error) {
    return isENOENT(error) ? void 0 : "unresolved";
  }
  let identity;
  try {
    identity = realpathSync(electronPath);
  } catch (error) {
    return isENOENT(error) ? void 0 : "unresolved";
  }
  return {
    electronPath,
    // Windows paths are case-insensitive even when a registry entry preserved
    // a different casing from the filesystem spelling.
    identity: platform === "win32" ? identity.toLowerCase() : identity
  };
}
function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
var WorkBuddyElectronPathError = class extends Error {
  reasonCode;
  constructor(reasonCode, message) {
    super(message);
    this.name = "WorkBuddyElectronPathError";
    this.reasonCode = reasonCode;
  }
};
function reasonCodeOf(error) {
  return error instanceof WorkBuddyElectronPathError ? error.reasonCode : void 0;
}
function isENOENT(error) {
  return error?.code === "ENOENT";
}
function discoveryIncomplete(productName, detail) {
  return new WorkBuddyElectronPathError(
    "electron-discovery-incomplete",
    `the ${productName} application search did not finish (${detail}); this is not proof that the app is missing`
  );
}
var HELPER_SCRIPT = 'process.stdout.write(String(process._linkedBinding("electron_browser_workbuddy_storage").loggerGet()))';
var HELPER_SCRIPT_ARGUMENT_FLAG = "-e";

// upstream/workbuddy/src/auth.ts
import { readFile, rm } from "node:fs/promises";
import { homedir, release } from "node:os";
import { basename as basename2, dirname as dirname2, join as join2 } from "node:path";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
var WORKBUDDY_AUTH_FILENAME = ".workbuddy-auth.json";
var WORKBUDDY_AUTH_FILE_ENV = "WORKBUDDY_AUTH_FILE";
var OWN_FORMAT_VERSION = 1;
function workbuddyOwnAuthPath() {
  return join2(resolveDshHome(), WORKBUDDY_AUTH_FILENAME);
}
var DESKTOP_AUTH_RELATIVE_PATH = ["CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"];
function isWsl() {
  if (process.platform !== "linux") return false;
  if (process.env["WSL_DISTRO_NAME"] !== void 0 || process.env["WSL_INTEROP"] !== void 0) return true;
  return release().toLowerCase().includes("microsoft");
}
function windowsPathForWsl(value) {
  const path = value?.trim();
  if (!path) return void 0;
  if (path.startsWith("/")) return path;
  const drivePath = /^([a-z]):[\\/](.*)$/iu.exec(path);
  if (drivePath === null) return void 0;
  return join2("/mnt", drivePath[1].toLowerCase(), ...drivePath[2].split(/[\\/]+/u));
}
function wslDesktopAuthCandidates(home) {
  const profile = windowsPathForWsl(process.env["USERPROFILE"]) ?? join2("/mnt/c/Users", basename2(home));
  const localAppData = windowsPathForWsl(process.env["LOCALAPPDATA"]) ?? join2(profile, "AppData", "Local");
  const roamingAppData = windowsPathForWsl(process.env["APPDATA"]) ?? join2(profile, "AppData", "Roaming");
  return [
    join2(localAppData, ...DESKTOP_AUTH_RELATIVE_PATH),
    join2(roamingAppData, ...DESKTOP_AUTH_RELATIVE_PATH)
  ];
}
function defaultDesktopAuthCandidates() {
  const home = homedir();
  if (process.platform === "darwin") {
    return [join2(home, "Library", "Application Support", "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info")];
  }
  if (process.platform === "win32") {
    return [
      join2(home, "AppData", "Local", "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"),
      join2(home, "AppData", "Roaming", "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info")
    ];
  }
  if (process.platform === "linux") {
    const configHome = xdgBase("XDG_CONFIG_HOME", join2(home, ".config"));
    const dataHome = xdgBase("XDG_DATA_HOME", join2(home, ".local", "share"));
    const linux = dedupeCandidates([
      join2(configHome, ...DESKTOP_AUTH_RELATIVE_PATH),
      join2(dataHome, ...DESKTOP_AUTH_RELATIVE_PATH)
    ]);
    return isWsl() ? dedupeCandidates([...wslDesktopAuthCandidates(home), ...linux]) : linux;
  }
  return [];
}
function xdgBase(envName, fallback) {
  const value = process.env[envName]?.trim();
  if (value !== void 0 && value !== "" && value.startsWith("/")) return value;
  return fallback;
}
function dedupeCandidates(candidates) {
  return [...new Set(candidates)];
}
function desktopAuthCandidatesFor(variant) {
  return dedupeCandidates(defaultDesktopAuthCandidates().map((path) => join2(dirname2(path), variant.desktopFilename)));
}
function expiryToMs(value) {
  if (value <= 0) return 0;
  return value > 1e12 ? value : value * 1e3;
}
function optionalString(value) {
  return typeof value === "string" && value !== "" ? value : void 0;
}
function parseWorkBuddyAuth(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return void 0;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
  const document = parsed;
  let auth;
  let identity;
  if (typeof document["auth"] === "object" && document["auth"] !== null) {
    auth = document["auth"];
    identity = typeof document["account"] === "object" && document["account"] !== null ? document["account"] : {};
  } else {
    auth = document;
    identity = document;
  }
  const accessToken = typeof auth["accessToken"] === "string" ? auth["accessToken"] : "";
  if (accessToken === "") return void 0;
  const expiresAtMs = typeof auth["expiresAt"] === "number" ? expiryToMs(auth["expiresAt"]) : 0;
  const refreshExpiresAtMs = typeof auth["refreshExpiresAt"] === "number" ? expiryToMs(auth["refreshExpiresAt"]) : void 0;
  const enterpriseId = optionalString(identity["enterpriseId"]);
  const nickname = optionalString(identity["nickname"]);
  const credential = {
    accessToken,
    refreshToken: typeof auth["refreshToken"] === "string" ? auth["refreshToken"] : "",
    expiresAtMs,
    ...refreshExpiresAtMs === void 0 ? {} : { refreshExpiresAtMs },
    domain: optionalString(auth["domain"]) ?? "",
    uid: optionalString(identity["uid"]) ?? "",
    ...enterpriseId === void 0 ? {} : { enterpriseId },
    ...nickname === void 0 ? {} : { nickname },
    source: "desktop"
  };
  return credential;
}
function ownDocument(credential) {
  return { version: OWN_FORMAT_VERSION, credential };
}
function parseOwnDocument(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return void 0;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
  const document = parsed;
  if (document["version"] !== OWN_FORMAT_VERSION) return void 0;
  if (typeof document["credential"] !== "object" || document["credential"] === null) return void 0;
  const stored = document["credential"];
  const accessToken = typeof stored["accessToken"] === "string" ? stored["accessToken"] : "";
  if (accessToken === "") return void 0;
  const refreshExpiresAtMs = typeof stored["refreshExpiresAtMs"] === "number" ? stored["refreshExpiresAtMs"] : void 0;
  const enterpriseId = optionalString(stored["enterpriseId"]);
  const nickname = optionalString(stored["nickname"]);
  return {
    accessToken,
    refreshToken: typeof stored["refreshToken"] === "string" ? stored["refreshToken"] : "",
    expiresAtMs: typeof stored["expiresAtMs"] === "number" ? stored["expiresAtMs"] : 0,
    ...refreshExpiresAtMs === void 0 ? {} : { refreshExpiresAtMs },
    domain: optionalString(stored["domain"]) ?? "",
    uid: optionalString(stored["uid"]) ?? "",
    ...enterpriseId === void 0 ? {} : { enterpriseId },
    ...nickname === void 0 ? {} : { nickname },
    source: "dsh"
  };
}
function isENOENT2(error) {
  return error?.code === "ENOENT";
}
var WorkBuddyCredentialStore = class {
  variant;
  refresh;
  refreshMarginMs;
  ownPath;
  keyProvider;
  desktopPathOverride;
  inflight;
  constructor(options) {
    this.variant = options.variant;
    this.refresh = options.refresh;
    this.refreshMarginMs = options.refreshMarginMs ?? 5 * 60 * 1e3;
    this.ownPath = options.ownPath ?? (options.variant ? join2(resolveDshHome(), options.variant.ownFilename) : workbuddyOwnAuthPath());
    this.keyProvider = options.keyProvider ?? new WorkBuddyAtRestKeyProvider({ product: electronProfileFor(options.variant) });
    this.desktopPathOverride = options.desktopPath;
  }
  /**
   * Configuration precedence for the desktop file: the plugin's configured
   * path, then the environment variable, then the platform defaults. An
   * explicit path is used verbatim; the defaults are a probe order.
   */
  resolveDesktopCandidates() {
    const fromEnv = process.env[this.variant?.env ?? WORKBUDDY_AUTH_FILE_ENV];
    const explicit = this.desktopPathOverride ?? (fromEnv !== void 0 && fromEnv.trim() !== "" ? fromEnv : void 0);
    if (explicit !== void 0) return [explicit];
    return this.variant === void 0 ? defaultDesktopAuthCandidates() : desktopAuthCandidatesFor(this.variant);
  }
  resolveDesktopPath() {
    return this.resolveDesktopCandidates()[0];
  }
  /**
   * Repoint the desktop file; a settings change applies on the next read.
   */
  setDesktopPath(path) {
    this.desktopPathOverride = path;
  }
  /** The resolved desktop auth-file path, for diagnostics. */
  desktopAuthPath() {
    return this.resolveDesktopPath();
  }
  /** The plugin-owned copy path, for diagnostics. */
  ownAuthPath() {
    return this.ownPath;
  }
  /** Read the freshest stored credential without refreshing anything. */
  async current() {
    const [desktop, own] = await Promise.all([this.readDesktop(), this.readOwn()]);
    if (this.variant !== void 0) {
      for (const [label, credential] of [["desktop file", desktop], ["plugin copy", own]]) {
        if (credential === void 0) continue;
        const region = regionOf(credential.domain);
        if (region !== this.variant.region) {
          throw new WorkBuddyElectronPathError(
            "credential-region-mismatch",
            `${this.variant.displayName} received a ${region === "cn" ? "WorkBuddy (CN)" : "WorkBuddy AI"} credential in its ${label} (domain ${JSON.stringify(credential.domain)}); point ${this.variant.env} at the ${this.variant.appName} sign-in, or remove the mismatched file`
          );
        }
      }
    }
    if (desktop === void 0) return own;
    if (own === void 0) return desktop;
    if (desktop.uid !== own.uid || desktop.enterpriseId !== own.enterpriseId) return desktop;
    return own.expiresAtMs > desktop.expiresAtMs ? own : desktop;
  }
  /**
   * The credential to send upstream: {@link current}, refreshed on demand.
   * Single-flight, so parallel requests share one refresh.
   */
  async resolve() {
    const credential = await this.current();
    if (credential === void 0) {
      const candidates = this.resolveDesktopCandidates();
      const desktop = candidates.length > 0 ? candidates.join(" or ") : "(no desktop path on this platform)";
      const app = this.variant?.appName ?? "WorkBuddy";
      throw new Error(
        `workbuddy: no signed-in ${app} account found; sign in once in the ${app} desktop app (expected ${desktop} or ${this.variant?.env ?? WORKBUDDY_AUTH_FILE_ENV}), or refresh an existing session`
      );
    }
    if (!this.needsRefresh(credential)) return credential;
    this.inflight ??= this.refreshNow(credential).finally(() => {
      this.inflight = void 0;
    });
    return this.inflight;
  }
  /** Read-only sign-in summary; never refreshes and never throws. */
  async status() {
    try {
      const credential = await this.current();
      if (credential === void 0) return { state: "signed-out", reasonCode: "no-credential" };
      return {
        state: "signed-in",
        expiresAtMs: credential.expiresAtMs,
        ...credential.refreshExpiresAtMs === void 0 ? {} : { refreshExpiresAtMs: credential.refreshExpiresAtMs },
        ...credential.nickname === void 0 ? {} : { nickname: credential.nickname },
        ...credential.domain === "" ? {} : { domain: credential.domain },
        source: credential.source
      };
    } catch (error) {
      return {
        state: "signed-out",
        reason: error instanceof Error ? error.message : String(error),
        ...reasonCodeOf(error) === void 0 ? {} : { reasonCode: reasonCodeOf(error) }
      };
    }
  }
  /** Remove the plugin-owned copy; the desktop file is untouched. */
  async logout() {
    await rm(this.ownPath, { force: true });
    await rm(`${this.ownPath}.lock`, { force: true });
  }
  needsRefresh(credential) {
    if (credential.expiresAtMs <= 0) return true;
    return Date.now() + this.refreshMarginMs >= credential.expiresAtMs;
  }
  async refreshNow(credential) {
    if (credential.refreshToken === "") {
      if (credential.expiresAtMs > Date.now() + 3e4) return credential;
      throw new Error("workbuddy: access token expired and no refresh token is stored; sign in again in the WorkBuddy desktop app");
    }
    try {
      const outcome = await this.refresh(credential);
      const refreshed = {
        ...credential,
        accessToken: outcome.accessToken,
        ...outcome.refreshToken === void 0 ? {} : { refreshToken: outcome.refreshToken },
        expiresAtMs: outcome.expiresInSec !== void 0 ? Date.now() + outcome.expiresInSec * 1e3 : credential.expiresAtMs,
        ...outcome.domain === void 0 || outcome.domain === "" ? {} : { domain: outcome.domain },
        source: "dsh"
      };
      await this.saveOwn(refreshed);
      return refreshed;
    } catch (error) {
      if (credential.expiresAtMs > Date.now() + 3e4) return credential;
      throw new Error(
        `workbuddy: token refresh failed and the access token is expired (${String(error)}); open the WorkBuddy desktop app once to sign in again`
      );
    }
  }
  async saveOwn(credential) {
    await withFileLock(this.ownPath, async () => {
      await writeFileAtomic(this.ownPath, `${JSON.stringify(ownDocument(credential), null, 2)}
`, {
        mode: 384,
        dirMode: 448
      });
    });
  }
  /**
   * Read the first desktop candidate that exists. Only an absent file
   * (ENOENT) falls through to the next candidate; a file that is present
   * but unparsable is authoritative for its slot, so a stale older-version
   * file never silently wins over a broken newer one.
   *
   * Since WorkBuddy 5.6 the token fields may arrive in at-rest envelopes, so
   * the text is classified before the regular parser sees it. An encrypted
   * document must be *opened*, never skipped; an unrecognized one must fail
   * loudly. The desktop file, as long as it exists, is the identity
   * authority — a document this plugin cannot read must surface as a
   * diagnosis rather than be papered over by the plugin-owned copy, which
   * belongs to whatever account was signed in when it was last refreshed.
   * Only an absent (or empty) file lets the probe continue.
   */
  async readDesktop() {
    for (const desktopPath of this.resolveDesktopCandidates()) {
      let text;
      try {
        text = await readFile(desktopPath, "utf8");
      } catch (error) {
        if (!isENOENT2(error)) throw error;
        continue;
      }
      const classification = classifyDesktopAuthDocument(text);
      if (classification.format === "plaintext") return parseWorkBuddyAuth(text);
      if (classification.format === "absent") continue;
      if (classification.format === "unrecognized") {
        throw new Error(
          `the desktop auth file at ${desktopPath} exists but is unreadable (neither a plaintext credential nor a decodable WorkBuddy 5.6 envelope); fix or remove the file \u2014 it outranks the plugin-owned credential copy`
        );
      }
      return await this.openEncryptedDesktop(classification);
    }
    return void 0;
  }
  /** Open a 5.6 encrypted desktop document into the regular credential shape. */
  async openEncryptedDesktop(classification) {
    const wrapped = classification.wrapped;
    const key = await this.keyProvider.protectorKeyFor(keyIdsOf(wrapped.fields));
    const text = unwrapDesktopAuthDocument(classification, (field) => {
      const plaintext = openAuthField(key, field.envelope);
      if (plaintext === void 0) {
        throw new WorkBuddyElectronPathError(
          "encrypted-credential-unreadable",
          `the encrypted desktop credential's ${field.field} could not be decrypted (envelope key id ${field.envelope.keyId}); the WorkBuddy app may hold a different at-rest key \u2014 open it once to reseal the sign-in`
        );
      }
      return plaintext;
    });
    return parseWorkBuddyAuth(text);
  }
  /**
   * Classify the first desktop candidate that exists and carries content;
   * `absent` when none does. An empty first file is skipped so it cannot mask
   * a real document on the next candidate. Diagnostics only — it never spawns
   * the key helper and never decrypts, so doctor can describe the file
   * without attempting the unlock.
   */
  async desktopAuthFormat() {
    for (const desktopPath of this.resolveDesktopCandidates()) {
      let text;
      try {
        text = await readFile(desktopPath, "utf8");
      } catch (error) {
        if (!isENOENT2(error)) throw error;
        continue;
      }
      const format = classifyDesktopAuthDocument(text).format;
      if (format !== "absent") return format;
    }
    return "absent";
  }
  async readOwn() {
    try {
      return parseOwnDocument(await readFile(this.ownPath, "utf8"));
    } catch (error) {
      if (isENOENT2(error)) return void 0;
      return void 0;
    }
  }
  /**
   * The first desktop candidate the probe would actually read from; `undefined`
   * when none qualifies. Semantics deliberately match the probe: empty files
   * are skipped (the probe classifies them as absent and moves on), so on an
   * XDG layout where the config-home file is empty but the data-home file
   * holds the credential, diagnostics name the *data-home* file — the one
   * authentication really uses. Like the probe it never parses or decrypts.
   */
  async resolvedDesktopAuthPath() {
    for (const desktopPath of this.resolveDesktopCandidates()) {
      let text;
      try {
        text = await readFile(desktopPath, "utf8");
      } catch (error) {
        if (!isENOENT2(error)) throw error;
        continue;
      }
      if (text.trim() === "") continue;
      return desktopPath;
    }
    return void 0;
  }
  /** Whether any desktop-file candidate exists as a regular file; diagnostics only. */
  async desktopFilePresent() {
    return await this.resolvedDesktopAuthPath() !== void 0;
  }
};

// upstream/trae/src/paths.ts
import { homedir as homedir2 } from "node:os";
import { join as join3 } from "node:path";
var APP_NAMES = {
  cn: "Trae CN",
  sg: "Trae",
  solo: "TRAE SOLO CN",
  "solo-sg": "TRAE SOLO"
};
var CLI_HOME_NAMES = [".trae-cn", ".trae"];
var TRAE_CLI_TOKEN_FILENAME = "trae-jwt-token";
var LINUX_APP_NAMES = {
  cn: ["trae-cn", "Trae CN", "trae", "Trae"],
  sg: ["trae", "Trae"],
  solo: ["trae-solo-cn", "TRAE SOLO CN"],
  "solo-sg": ["trae-solo", "TRAE SOLO"]
};
var WINDOWS_APP_NAMES = {
  cn: ["Trae CN", "trae-cn"],
  sg: ["Trae"],
  solo: ["TRAE SOLO CN", "trae-solo-cn"],
  "solo-sg": ["TRAE SOLO"]
};
function traeWindowsAppNames(edition) {
  return WINDOWS_APP_NAMES[edition];
}
function traeStorageCandidates(platform = process.platform, home = homedir2(), env = process.env) {
  const result = [];
  for (const edition of ["cn", "sg", "solo", "solo-sg"]) {
    const app = APP_NAMES[edition];
    let roots;
    let appNames;
    if (platform === "darwin") {
      roots = [join3(home, "Library", "Application Support")];
      appNames = [app];
    } else if (platform === "win32") {
      roots = [env.APPDATA, join3(home, "AppData", "Roaming")].filter((value, index, all) => typeof value === "string" && value !== "" && all.indexOf(value) === index);
      appNames = WINDOWS_APP_NAMES[edition];
    } else if (platform === "linux") {
      roots = [env.XDG_CONFIG_HOME || join3(home, ".config")];
      appNames = LINUX_APP_NAMES[edition];
    } else {
      roots = [];
      appNames = [app];
    }
    for (const root of roots) {
      for (const appName of appNames) {
        result.push({ edition, path: join3(root, appName, "User", "globalStorage", "storage.json"), source: "desktop" });
      }
    }
  }
  return [...result, ...traeCliCandidates(platform, home, env)];
}
function traeCliCandidates(platform = process.platform, home = homedir2(), env = process.env) {
  const roots = [];
  if (platform === "win32") {
    for (const value of [env.USERPROFILE, home]) {
      if (typeof value === "string" && value !== "" && !roots.includes(value)) roots.push(value);
    }
  } else {
    roots.push(home);
  }
  const result = [];
  for (const root of roots) {
    for (const name of CLI_HOME_NAMES) {
      const edition = name === ".trae-cn" ? "cn" : "sg";
      result.push({ edition, path: join3(root, name, TRAE_CLI_TOKEN_FILENAME), source: "cli" });
    }
  }
  return result;
}

// upstream/trae/src/auth.ts
import { readFile as readFile2, rm as rm2, stat } from "node:fs/promises";
import { createHash as createHash3 } from "node:crypto";
import { join as join4 } from "node:path";
import { withFileLock as withFileLock2, writeFileAtomic as writeFileAtomic2 } from "@deepseek-ai/dsh-atomic-write";
import { resolveDshHome as resolveDshHome2 } from "@deepseek-ai/dsh-home-paths";

// upstream/trae/src/decrypt.ts
import { createDecipheriv as createDecipheriv2, createHash as createHash2 } from "node:crypto";
var TRAE_AUTH_STORAGE_KEY = "iCubeAuthInfo://icube.cloudide";
var SALT_A = Uint8Array.from([82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129, 243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68, 196, 222, 233, 203, 84, 123, 148, 50, 166, 194, 35, 61, 238, 76, 149, 11, 66, 250, 195, 78, 8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162, 73, 109, 139, 209, 37]);
var SALT_B = Uint8Array.from([31, 221, 168, 51, 136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169, 25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59, 77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4, 126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125]);
var SALT_C = Uint8Array.from([191, 192, 216, 250, 122, 246, 220, 97, 31, 254, 98, 27, 8, 72, 71, 176, 135, 99, 96, 18, 127, 101, 203, 104, 211, 102, 191, 125, 37, 72, 150, 156, 51, 229, 121, 35, 17, 153, 141, 177, 110, 131, 150, 128, 172, 255, 254, 6, 18, 140, 55, 62, 236, 249, 135, 64, 135, 12, 117, 4, 89, 149, 168, 209]);
var SALT_D = Uint8Array.from([246, 204, 26, 232, 232, 70, 129, 109, 223, 146, 169, 242, 23, 241, 105, 145, 50, 196, 165, 42, 254, 120, 3, 54, 244, 207, 209, 85, 53, 6, 138, 106, 175, 148, 31, 204, 186, 186, 165, 182, 87, 142, 49, 10, 39, 110, 26, 154, 86, 56, 173, 125, 18, 64, 198, 225, 99, 99, 83, 82, 191, 134, 76, 170]);
function xor(a, b) {
  return Buffer.from(a.map((value, index) => value ^ (b[index] ?? 0)));
}
function encryptionType(header) {
  if (header.equals(Buffer.from([116, 99, 5, 16, 0, 0]))) return "aes";
  if (header.equals(Buffer.from([18, 57, 32, 32, 2, 3]))) return "aes-private";
  throw new Error("unsupported Trae auth encryption header");
}
function decryptTraeStorageValue(encoded) {
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length <= 102) throw new Error("Trae auth ciphertext is too short");
  const type = encryptionType(buffer.subarray(0, 6));
  const random = buffer.subarray(6, 38);
  const encrypted = buffer.subarray(38);
  const salt = type === "aes-private" ? xor(SALT_C, SALT_D) : xor(SALT_A, SALT_B);
  const first = createHash2("sha512").update(random).digest();
  const derived = createHash2("sha512").update(Buffer.concat([first, salt])).digest();
  const decipher = createDecipheriv2("aes-128-cbc", derived.subarray(0, 16), derived.subarray(16, 32));
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  if (decrypted.length < 64) throw new Error("Trae auth plaintext is too short");
  const expected = decrypted.subarray(0, 64);
  const plaintext = decrypted.subarray(64);
  const actual = createHash2("sha512").update(plaintext).digest();
  if (!expected.equals(actual)) throw new Error("Trae auth integrity check failed");
  return plaintext.toString("utf8");
}
function parseTraeAuthValue(value) {
  const trimmed = value.trim();
  if (trimmed === "") throw new Error("Trae auth value is empty");
  const plaintext = trimmed.startsWith("{") ? trimmed : decryptTraeStorageValue(trimmed);
  return JSON.parse(plaintext);
}
function parseTraeStorageDocument(text) {
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Trae storage document must be an object");
  const value = parsed[TRAE_AUTH_STORAGE_KEY];
  if (typeof value !== "string") throw new Error(`Trae storage document has no ${TRAE_AUTH_STORAGE_KEY}`);
  return parseTraeAuthValue(value);
}
function decodeBase64UrlJson(segment) {
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function parseTraeCliToken(text) {
  const trimmed = text.trim();
  if (trimmed === "") throw new Error("Trae CLI token file is empty");
  let token = trimmed;
  if (trimmed.startsWith("{")) {
    const envelope = JSON.parse(trimmed);
    const candidate = envelope["token"] ?? envelope["accessToken"] ?? envelope["jwt"];
    if (typeof candidate !== "string" || candidate.trim() === "") throw new Error("Trae CLI token document has no token field");
    token = candidate.trim();
  }
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => segment === "")) throw new Error("Trae CLI token is not a three-part JWT");
  const payload = decodeBase64UrlJson(segments[1]);
  if (payload === void 0) throw new Error("Trae CLI token payload is not decodable JSON");
  const data = typeof payload["data"] === "object" && payload["data"] !== null && !Array.isArray(payload["data"]) ? payload["data"] : void 0;
  const userId = typeof data?.["user_id"] === "string" ? data["user_id"] : void 0;
  if (userId === void 0 || userId === "") throw new Error("Trae CLI token has no data.user_id claim");
  const exp = payload["exp"];
  const expiresAtMs = typeof exp === "number" && Number.isFinite(exp) && exp > 0 ? exp * 1e3 : void 0;
  return { accessToken: token, userId, ...expiresAtMs === void 0 ? {} : { expiresAtMs } };
}

// upstream/trae/src/auth.ts
var CLI_DEFAULT_HOST = "https://api.trae.cn";
var OWN_VERSION = 1;
var TRAE_AUTH_FILENAME = ".trae-auth.json";
var TRAE_OWN_PREFIX = ".trae-auth";
function traeOwnAuthPath(region) {
  return join4(resolveDshHome2(), `${TRAE_OWN_PREFIX}.${region}.json`);
}
function legacyTraeOwnAuthPath() {
  return join4(resolveDshHome2(), TRAE_AUTH_FILENAME);
}
function optionalString2(value) {
  return typeof value === "string" && value !== "" ? value : void 0;
}
function timeToMs(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value > 1e12 ? value : value * 1e3;
  if (typeof value !== "string" || value.trim() === "") return void 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric > 1e12 ? numeric : numeric * 1e3;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function userRegionOf(value) {
  const raw = typeof value === "object" && value !== null && !Array.isArray(value) ? value["region"] : value;
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : void 0;
}
function normalizeTraeCredential(raw, edition, source) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return void 0;
  const value = raw;
  const accessToken = optionalString2(value["token"]) ?? optionalString2(value["accessToken"]);
  if (accessToken === void 0) return void 0;
  const expiresAtMs = timeToMs(value["expiredAt"] ?? value["expiresAt"]) ?? 0;
  const refreshExpiresAtMs = timeToMs(value["refreshExpiredAt"] ?? value["refreshExpiresAt"]);
  const refreshToken = optionalString2(value["refreshToken"]);
  const userRegion = userRegionOf(value["userRegion"]);
  const account = typeof value["account"] === "object" && value["account"] !== null && !Array.isArray(value["account"]) ? value["account"] : void 0;
  const accountName = optionalString2(account?.["username"]);
  return {
    accessToken,
    ...refreshToken === void 0 ? {} : { refreshToken },
    userId: optionalString2(value["userId"]) ?? "",
    ...accountName === void 0 ? {} : { accountName },
    host: optionalString2(value["host"]) ?? "",
    ...userRegion === void 0 ? {} : { userRegion },
    expiresAtMs,
    ...refreshExpiresAtMs === void 0 ? {} : { refreshExpiresAtMs },
    edition,
    source
  };
}
function traeAccountId(credential) {
  const stable = `${credential.edition}\0${credential.userId || credential.accountName || "unknown"}`;
  return createHash3("sha256").update(stable).digest("hex").slice(0, 24);
}
function parseOwn(text) {
  try {
    const document = JSON.parse(text);
    if (document.version !== OWN_VERSION || typeof document.credential !== "object" || document.credential === null) return void 0;
    const stored = document.credential;
    const edition = stored["edition"];
    if (edition !== "cn" && edition !== "sg" && edition !== "solo" && edition !== "solo-sg") return void 0;
    return normalizeTraeCredential({
      token: stored["accessToken"],
      refreshToken: stored["refreshToken"],
      userId: stored["userId"],
      host: stored["host"],
      userRegion: stored["userRegion"],
      account: stored["accountName"] === void 0 ? void 0 : { username: stored["accountName"] },
      expiredAt: stored["expiresAtMs"],
      refreshExpiredAt: stored["refreshExpiresAtMs"]
    }, edition, "dsh");
  } catch {
    return void 0;
  }
}
var TraeCredentialStore = class {
  storagePathOverride;
  edition;
  accountId;
  region;
  ownPathExplicit;
  legacyOwnPath;
  legacyOwnPathExplicit;
  refresh;
  refreshMarginMs;
  inflight;
  constructor(options) {
    this.storagePathOverride = options.storagePath;
    this.edition = options.edition ?? "auto";
    this.accountId = options.accountId;
    this.region = options.region;
    this.ownPathExplicit = options.ownPath;
    this.legacyOwnPath = options.legacyOwnPath ?? legacyTraeOwnAuthPath();
    this.legacyOwnPathExplicit = options.legacyOwnPath;
    this.refresh = options.refresh;
    this.refreshMarginMs = options.refreshMarginMs ?? 5 * 6e4;
  }
  /** Whether a credential's own claim belongs to this store's region. */
  matchesRegion(credential) {
    return this.region === void 0 || regionOfCredential(credential) === this.region;
  }
  /**
   * The path this store refreshes into: the per-region file for a
   * region-scoped store, the legacy single file otherwise, or an explicitly
   * injected path in tests.
   */
  ownAuthPath() {
    if (this.ownPathExplicit !== void 0) return this.ownPathExplicit;
    return this.region !== void 0 ? traeOwnAuthPath(this.region) : this.legacyOwnPath;
  }
  /**
   * Every plugin-owned copy to read, most preferred first. A region-scoped
   * store reads the legacy single copy as its migration source (readAll's
   * region filter drops it when it carries the other region's credential); an
   * unscoped store reads everything so diagnostics see both regions.
   *
   * With an explicitly injected own path the legacy source is read ONLY when
   * it was injected too — a test that pins one file must not accidentally see
   * the real machine's legacy copy.
   */
  ownCandidates() {
    if (this.ownPathExplicit !== void 0) {
      return this.legacyOwnPathExplicit !== void 0 ? [this.ownPathExplicit, this.legacyOwnPathExplicit] : [this.ownPathExplicit];
    }
    if (this.region !== void 0) {
      return [traeOwnAuthPath(this.region), this.legacyOwnPath];
    }
    return [this.legacyOwnPath, traeOwnAuthPath("cn"), traeOwnAuthPath("ai")];
  }
  setSource(storagePath, edition = "auto", accountId) {
    this.storagePathOverride = storagePath;
    this.edition = edition;
    this.accountId = accountId;
    this.inflight = void 0;
  }
  selectAccount(accountId) {
    this.accountId = accountId;
    this.inflight = void 0;
  }
  candidates() {
    if (this.storagePathOverride !== void 0) {
      const edition = this.edition === "auto" ? "cn" : this.edition;
      return [
        { edition, path: this.storagePathOverride, source: "desktop" },
        { edition, path: this.storagePathOverride, source: "cli" }
      ];
    }
    const all = traeStorageCandidates();
    const cliEdition = "cn";
    return this.edition === "auto" ? all.filter((candidate) => candidate.source === "desktop" || candidate.edition === cliEdition) : all.filter((candidate) => candidate.edition === this.edition && (candidate.source === "desktop" || candidate.edition === cliEdition));
  }
  /**
   * Deterministic default when no account is explicitly selected: the account
   * the Trae desktop app is signed in to RIGHT NOW, else the first discovered
   * one. This is NOT credit-seeking — it never reorders accounts to find one
   * with general credits. The plugin bills exactly the account the user
   * selected, the app's current sign-in when nothing has been selected, and
   * only then the first account.
   *
   * The app's live sign-in outranks the plugin's own refreshed copies (issue
   * #29): after the user switches accounts in Trae, the desktop storage file
   * holds the NEW login while the plugin's copy of the old one still resolves,
   * so a bare `credentials[0]` kept defaulting to a sign-in the app has
   * abandoned — and `dsh-connect-workbuddy`, whose `preferred()` ranks the live
   * file first, followed the app instead. Ordering only: the VALUE behind an
   * account id is still whichever copy expires later (`readAll`), so a refresh
   * the plugin performed is never discarded by this preference.
   */
  preferred(credentials) {
    return credentials.find((credential) => credential.source === "desktop") ?? credentials[0];
  }
  /**
   * The account the Trae app is signed in to right now, when that differs from
   * the account this store is bound to (issue #29).
   *
   * This is a READ, not a rebind: `current()` keeps resolving the bound
   * account verbatim so billing never moves without a decision — the store
   * only reports the mismatch, and the card (hint row) or the host (follow
   * switch) turns it into a settings write the user can see and undo. Absent
   * when nothing is live, when the live account IS the bound one, or when the
   * binding itself already fell through to the live account.
   */
  async liveLogin() {
    if (this.accountId === void 0 || this.accountId === "") return void 0;
    const credentials = await this.readAll();
    const live = this.preferred(credentials);
    if (live === void 0) return void 0;
    const liveId = traeAccountId(live);
    if (liveId === this.accountId) return void 0;
    return {
      id: liveId,
      accountName: live.accountName ?? (live.userId || `${live.edition} account`),
      edition: live.edition,
      region: regionOfCredential(live),
      source: live.source,
      tokenExpiresAtMs: live.expiresAtMs,
      selected: false
    };
  }
  async accounts() {
    const credentials = await this.readAll();
    const selectedExists = this.accountId !== void 0 && credentials.some((credential) => traeAccountId(credential) === this.accountId);
    const defaultSelected = this.preferred(credentials);
    return credentials.map((credential) => ({
      id: traeAccountId(credential),
      accountName: credential.accountName ?? (credential.userId || `${credential.edition} account`),
      edition: credential.edition,
      region: regionOfCredential(credential),
      source: credential.source,
      tokenExpiresAtMs: credential.expiresAtMs,
      selected: selectedExists ? traeAccountId(credential) === this.accountId : credential === defaultSelected
    }));
  }
  async current() {
    const credentials = await this.readAll();
    if (this.accountId === void 0) return this.preferred(credentials);
    const selected = credentials.find((credential) => traeAccountId(credential) === this.accountId);
    return selected;
  }
  /**
   * The stored credential of one specific account, without changing which
   * account this store is bound to (issue #25).
   *
   * The card needs to answer "the account I am bound to has run out of credits
   * — is another account on this machine usable?" and {@link resolve} cannot
   * help: it always returns the BOUND account, and switching the bound account
   * just to read one number would race every in-flight chat request sharing
   * this store, and would persist a selection the user never made.
   *
   * So this is a pure lookup: read-only, no refresh side effects (a stale token
   * is returned as-is and the caller's request then fails honestly), and
   * `accountId` is left untouched. An unknown id yields undefined rather than a
   * fallback, for the same reason {@link current} refuses to fall back.
   */
  async credentialOf(accountId) {
    if (accountId === "") return void 0;
    const credentials = await this.readAll();
    return credentials.find((credential) => traeAccountId(credential) === accountId);
  }
  async resolve() {
    const credential = await this.current();
    if (credential === void 0) throw new Error(`trae: no signed-in account found (${this.candidates().map((item) => item.path).join(" or ")})`);
    if (credential.expiresAtMs > Date.now() + this.refreshMarginMs) return credential;
    this.inflight ??= this.refreshNow(credential).finally(() => {
      this.inflight = void 0;
    });
    return this.inflight;
  }
  async status() {
    try {
      const value = await this.current();
      return value === void 0 ? { state: "signed-out" } : { state: "signed-in", edition: value.edition, expiresAtMs: value.expiresAtMs, source: value.source };
    } catch {
      return { state: "signed-out" };
    }
  }
  async desktopFilePresent() {
    for (const candidate of this.candidates()) {
      try {
        if ((await stat(candidate.path)).isFile()) return true;
      } catch {
      }
    }
    return false;
  }
  /**
   * Remove every plugin-owned copy this store could read (per-region file,
   * legacy single file, and their lock siblings); the desktop storage files
   * are untouched. A region store's logout therefore also clears the legacy
   * migration source — deliberate: `logout` is the user's "forget what the
   * plugin stored" action, not a per-account toggle.
   */
  async logout() {
    for (const path of this.ownCandidates()) {
      await rm2(path, { force: true });
      await rm2(`${path}.lock`, { force: true });
    }
  }
  /**
   * Every local credential of this store's region, deduplicated by account id.
   * A region-scoped store sees only its own region's credentials: the other
   * region's accounts are invisible to selection, refresh, and status alike,
   * which is what keeps the two regions' providers from cross-billing.
   */
  async readAll() {
    const { credentials: desktop } = await this.readDesktopAll();
    const byAccount = /* @__PURE__ */ new Map();
    const consider = (credential) => {
      if (!this.matchesRegion(credential)) return;
      const id = traeAccountId(credential);
      const incumbent = byAccount.get(id);
      if (incumbent === void 0 || credential.expiresAtMs > incumbent.expiresAtMs) byAccount.set(id, credential);
    };
    for (const credential of desktop) consider(credential);
    for (const own of await this.readOwns()) consider(own);
    return [...byAccount.values()];
  }
  /**
   * Which paths were tried and why each one failed. Read-only and token-free:
   * it exists so a signed-out card can explain itself instead of showing a bare
   * "not signed in", which is undiagnosable on a machine whose layout differs
   * from the ones the plugin was written against.
   */
  async diagnose() {
    const tried = this.candidates();
    const failures = [];
    for (const candidate of tried) {
      const raw = await readFile2(candidate.path, "utf8").then(
        (text) => ({ text }),
        (error) => ({ error })
      );
      if ("error" in raw) {
        const code = typeof raw.error === "object" && raw.error !== null && "code" in raw.error ? raw.error.code : void 0;
        failures.push({
          path: candidate.path,
          edition: candidate.edition,
          source: candidate.source,
          reason: code === "ENOENT" ? "missing" : "unreadable",
          ...code === "ENOENT" ? {} : { message: String(raw.error) }
        });
        continue;
      }
      try {
        this.credentialFrom(candidate, raw.text);
      } catch (error) {
        failures.push({
          path: candidate.path,
          edition: candidate.edition,
          source: candidate.source,
          reason: "invalid",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return { tried, failures };
  }
  /** Parse one candidate file's text into a credential, or throw. */
  credentialFrom(candidate, text) {
    let credential;
    if (candidate.source === "cli") {
      if (regionOfEdition(candidate.edition) !== "cn") {
        throw new Error(`Trae CLI tokens are only verified for the CN region; ${candidate.edition} CLI homes are not supported yet`);
      }
      const claims = parseTraeCliToken(text);
      credential = normalizeTraeCredential({
        token: claims.accessToken,
        userId: claims.userId,
        host: CLI_DEFAULT_HOST,
        expiredAt: claims.expiresAtMs
      }, candidate.edition, "cli");
    } else {
      credential = normalizeTraeCredential(parseTraeStorageDocument(text), candidate.edition, "desktop");
    }
    if (credential === void 0) throw new Error(`${candidate.source} candidate could not be normalized into a credential`);
    return credential;
  }
  async readDesktopAll() {
    const credentials = [];
    const failures = [];
    for (const candidate of this.candidates()) {
      try {
        const credential = this.credentialFrom(candidate, await readFile2(candidate.path, "utf8"));
        if (!credentials.some((existing) => traeAccountId(existing) === traeAccountId(credential))) credentials.push(credential);
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
        failures.push({
          path: candidate.path,
          edition: candidate.edition,
          source: candidate.source,
          reason: code === "ENOENT" ? "missing" : code === void 0 ? "invalid" : "unreadable",
          ...code === "ENOENT" || code === void 0 && !(error instanceof Error) ? {} : { message: error instanceof Error ? error.message : String(error) }
        });
        continue;
      }
    }
    return { credentials, failures };
  }
  /**
   * Every readable plugin-owned copy, in candidate order; absent or corrupt
   * files are skipped rather than propagated.
   */
  async readOwns() {
    const copies = [];
    for (const path of this.ownCandidates()) {
      try {
        const parsed = parseOwn(await readFile2(path, "utf8"));
        if (parsed !== void 0) copies.push(parsed);
      } catch {
      }
    }
    return copies;
  }
  async refreshNow(credential) {
    if (credential.refreshToken === void 0 || credential.refreshExpiresAtMs !== void 0 && credential.refreshExpiresAtMs <= Date.now()) {
      if (credential.expiresAtMs > Date.now() + 3e4) return credential;
      throw new Error("trae: access token expired and no valid refresh token is available; sign in again in Trae");
    }
    try {
      const outcome = await this.refresh(credential);
      const refreshed = {
        ...credential,
        accessToken: outcome.accessToken,
        ...outcome.refreshToken === void 0 ? {} : { refreshToken: outcome.refreshToken },
        expiresAtMs: outcome.expiresAtMs,
        ...outcome.refreshExpiresAtMs === void 0 ? {} : { refreshExpiresAtMs: outcome.refreshExpiresAtMs },
        ...outcome.host === void 0 ? {} : { host: outcome.host },
        source: "dsh"
      };
      const ownPath = this.ownAuthPath();
      await withFileLock2(ownPath, async () => {
        await writeFileAtomic2(ownPath, `${JSON.stringify({ version: OWN_VERSION, credential: refreshed }, null, 2)}
`, { mode: 384, dirMode: 448 });
      });
      return refreshed;
    } catch (error) {
      if (credential.expiresAtMs > Date.now() + 3e4) return credential;
      throw new Error(`trae: token refresh failed and access token is expired (${String(error)}); sign in again in Trae`);
    }
  }
};

// upstream/trae/src/identity.ts
import { createHash as createHash4 } from "node:crypto";
import { readFile as readFile3 } from "node:fs/promises";
import { dirname as dirname3, join as join5 } from "node:path";
import { cpus, homedir as homedir3, release as release2, userInfo } from "node:os";
function nonEmpty(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
function deviceCenterId(storage) {
  const prefix = "iCubeAuthInfo://icube-dc:";
  const ids = Object.keys(storage).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)).filter(Boolean);
  return ids.length === 1 ? ids[0] : void 0;
}
function deviceKeyPairOf(storage) {
  const key = Object.keys(storage).find((name) => name.startsWith("iCubeAuthInfo://icube-dc:"));
  if (key === void 0) return void 0;
  const encoded = storage[key];
  if (typeof encoded !== "string" || encoded.trim() === "") return void 0;
  try {
    const plaintext = parseTraeAuthValue(encoded);
    if (typeof plaintext !== "object" || plaintext === null || Array.isArray(plaintext)) return void 0;
    const value = plaintext;
    const privateKeyPEM = nonEmpty(value["privateKeyPEM"]);
    const publicKeyPEM = nonEmpty(value["publicKeyPEM"]);
    return privateKeyPEM === void 0 || publicKeyPEM === void 0 ? void 0 : { privateKeyPEM, publicKeyPEM };
  } catch {
    return void 0;
  }
}
async function readTraeIdentity(candidate, options = {}) {
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir3();
  const env = options.env ?? process.env;
  const storage = JSON.parse(await readFile3(candidate.path, "utf8"));
  const appRoot = dirname3(dirname3(dirname3(candidate.path)));
  const machineFile = nonEmpty(await readFile3(join5(appRoot, "machineid"), "utf8").catch(() => ""));
  const telemetryMachine = nonEmpty(storage["telemetry.machineId"]);
  const devDevice = nonEmpty(storage["telemetry.devDeviceId"]);
  const dcDevice = deviceCenterId(storage);
  const machineId = telemetryMachine ?? machineFile;
  if (machineId === void 0) throw new Error(`Trae ${candidate.edition} has no stable machine identity`);
  const deviceId = dcDevice ?? devDevice ?? createHash4("sha256").update(machineId).digest("hex").slice(0, 32);
  const buildVersion = nonEmpty(storage["iCubeLastVersion"]);
  const APP_NAMES_BY_EDITION = {
    cn: "Trae CN",
    sg: "Trae",
    solo: "TRAE SOLO CN",
    "solo-sg": "TRAE SOLO"
  };
  const appName = APP_NAMES_BY_EDITION[candidate.edition];
  const productPaths = [];
  if (appName !== void 0 && (platform === "darwin" || platform === "win32")) {
    if (platform === "darwin") {
      productPaths.push(join5("/Applications", `${appName}.app`, "Contents", "Resources", "app", "product.json"));
    } else {
      const localRoots = [env.LOCALAPPDATA, join5(home, "AppData", "Local")].filter((value) => typeof value === "string" && value !== "").filter((value, index, all) => all.indexOf(value) === index);
      for (const root of localRoots) {
        for (const spelling of traeWindowsAppNames(candidate.edition)) {
          productPaths.push(join5(root, "Programs", spelling, "resources", "app", "product.json"));
        }
      }
    }
  }
  let product = {};
  for (const path of productPaths) {
    try {
      product = JSON.parse(await readFile3(path, "utf8"));
      break;
    } catch {
    }
  }
  const appVersion = nonEmpty(product["appVersion"]);
  const deviceBrand = platform === "darwin" ? nonEmpty(env["TRAE_DEVICE_BRAND"]) : void 0;
  const deviceCpu = cpus()[0]?.model.split(" ")[0];
  const osVersion = `${platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : platform} ${release2()}`;
  const deviceName = (() => {
    try {
      return nonEmpty(userInfo().username);
    } catch {
      return void 0;
    }
  })();
  const deviceModel = nonEmpty(env["TRAE_DEVICE_MODEL"]);
  const deviceKeyPair = deviceKeyPairOf(storage);
  return {
    edition: candidate.edition,
    machineId,
    deviceId,
    ...appVersion === void 0 ? {} : { appVersion },
    ...buildVersion === void 0 ? {} : { buildVersion },
    ...deviceBrand === void 0 ? {} : { deviceBrand },
    ...deviceCpu === void 0 ? {} : { deviceCpu },
    ...deviceName === void 0 ? {} : { deviceName },
    ...deviceModel === void 0 ? {} : { deviceModel },
    ...deviceKeyPair === void 0 ? {} : { deviceKeyPair },
    osVersion,
    platform
  };
}
function identityHeaders(identity) {
  return {
    "x-machine-id": identity.machineId,
    "x-device-id": identity.deviceId,
    "x-device-type": identity.platform === "darwin" ? "mac" : identity.platform === "win32" ? "windows" : identity.platform,
    ...identity.deviceBrand === void 0 ? {} : { "x-device-brand": identity.deviceBrand },
    ...identity.deviceCpu === void 0 ? {} : { "x-device-cpu": identity.deviceCpu },
    ...identity.osVersion === void 0 ? {} : { "x-os-version": identity.osVersion },
    ...identity.appVersion === void 0 ? {} : { "x-app-version": identity.appVersion, "x-ide-version": identity.appVersion },
    ...identity.buildVersion === void 0 ? {} : { "x-app-version-code": identity.buildVersion, "x-ide-version-code": identity.buildVersion },
    "x-ide-version-type": "stable"
  };
}

export {
  WORKBUDDY_VARIANTS,
  atRestKeyProviderFor,
  WorkBuddyCredentialStore,
  traeStorageCandidates,
  traeAccountId,
  TraeCredentialStore,
  readTraeIdentity,
  identityHeaders
};
//# sourceMappingURL=chunk-FTM7RHQV.js.map
