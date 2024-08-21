// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        ignores: [
            "**/_godot_defs/**",
            "**/mockProject/**",
            "**/godot_src/**",
            "**/js/**",
            ".eslintrc.js",
            "tsconfig.json",
            "package.json",
            "package-lock.json",
        ],
        languageOptions: {
            ecmaVersion: 13,
        },
        rules: {
            "prettier/prettier": [
                "error",
                {
                    tabWidth: 4,
                },
            ],
            "prefer-const": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },
);
