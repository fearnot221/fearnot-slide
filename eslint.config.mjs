import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      "**/.next*/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "**/next-env.d.ts",
    ],
  },
  {
    settings: { next: { rootDir: "apps/web/" } },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

config.push({
  files: ["packages/presentation-runtime/**/*.tsx"],
  rules: { "@next/next/no-html-link-for-pages": "off" },
});
export default config;
