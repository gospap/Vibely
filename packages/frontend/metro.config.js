// Two resolver shortcuts, both there to keep the dev bundle small enough that
// Expo Go finishes downloading it before it gives up.

const { getDefaultConfig } = require("expo/metro-config");
const fs = require("node:fs");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// lucide-react-native exports only "." and "./icons", and both are barrels over
// all 1712 icons. We use ~64, so the screens import the per-icon modules under
// dist/esm/icons directly. Metro finds those on its own through the fallback it
// uses for paths missing from "exports", but warns once per icon on every cold
// start. Resolving them here skips the lookup and the 64 lines of noise.
const LUCIDE_ICONS = "lucide-react-native/dist/esm/icons/";
const lucideIconsDir = path.resolve(
  path.dirname(require.resolve("lucide-react-native")),
  "../esm/icons",
);

// See scripts/stubs/react-native-svg-css.js.
const SVG_CSS = "react-native-svg/css";
const svgCssStub = path.resolve(
  __dirname,
  "scripts/stubs/react-native-svg-css.js",
);

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(LUCIDE_ICONS)) {
    const filePath = path.join(
      lucideIconsDir,
      `${moduleName.slice(LUCIDE_ICONS.length)}.mjs`,
    );

    // Fall through if a lucide upgrade ever moves these: a warning beats a
    // resolution error.
    if (fs.existsSync(filePath)) {
      return { type: "sourceFile", filePath };
    }
  }

  if (moduleName === SVG_CSS) {
    return { type: "sourceFile", filePath: svgCssStub };
  }

  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
