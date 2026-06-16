// Bundles the backend into a single self-contained dist/index.js.
//
// Why bundle: this is a pnpm monorepo and the backend imports the workspace
// package @mediguard/shared, which ships raw TypeScript (main: src/index.ts).
// A plain `tsc` + `node dist/index.js` would fail at runtime trying to require a
// .ts file. esbuild inlines @mediguard/* into the output, while real npm
// dependencies (express, firebase-admin, …) stay external and are resolved from
// node_modules at runtime — keeping the bundle small and avoiding native-module
// bundling issues (firebase-admin in particular must not be bundled).

import { build } from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

// Everything in dependencies stays external EXCEPT the workspace packages,
// which we want inlined so the artifact has no workspace runtime dependency.
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (dep) => !dep.startsWith("@mediguard/"),
);

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/index.js",
  external,
  logLevel: "info",
}).catch(() => process.exit(1));
