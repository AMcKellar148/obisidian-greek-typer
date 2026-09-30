import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import { PlainTextParser } from "eslint-plugin-obsidianmd/dist/lib/plainTextParser.js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["node_modules/", "main.js", "*.config.js", "*.config.mjs", "version-bump.mjs"]),
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"obsidianmd/ui/sentence-case": ["warn", {
				brands: ["Greek", "Greek Typer", "Beta Code", "Web viewer"],
			}],
		},
	},
	// The plugin's manifest and license checks run on these files directly.
	{
		files: ["manifest.json"],
		plugins: { obsidianmd },
		languageOptions: { parser: tseslint.parser, parserOptions: { projectService: false, project: null } },
		rules: { "obsidianmd/validate-manifest": "error" },
	},
	{
		files: ["LICENSE"],
		plugins: { obsidianmd },
		languageOptions: { parser: PlainTextParser },
		rules: { "obsidianmd/validate-license": "error" },
	},
	{
		files: ["tests/**/*.ts"],
		languageOptions: { globals: globals.jest },
	},
]);
