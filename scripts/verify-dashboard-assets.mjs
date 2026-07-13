import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const registryPath = path.join(projectRoot, "src/lib/canonical-runtime/dashboard-art.ts");
const publicRoot = path.join(projectRoot, "public");
const distRoot = path.join(projectRoot, "dist");
const vercelPath = path.join(projectRoot, "vercel.json");
const validExtensions = new Set([".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"]);
const liveBaseUrl = process.env.DASHBOARD_ASSET_BASE_URL?.replace(/\/$/, "");
const summaryOnly = process.env.DASHBOARD_ASSET_REPORT === "summary";

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function registryEntries() {
  const source = readText(registryPath);
  const entries = [];
  const entryPattern = /\n\s{2}([a-zA-Z0-9_]+):\s\{([\s\S]*?)\n\s{2}\}/g;
  let match;

  while ((match = entryPattern.exec(source))) {
    const [, registryKey, body] = match;
    const key = body.match(/key:\s"([^"]+)"/)?.[1] ?? registryKey;
    const localPath = body.match(/localPath:\s"([^"]+)"/)?.[1];
    const sourceStatus = body.match(/sourceStatus:\s"([^"]+)"/)?.[1] ?? "unknown";

    if (localPath) {
      entries.push({ key, localPath, sourceStatus });
    }
  }

  return entries;
}

function findCaseSensitivePath(root, publicUrl) {
  const relative = publicUrl.replace(/^\//, "");
  const parts = relative.split("/");
  let current = root;
  const physicalParts = [];

  for (const part of parts) {
    if (!existsSync(current) || !statSync(current).isDirectory()) {
      return { exists: false, caseMismatch: false, physicalFile: path.join(root, ...physicalParts, part) };
    }

    const names = readdirSync(current);
    if (names.includes(part)) {
      physicalParts.push(part);
      current = path.join(current, part);
      continue;
    }

    const caseInsensitive = names.find((name) => name.toLowerCase() === part.toLowerCase());
    if (caseInsensitive) {
      physicalParts.push(caseInsensitive);
      return {
        exists: false,
        caseMismatch: true,
        physicalFile: path.join(root, ...physicalParts),
        actualName: caseInsensitive
      };
    }

    return { exists: false, caseMismatch: false, physicalFile: path.join(root, ...physicalParts, part) };
  }

  return { exists: existsSync(current), caseMismatch: false, physicalFile: current };
}

function rewriteWouldSwallow(staticPath) {
  if (!existsSync(vercelPath)) return true;
  const vercel = JSON.parse(readText(vercelPath));
  const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];

  return rewrites.some((rewrite) => {
    if (rewrite.destination !== "/index.html" || typeof rewrite.source !== "string") return false;
    const pattern = new RegExp(`^${rewrite.source}$`);
    return pattern.test(staticPath);
  });
}

function duplicatePaths(entries) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.localPath, (counts.get(entry.localPath) ?? 0) + 1);
  }
  return counts;
}

async function checkLive(entry) {
  if (!liveBaseUrl) return undefined;

  const finalUrl = `${liveBaseUrl}${entry.localPath}`;

  try {
    const headerText = execFileSync("curl", ["-sS", "-I", "--max-time", "20", finalUrl], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    const headerLines = headerText.split(/\r?\n/).filter(Boolean);
    const statusLine = headerLines.find((line) => line.startsWith("HTTP/")) ?? "";
    const status = Number(statusLine.match(/\s(\d{3})\s?/)?.[1] ?? 0);
    const headers = new Map(
      headerLines
        .filter((line) => line.includes(":"))
        .map((line) => {
          const index = line.indexOf(":");
          return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
        })
    );
    const contentType = headers.get("content-type") ?? "";
    const contentLength = headers.get("content-length") ?? "";
    const location = headers.get("location") ?? "";

    return {
      url: finalUrl,
      status,
      contentType,
      contentLength,
      location,
      isImage: contentType.startsWith("image/"),
      isHtml: contentType.includes("text/html"),
      isVercelSso: status >= 300 && status < 400 && location.includes("vercel.com/sso-api")
    };
  } catch (error) {
    return {
      url: finalUrl,
      status: "fetch-failed",
      contentType: "",
      contentLength: "",
      location: "",
      isImage: false,
      isHtml: false,
      isVercelSso: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function verify() {
  const entries = registryEntries();
  const counts = duplicatePaths(entries);
  const report = await Promise.all(entries.map(async (entry) => {
    const publicCheck = findCaseSensitivePath(publicRoot, entry.localPath);
    const distCheck = existsSync(distRoot) ? findCaseSensitivePath(distRoot, entry.localPath) : undefined;
    const extension = path.extname(entry.localPath).toLowerCase();
    const live = await checkLive(entry);

    return {
      registryKey: entry.key,
      expectedUrl: entry.localPath,
      physicalFile: publicCheck.physicalFile,
      exists: publicCheck.exists,
      caseMismatch: publicCheck.caseMismatch,
      duplicate: (counts.get(entry.localPath) ?? 0) > 1,
      invalidExtension: !validExtensions.has(extension),
      malformedUrl:
        !entry.localPath.startsWith("/roblox-assets/") ||
        entry.localPath.startsWith("/public/") ||
        entry.localPath.includes("/Users/") ||
        entry.localPath.startsWith("./") ||
        entry.localPath.startsWith("../"),
      vercelRewriteSwallows: rewriteWouldSwallow(entry.localPath),
      distExists: distCheck?.exists,
      distCaseMismatch: distCheck?.caseMismatch,
      liveStatus: live?.status,
      liveContentType: live?.contentType,
      liveContentLength: live?.contentLength,
      liveFinalUrl: live?.url,
      liveLocation: live?.location,
      liveIsImage: live?.isImage,
      liveIsHtml: live?.isHtml,
      liveIsVercelSso: live?.isVercelSso
    };
  }));

  const failures = report.filter((entry) => {
    const distFailure = existsSync(distRoot) && (entry.distExists === false || entry.distCaseMismatch === true);
    const liveFailure = liveBaseUrl && (entry.liveStatus !== 200 || !entry.liveIsImage);
    return !entry.exists || entry.caseMismatch || entry.invalidExtension || entry.malformedUrl || entry.vercelRewriteSwallows || distFailure || liveFailure;
  });

  console.log(JSON.stringify({
    ok: failures.length === 0,
    checked: report.length,
    liveBaseUrl: liveBaseUrl ?? null,
    failureCount: failures.length,
    failures: summaryOnly ? failures.slice(0, 10) : failures,
    report: summaryOnly ? undefined : report
  }, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  }
}

void verify();
