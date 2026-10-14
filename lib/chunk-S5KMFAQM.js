// upstream/trae/src/region.ts
var REGION_GATEWAYS = {
  cn: {
    chat: "https://trae-api-cn.mchost.guru",
    remote: "https://solo.trae.cn/api/remote/v1",
    pay: "https://api.trae.cn"
  },
  ai: {
    chat: "https://coresg-normal.trae.ai",
    remote: "https://coresg-normal.trae.ai/api/remote/v1",
    pay: "https://growsg-normal.trae.ai"
  }
};
function regionOfEdition(edition) {
  return edition === "sg" || edition === "solo-sg" ? "ai" : "cn";
}
function regionOfUserRegion(value) {
  const raw = typeof value === "object" && value !== null && !Array.isArray(value) ? value["region"] : value;
  if (typeof raw !== "string") return void 0;
  const lowered = raw.trim().toLowerCase();
  if (lowered === "cn") return "cn";
  if (lowered === "sg" || lowered === "ai") return "ai";
  return void 0;
}
function regionOfHost(host) {
  if (host === void 0) return void 0;
  const trimmed = host.trim();
  if (trimmed === "") return void 0;
  let hostname;
  try {
    hostname = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return void 0;
  }
  if (hostname === "trae.ai" || hostname.endsWith(".trae.ai")) return "ai";
  if (hostname === "trae.cn" || hostname.endsWith(".trae.cn") || hostname.endsWith(".trae.com.cn")) return "cn";
  return void 0;
}
function regionOfCredential(credential) {
  return regionOfUserRegion(credential.userRegion) ?? regionOfHost(credential.host) ?? regionOfEdition(credential.edition);
}

export {
  REGION_GATEWAYS,
  regionOfEdition,
  regionOfUserRegion,
  regionOfHost,
  regionOfCredential
};
//# sourceMappingURL=chunk-S5KMFAQM.js.map
