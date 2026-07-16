// craco.config.js
const path = require("path");
require("dotenv").config();

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Suppress missing source-map warning from html2pdf.js package.
      webpackConfig.module.rules.forEach((rule) => {
        if (rule.enforce === "pre" && rule.use) {
          const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
          const hasSourceMapLoader = uses.some((u) => {
            if (typeof u === "string") return u.includes("source-map-loader");
            return u && typeof u.loader === "string" && u.loader.includes("source-map-loader");
          });

          if (hasSourceMapLoader) {
            const excludeList = Array.isArray(rule.exclude)
              ? rule.exclude
              : rule.exclude
              ? [rule.exclude]
              : [];
            rule.exclude = [...excludeList, /html2pdf\.js/];
          }
        }
      });

      // Optional: Disable hot reload if env variable is set
      if (process.env.DISABLE_HOT_RELOAD === "true") {
        // Remove HMR plugin
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => plugin.constructor.name !== "HotModuleReplacementPlugin"
        );

        // Disable file watching completely
        webpackConfig.watch = false;
        webpackConfig.watchOptions = { ignored: /.*/ };
      } else {
        // Default watch ignore patterns
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            "**/node_modules/**",
            "**/.git/**",
            "**/build/**",
            "**/dist/**",
            "**/coverage/**"
          ]
        };
      }

      return webpackConfig;
    }
  }
};
