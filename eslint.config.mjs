import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Keep existing quality rules, but disable React compiler-only rules that
      // currently block the migration baseline. These will be re-enabled
      // incrementally as components are refactored.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Generated / build artifacts
    "electron/dist/**",
    "electron-dist/**",
    "agent/dist/**",
    "src/generated/**",

    // External dependencies accidentally present in repo
    "agent/node_modules/**",

    // Standalone node scripts / infra lambdas that intentionally use CJS style
    "scripts/**/*.js",
    "infra/lambda/**/*.js",

    // Public service worker (generated / browser-global script)
    "public/sw.js",
  ]),
]);

export default eslintConfig;
