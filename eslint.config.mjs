import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules } from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([
    globalIgnores([
        "**/.vite/**",
        "**/dist/",
        "**/build/",
        "**/node_modules/",
        "**/public/",
        "**/coverage/",
        "**/mujoco_menagerie/",
        "**/scratch/",
        "packages/robot_trainer/src/mujoco/",
        "packages/robot_trainer/src/lib/jsmpeg.min.js",
        "packages/robot_trainer/scripts/",
    ]),
    {
        extends: fixupConfigRules(compat.extends(
            "eslint:recommended",
            "plugin:@typescript-eslint/eslint-recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:import/recommended",
            "plugin:import/electron",
            "plugin:import/typescript",
        )),

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parser: tsParser,
        },

        settings: {
            "import/resolver": {
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },

        rules: {
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
        },
    },
    // Relax no-explicit-any for imported lerobot library packages
    {
        files: ["packages/lerobot_js_web/**/*.ts", "packages/lerobot_js_node/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
]);
