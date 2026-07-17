import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vitest", "run", "src/test/cinematic-rendering.test.tsx", "src/test/galaxy-map.test.tsx"], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
