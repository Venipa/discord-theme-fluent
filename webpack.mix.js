const mix = require("laravel-mix");

const { BannerPlugin } = require("webpack");
const path = require("path");
const pkg = require("./package.json");
const { readFileSync } = require("fs");
const { get: getValue } = require("lodash");

const isDev = !mix.inProduction();
const baseContent = readFileSync("./src/banner.template").toString();
mix.disableNotifications();
const replaceVariables = (source, obj) => {
  let newSource = String(source);
  const varNames = newSource
    .match(/{{((\w+|\.)+)}}/g)
    .map((x) => x.substring(2, x.length - 2));
  varNames.forEach((name) => {
    newSource = newSource.split(`{{${name}}}`).join(getValue(obj, name));
  });
  return newSource;
};
let varContext = {
  ...pkg,
  name: pkg.displayName || pkg.name,
  version: isDev
    ? pkg.version + "-" + (Date.now() / 1000).toFixed()
    : pkg.version,
};
const getBanner = () => replaceVariables(baseContent, varContext);
let bannerContent = getBanner();
if (isDev)
  mix.before(async () => {
    varContext.version = pkg.version + "-" + (Date.now() / 1000).toFixed();

    bannerContent = getBanner();
  });

mix.setPublicPath(
  isDev ? path.resolve(process.env.APPDATA, "BetterDiscord/themes/") : "dist"
);
// mix.setPublicPath("dist");
mix.webpackConfig({
  plugins: [
    new BannerPlugin({
      banner: () => bannerContent,
      raw: true,
    }),
  ],
});
mix.extend("sassVariables", (webpackConfig) => {
  if (webpackConfig.module.rules)
    webpackConfig.module.rules.push({
      test: /\.scss$/,
      loader: "string-replace-loader",
      options: {
        search: /{{((\w+|\.)+)}}/g,
        replace: (match, name, offset, string) => {
          const val = getValue(varContext, name);
          console.log(`Replace "${name}" with "${val}".`);
          return val;
        },
      },
    });
});
mix.options({
  terser: {
    extractComments: {
      condition: true,
      filename: ({ filename }) => {
        return filename;
      },
      banner: () => bannerContent,
    },
  },
});
const filename = `${pkg.name}.theme.css`;
mix.sass("src/theme.scss", filename).sassVariables();
