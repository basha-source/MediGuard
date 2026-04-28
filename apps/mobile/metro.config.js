const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro watch the entire monorepo so workspace packages resolve correctly
config.watchFolders = [monorepoRoot];

// Look for modules in both the app's node_modules and the root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// pnpm uses symlinks — enable so Metro follows them into the virtual store
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
