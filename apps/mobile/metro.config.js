const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

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

// THE actual fix for "Component auth has not been registered yet":
// Modern Firebase package.json has an `exports` field. When `exports` is
// present, Node/Metro IGNORES the legacy `react-native`/`browser`/`main`
// fields and instead matches conditions inside `exports`.  Expo Metro ships
// with `unstable_conditionNames = []`, so no conditions match and resolution
// falls through to the `default` key — which for @firebase/auth points at
// `dist/esm2017/index.js` (a browser build that does NOT call registerAuth()
// at module-load time).  Without that side effect, the auth component never
// joins @firebase/app's component registry, so `initializeAuth` fails.
//
// Adding `react-native` here makes Metro resolve @firebase/auth to
// `dist/rn/index.js` — the React Native build that DOES register the auth
// component on import.  `require` is included so CJS-style conditions still
// match for any other package using the same exports pattern.
config.resolver.unstable_conditionNames = ["require", "react-native"];

// pnpm creates multiple physical copies of @firebase/* packages (one per
// peer-dep combination — e.g. apps/mobile pulls in @react-native-async-storage,
// apps/web does not, so the two firebase peer-dep contexts get separate
// @firebase/auth installs).  Without intervention, Metro can load the same
// @firebase/auth twice from different paths; only one of those copies runs the
// `registerAuth` side effect for THIS app's @firebase/app, so the auth component
// is missing from the registry and `initializeAuth` throws "Component auth has
// not been registered yet".
//
// Fix: for every firebase/@firebase resolution, force resolution from the app
// root (so node_modules walking always goes through apps/mobile's own pnpm
// context) AND realpath the result (so any remaining symlink ambiguity
// collapses to a single canonical file path — Metro keys modules by path).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isFirebase =
    moduleName === "firebase" ||
    moduleName.startsWith("firebase/") ||
    moduleName.startsWith("@firebase/");

  if (isFirebase) {
    const resolved = context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, "index.js") },
      moduleName,
      platform
    );
    if (resolved && resolved.type === "sourceFile" && resolved.filePath) {
      try {
        const realPath = fs.realpathSync(resolved.filePath);
        if (realPath !== resolved.filePath) {
          return { ...resolved, filePath: realPath };
        }
      } catch {
        // realpath may fail on non-symlinked paths — fall through to the resolved value
      }
    }
    return resolved;
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
