// Stands in for react-native-svg/css, which metro.config.js aliases here.
//
// Nothing in this app imports it. It only reaches the bundle because
// react-native-qrcode-svg statically imports LocalSvg for its <QRCode logoSVG>
// prop, which we never pass — and that import drags css-tree plus mdn-data's
// CSS definition tables along, about 670 KB across every bundle we build.
//
// Everything here throws instead of failing quietly, so if the SVG-logo path
// (or SvgCss, or inlineStyles) ever does get used, it says exactly why.
// Deleting the alias in metro.config.js brings the real module back.

const stub = (name) => () => {
  throw new Error(
    `${name} comes from react-native-svg/css, which is stubbed out in ` +
      "metro.config.js to keep css-tree and mdn-data out of the bundle. " +
      "Remove that alias if this app now needs it.",
  );
};

export const SvgCss = stub("SvgCss");
export const SvgCssUri = stub("SvgCssUri");
export const SvgWithCss = stub("SvgWithCss");
export const SvgWithCssUri = stub("SvgWithCssUri");
export const inlineStyles = stub("inlineStyles");
export const LocalSvg = stub("LocalSvg");
export const WithLocalSvg = stub("WithLocalSvg");
export const loadLocalRawResource = stub("loadLocalRawResource");
