import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vitest", "run", "src/test/planet-evaluation.test.ts", "src/test/galaxy-map.test.tsx"], {
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
