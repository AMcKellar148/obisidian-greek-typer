import { Editor, Notice } from "obsidian";
import type GreekTyperPlugin from "./main";
import { lookupWord, lookupTermFromEditor, pickDictionaryAndLookup } from "./lookup";
import { stripDiacritics } from "./transliterate";

/** Replace each non-empty selection with `transform(selectedText)`. */
function transformSelections(editor: Editor, transform: (text: string) => string): void {
	const selections = editor.listSelections().filter((s) => s.anchor.line !== s.head.line || s.anchor.ch !== s.head.ch);
	if (selections.length === 0) {
		new Notice("Select some text first.");
		return;
	}
	editor.transaction({
		changes: selections.map((s) => {
			const anchorFirst = s.anchor.line < s.head.line || (s.anchor.line === s.head.line && s.anchor.ch <= s.head.ch);
			const from = anchorFirst ? s.anchor : s.head;
			const to = anchorFirst ? s.head : s.anchor;
			return { from, to, text: transform(editor.getRange(from, to)) };
		}),
	});
}

// Command IDs are stable public API: never rename them.
export function registerCommands(plugin: GreekTyperPlugin): void {
	plugin.addCommand({
		id: "convert-to-greek",
		name: "Convert selection to Greek letters (no diacritics)",
		editorCallback: (editor) => transformSelections(editor, (text) => plugin.convert(text, false)),
	});

	plugin.addCommand({
		id: "convert-to-greek-diacritics",
		name: "Convert selection to polytonic Greek",
		editorCallback: (editor) => transformSelections(editor, (text) => plugin.convert(text, true)),
	});

	plugin.addCommand({
		id: "remove-diacritics",
		name: "Remove Greek diacritics from selection",
		editorCallback: (editor) => transformSelections(editor, stripDiacritics),
	});

	plugin.addCommand({
		id: "toggle-live-typing",
		name: "Toggle live typing",
		callback: async () => {
			await plugin.toggleLiveTyping();
			new Notice(`Greek live typing ${plugin.settings.isLiveTyping ? "on" : "off"}`);
		},
	});

	plugin.addCommand({
		id: "toggle-beta-code",
		name: "Switch between phonetic and Beta Code keys",
		callback: async () => {
			plugin.settings.useBetaCode = !plugin.settings.useBetaCode;
			await plugin.saveSettings();
			new Notice(`Using ${plugin.settings.useBetaCode ? "Beta Code" : "phonetic"} keys`);
		},
	});

	plugin.addCommand({
		id: "toggle-smart-h",
		name: "Toggle smart 'h' rough breathing",
		callback: async () => {
			plugin.settings.smartRoughBreathing = !plugin.settings.smartRoughBreathing;
			await plugin.saveSettings();
			new Notice(`Smart 'h' ${plugin.settings.smartRoughBreathing ? "on" : "off"}`);
		},
	});

	plugin.addCommand({
		id: "lookup-greek-word",
		name: "Look up word in dictionary",
		editorCallback: async (editor) => {
			const term = lookupTermFromEditor(editor);
			if (!term) {
				new Notice("Select a word or place the cursor on one.");
				return;
			}
			await lookupWord(plugin, term);
		},
	});

	plugin.addCommand({
		id: "lookup-greek-word-in",
		name: "Look up word in a chosen dictionary",
		editorCallback: (editor) => {
			const term = lookupTermFromEditor(editor);
			if (!term) {
				new Notice("Select a word or place the cursor on one.");
				return;
			}
			pickDictionaryAndLookup(plugin, term);
		},
	});

	plugin.addCommand({
		id: "open-typing-guide",
		name: "Open typing guide",
		callback: () => plugin.activateGuideView(),
	});
}
