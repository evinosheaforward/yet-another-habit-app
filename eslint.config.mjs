import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.expo/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
    ],
  },
  {
    files: [
      "**/*.cjs",
      "**/*.js",
      "**/*.mjs",
      "**/knexfile.*",
      "**/*.config.*",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
