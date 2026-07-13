import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateGameRuntimeData } from "../src/lib/canonical-runtime/schema";

const DEFAULT_URL = "https://project-genesis-livid.vercel.app";
const DEFAULT_PATH = "/api/export/game-runtime-data.json";
const MIN_STUDIO_RUNTIME_CONTENT_VERSION = 5;
const outputPath = path.resolve(process.cwd(), "src/content/generated/studio-runtime.snapshot.json");

function endpoint() {
  const baseUrl = process.env.VITE_GENESIS_STUDIO_URL || DEFAULT_URL;
  const runtimePath = process.env.VITE_GENESIS_RUNTIME_PATH || DEFAULT_PATH;
  return `${baseUrl.replace(/\/$/, "")}${runtimePath.startsWith("/") ? runtimePath : `/${runtimePath}`}`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }

  return value;
}

async function readExistingSnapshot() {
  try {
    return await readFile(outputPath, "utf8");
  } catch {
    return null;
  }
}

async function run() {
  const url = endpoint();
  const previous = await readExistingSnapshot();
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Studio runtime request failed with HTTP ${response.status}. Existing snapshot was not overwritten.`);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Studio runtime returned malformed JSON. Existing snapshot was not overwritten.", { cause: error });
  }

  const validation = validateGameRuntimeData(payload);

  if (!validation.ok || !validation.payload) {
    throw new Error(`Studio runtime validation failed. Existing snapshot was not overwritten.\n${validation.errors.join("\n")}`);
  }

  if (validation.payload.metadata.contentVersion < MIN_STUDIO_RUNTIME_CONTENT_VERSION) {
    throw new Error(`Studio runtime contentVersion ${validation.payload.metadata.contentVersion} is older than required ${MIN_STUDIO_RUNTIME_CONTENT_VERSION}. Existing snapshot was not overwritten.`);
  }

  const sorted = `${JSON.stringify(sortValue(validation.payload), null, 2)}\n`;
  const tempPath = `${outputPath}.tmp`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(tempPath, sorted, "utf8");
  await rename(tempPath, outputPath);

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint: url,
        outputPath,
        previousBytes: previous?.length ?? 0,
        schemaVersion: validation.payload.metadata.schemaVersion,
        contentVersion: validation.payload.metadata.contentVersion,
        checksum: validation.payload.metadata.checksum,
        eras: validation.payload.eras.length,
        resources: validation.payload.resources.length,
        upgradeCategories: validation.payload.upgradeCategories.length,
        upgrades: validation.payload.upgrades.length,
        assets: validation.payload.assets.length,
        warnings: validation.warnings
      },
      null,
      2
    )
  );
}

void run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
