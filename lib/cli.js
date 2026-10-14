#!/usr/bin/env node
import {
  createAccountClient
} from "./chunk-RKQGFPEZ.js";
import {
  importAccount
} from "./chunk-AAGTEDEF.js";
import "./chunk-WNRHV24A.js";
import "./chunk-S5KMFAQM.js";
import {
  Router
} from "./chunk-KKAUHR7Y.js";
import {
  DEFAULT_ROUTES,
  PROVIDERS,
  validateConfig,
  writePrivateJson
} from "./chunk-GTHSHK6D.js";
import "./chunk-TEZ2FMEO.js";

// src/cli.mjs
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { withFileLock } from "@deepseek-ai/dsh-atomic-write";
var { values, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries(
  ["config", "id", "provider", "source", "edition", "identity"].map((key) => [key, { type: "string" }])
) });
var file = resolve(values.config ?? process.env.DSH_MULTI_ROUTER_CONFIG ?? join(resolveDshHome(), "multi-router", "router.json"));
var [command] = positionals;
async function main() {
  if (command === "init") {
    await readFile(file).then(() => {
      throw new Error("Config already exists");
    }, (error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await writePrivateJson(file, { accounts: [], routes: DEFAULT_ROUTES });
    console.log(`Created ${file}`);
    return;
  }
  if (!["add", "remove", "enable", "disable", "status", "models"].includes(command)) {
    console.log("dsh-multi-router init|add|remove|enable|disable|status|models [--config /path/router.json]\nadd --id wb1 --provider workbuddy --source /path/auth-file\nTrae add: --edition solo; own credential JSON: --identity /path/identity.json\nremove|enable|disable|models: --id account-id\nProviders: " + PROVIDERS.join(", "));
    return;
  }
  const raw = JSON.parse(await readFile(file, "utf8"));
  let config = validateConfig(raw, file);
  if (command === "status") {
    console.log(JSON.stringify(new Router(config, () => {
    }).status(), null, 2));
    return;
  }
  if (command === "add") {
    const { id, provider, source } = values;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id ?? "") || !PROVIDERS.includes(provider) || !source) throw new Error("add needs valid --id, --provider and --source");
    if (raw.accounts.some((a) => a.id === id)) throw new Error("Account already exists; remove it before replacing");
    const dir = join(dirname(file), "accounts", id);
    const credentialFile = join(dir, "credential.json");
    const identityFile = join(dir, "identity.json");
    await importAccount({
      provider,
      source: resolve(source),
      credentialFile,
      identityFile,
      edition: values.edition,
      identitySource: values.identity ? resolve(values.identity) : void 0
    });
    raw.accounts.push({
      id,
      provider,
      credentialFile: relative(dirname(file), credentialFile),
      ...provider.startsWith("trae") ? { identityFile: relative(dirname(file), identityFile) } : {}
    });
    validateConfig(raw, file);
    await writePrivateJson(file, raw);
    console.log(`Added ${id} (${provider}). The running plugin applies changes automatically.`);
    return;
  }
  const account = config.accounts.find((a) => a.id === values.id);
  if (!account) throw new Error("Unknown --id");
  if (command === "models") {
    const client = await createAccountClient(account, config);
    console.log(JSON.stringify(await client.models(AbortSignal.timeout(6e4)), null, 2));
    return;
  }
  if (command === "remove") {
    raw.accounts = raw.accounts.filter((a) => a.id !== account.id);
    validateConfig(raw, file);
    await writePrivateJson(file, raw);
    console.log(`Removed ${account.id} from routing; credential files kept. Changes apply automatically.`);
    return;
  }
  raw.accounts.find((a) => a.id === account.id).enabled = command === "enable";
  await writePrivateJson(file, raw);
  console.log(`${command} ${account.id}. Changes apply automatically.`);
}
(["add", "remove", "enable", "disable"].includes(command) ? withFileLock(file, main, { waitMs: 3e4 }) : main()).catch((error) => {
  console.error(error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]") : "Command failed");
  process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map
