import {
  TraeCredentialStore,
  WORKBUDDY_VARIANTS,
  WorkBuddyCredentialStore,
  atRestKeyProviderFor,
  readTraeIdentity,
  traeStorageCandidates
} from "./chunk-OK2T2UAZ.js";
import {
  regionOfCredential
} from "./chunk-S5KMFAQM.js";
import {
  PROVIDERS,
  writePrivateJson
} from "./chunk-NGVWVIBM.js";

// src/accounts.mjs
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
var localKeyProviders = /* @__PURE__ */ new Map();
var localAccountKey = (provider, document) => JSON.stringify([
  provider,
  document.credential?.uid || document.credential?.userId,
  document.credential?.enterpriseId || "",
  provider.startsWith("trae") ? "" : document.credential?.edition || ""
]);
function normalizeLocalAccountKey(key) {
  try {
    const parts = JSON.parse(key);
    if (Array.isArray(parts) && parts.length === 4 && ["trae", "trae-global"].includes(parts[0])) {
      parts[3] = "";
      return JSON.stringify(parts);
    }
  } catch {
  }
  return key;
}
async function discoverLocalAccounts(provider) {
  const accounts = [], status = [];
  for (const variant of WORKBUDDY_VARIANTS.filter((v) => !provider || v.id === provider)) {
    try {
      if (!localKeyProviders.has(variant.id)) localKeyProviders.set(variant.id, atRestKeyProviderFor(variant));
      const store = new WorkBuddyCredentialStore({
        variant,
        ownPath: join(tmpdir(), `dsh-router-scan-${randomBytes(16).toString("hex")}.json`),
        keyProvider: localKeyProviders.get(variant.id),
        refresh: async () => {
          throw new Error("Discovery cannot refresh");
        }
      });
      const credential = await store.current();
      if (credential) accounts.push({ provider: variant.id, document: { version: 1, credential } });
      status.push({ provider: variant.id, state: credential ? "found" : "not-found" });
    } catch (e) {
      status.push({ provider: variant.id, state: "unreadable", code: e.code || "credential_unreadable" });
    }
  }
  for (const id of ["trae", "trae-global"].filter((id2) => !provider || id2 === provider)) {
    let found = false, unreadable = false;
    for (const candidate of traeStorageCandidates().filter((c) => c.source === "desktop" && (id === "trae" ? ["cn", "solo"] : ["sg", "solo-sg"]).includes(c.edition))) {
      try {
        await readFile(candidate.path, "utf8");
        const store = new TraeCredentialStore({
          storagePath: candidate.path,
          edition: candidate.edition,
          region: id === "trae" ? "cn" : "ai",
          ownPath: `${candidate.path}.dsh-router-no-owned-credential`,
          legacyOwnPath: `${candidate.path}.dsh-router-no-legacy`,
          refresh: async () => {
            throw new Error("Discovery cannot refresh");
          }
        });
        const credential = await store.current();
        if (!credential) {
          const diagnostic = await store.diagnose();
          unreadable ||= diagnostic.failures.some((f) => f.reason !== "missing");
          continue;
        }
        if (regionOfCredential(credential) === "ai" !== (id === "trae-global")) continue;
        const identityDocument = await readTraeIdentity(candidate);
        accounts.push({ provider: id, document: { version: 1, credential }, identityDocument });
        found = true;
      } catch (e) {
        if (e.code !== "ENOENT") unreadable = true;
      }
    }
    status.push({ provider: id, state: found ? "found" : unreadable ? "unreadable" : "not-found" });
  }
  const identities = /* @__PURE__ */ new Map();
  for (const item of accounts) {
    const key = localAccountKey(item.provider, item.document), previous = identities.get(key);
    if (!previous || item.document.credential.expiresAtMs > previous.document.credential.expiresAtMs) identities.set(key, item);
  }
  return { accounts: [...identities.values()], status };
}
var pick = (value, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(value ?? {}, k)).map((k) => [k, value[k]]));
async function readPortableCredential(account) {
  const raw = JSON.parse(await readFile(account.credentialFile, "utf8"));
  if (account.provider.startsWith("qoder")) return raw.pat ? { document: pick(raw, ["version", "pat", "region"]) } : null;
  if (!raw.credential?.accessToken) return null;
  const document = { version: 1, credential: pick(raw.credential, ["accessToken", "refreshToken", "expiresAtMs", "refreshExpiresAtMs", "uid", "nickname", "enterpriseId", "domain", "userId", "accountName", "edition", "userRegion", "host"]) };
  const identity = account.provider.startsWith("trae") ? pick(JSON.parse(await readFile(account.identityFile, "utf8")), ["machineId", "deviceId", "edition"]) : void 0;
  if (identity && (!identity.machineId || !identity.deviceId || identity.edition !== raw.credential.edition)) throw new Error("Trae identity is incomplete");
  return { document, identity };
}
async function importAccount({ provider, source, credentialFile, identityFile, edition, identitySource, document, identityDocument }) {
  if (!PROVIDERS.includes(provider)) throw new Error("Unknown provider");
  const inline = document !== void 0;
  const raw = inline ? JSON.stringify(document) : await readFile(source, "utf8");
  if (!inline) try {
    document = JSON.parse(raw);
  } catch {
  }
  if (document?.format === "dsh-multi-router-account" && document.provider !== provider) throw new Error("Portable credential provider does not match selected provider");
  const text = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 32768;
  if (provider.startsWith("workbuddy")) {
    let credential;
    if (document?.version === 1 && document.credential) credential = document.credential;
    else if (inline) credential = document;
    else {
      const variant = WORKBUDDY_VARIANTS.find((v) => v.id === provider);
      const store = new WorkBuddyCredentialStore({
        desktopPath: source,
        ownPath: `${credentialFile}.import-empty`,
        variant,
        keyProvider: atRestKeyProviderFor(variant),
        refresh: async () => {
          throw new Error("Import cannot refresh");
        }
      });
      credential = await store.current();
    }
    if (!text(credential?.accessToken) || !text(credential.uid) || !Number.isFinite(credential.expiresAtMs) || credential.expiresAtMs <= 0 || typeof credential.domain !== "string" || /[\r\n]/.test(credential.domain)) throw new Error("No valid WorkBuddy credential in source");
    const { regionOf } = await import("./upstream-42RS7F4H.js");
    if (regionOf(credential.domain) === "global" !== (provider === "workbuddy-ai")) throw new Error("WorkBuddy credential region does not match provider");
    await writePrivateJson(credentialFile, { version: 1, credential: { ...credential, source: "dsh" } });
  } else if (provider.startsWith("trae")) {
    let credential;
    if (document?.version === 1 && document.credential) credential = document.credential;
    else if (inline) credential = document;
    else {
      if (!["cn", "sg", "solo", "solo-sg"].includes(edition)) throw new Error("Trae desktop import needs --edition cn|sg|solo|solo-sg");
      const store = new TraeCredentialStore({
        storagePath: source,
        edition,
        ownPath: `${credentialFile}.import-empty`,
        legacyOwnPath: `${credentialFile}.no-legacy`,
        region: provider === "trae" ? "cn" : "ai",
        refresh: async () => {
          throw new Error("Import cannot refresh");
        }
      });
      credential = await store.current();
    }
    if (!text(credential?.accessToken) || !text(credential.userId) || !Number.isFinite(credential.expiresAtMs) || credential.expiresAtMs <= 0 || !["cn", "sg", "solo", "solo-sg"].includes(credential.edition)) throw new Error("No valid Trae credential in source");
    const { regionOfCredential: regionOfCredential2, regionOfHost } = await import("./region-DO3KAV7V.js");
    if (credential.host && !regionOfHost(credential.host)) throw new Error("Invalid Trae credential host");
    if (regionOfCredential2(credential) === "ai" !== (provider === "trae-global")) throw new Error("Trae credential region does not match provider");
    const identity = identityDocument ?? document?.identity ?? (identitySource ? JSON.parse(await readFile(identitySource, "utf8")) : source ? await readTraeIdentity({ edition: credential.edition, path: source, source: "desktop" }) : void 0);
    if (!text(identity?.machineId) || !text(identity.deviceId) || identity.edition !== credential.edition) throw new Error("Identity must belong to this Trae edition");
    await writePrivateJson(identityFile, identity);
    await writePrivateJson(credentialFile, { version: 1, credential: { ...credential, source: "dsh" } });
  } else {
    const region = provider === "qoder" ? "china" : "global";
    const pat = typeof document?.pat === "string" ? document.pat.trim() : raw.trim();
    if (!pat || document && typeof document.pat !== "string" || /\s/.test(pat)) throw new Error("Source must be a Qoder PAT text file or credential JSON");
    if (document?.region && document.region !== region) throw new Error("Qoder PAT region does not match provider");
    await writePrivateJson(credentialFile, { version: 2, pat, region, savedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
}

export {
  localAccountKey,
  normalizeLocalAccountKey,
  discoverLocalAccounts,
  readPortableCredential,
  importAccount
};
//# sourceMappingURL=chunk-VZPXRK7Q.js.map
