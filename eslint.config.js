// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	js.configs.recommended,
	tseslint.configs.strict,
	tseslint.configs.stylistic,
	{
		rules: {
			// Note: you must disable the base rule as it can report incorrect errors
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"prefer-const": [
				"warn",
				{
					destructuring: "any",
					ignoreReadBeforeAssign: false,
				},
			],
		},
	},
);
