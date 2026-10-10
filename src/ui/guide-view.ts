import { ItemView, MarkdownView, Notice, WorkspaceLeaf } from "obsidian";
import type GreekTyperPlugin from "../main";
import { defaultKeyFor, GREEK_LETTERS } from "../keymaps";
import { transliterate } from "../transliterate";

export const GUIDE_VIEW_TYPE = "greek-typer-guide";

const DIACRITICS: Array<[key: string, name: string, example: string]> = [
	["/", "acute", "a/ → ά"],
	["\\", "grave", "a\\ → ὰ"],
	["=", "circumflex", "a= → ᾶ"],
	[")", "smooth breathing", "a) → ἀ"],
	["(", "rough breathing", "a( → ἁ"],
	["|", "iota subscript", "a| → ᾳ"],
	["+", "diaeresis", "i+ → ϊ"],
];

export class GuideView extends ItemView {
	private readonly plugin: GreekTyperPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GreekTyperPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return GUIDE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Greek typing guide";
	}

	getIcon(): string {
		return "omega";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const { settings } = this.plugin;
		const scheme = settings.useBetaCode ? "beta" : "phonetic";
		const el = this.contentEl;
		el.empty();
		el.addClass("greek-typer-guide");

		el.createEl("h4", { text: settings.useBetaCode ? "Beta Code keys" : "Phonetic keys" });
		el.createEl("p", { cls: "greek-typer-guide-hint", text: "Select a letter to insert it. Hold shift for a capital." });
		const letters = el.createDiv({ cls: "greek-typer-guide-letters" });
		const cells: Array<[letter: string, keys: string]> = GREEK_LETTERS.map((letter) => [
			letter,
			[defaultKeyFor(scheme, letter), settings.customKeys[letter]].filter(Boolean).join(" / "),
		]);
		cells.splice(cells.findIndex(([letter]) => letter === "σ") + 1, 0, ["ς", "final s"]);
		for (const [letter, keys] of cells) {
			const cell = letters.createEl("button", {
				cls: "greek-typer-guide-letter",
				attr: { "aria-label": `Insert ${letter}`, type: "button" },
			});
			cell.createSpan({ cls: "greek-typer-guide-greek", text: letter });
			cell.createSpan({ cls: "greek-typer-guide-key", text: keys });
			cell.onClickEvent((evt) => {
				// ς has no capital form; Σ is the capital of both sigmas.
				const upper = letter === "ς" ? "Σ" : letter.toUpperCase();
				this.insertIntoNote(evt.shiftKey ? upper : letter);
			});
		}

		el.createEl("h4", { text: "Diacritics" });
		el.createEl("p", { text: "Type these after the vowel, in any order: a)/ → ἄ." });
		const table = el.createEl("table", { cls: "greek-typer-guide-table" });
		for (const [key, name, example] of DIACRITICS) {
			const row = table.createEl("tr");
			row.createEl("td").createEl("code", { text: key });
			row.createEl("td", { text: name });
			row.createEl("td", { text: example });
		}

		el.createEl("h4", { text: "Tips" });
		const tips = el.createEl("ul");
		tips.createEl("li", { text: `Start with a capital for a capital letter: ${this.example("I)hsou=s")}.` });
		if (settings.useBetaCode) {
			tips.createEl("li", { text: `Or use *, with marks before or after the letter: ${this.example("*)ihsou=s")}. Use _ for Markdown italics.` });
		} else {
			if (settings.smartRoughBreathing) {
				tips.createEl("li", { text: `A word-initial h before a vowel is a rough breathing: ${this.example("ho/ti")}, ${this.example("hoi")}.` });
			}
			tips.createEl("li", { text: `Use _ to split th, ph, ch or ps: ${this.example("t_h/n")}.` });
		}
		tips.createEl("li", { text: "Final sigma (ς) is added automatically." });
	}

	/** Insert text into the note the user was last editing, and return focus to it. */
	private insertIntoNote(text: string): void {
		const leaf = this.app.workspace.getMostRecentLeaf();
		const view = leaf?.view;
		if (!leaf || !(view instanceof MarkdownView) || view.getMode() !== "source") {
			new Notice("Open a note in editing view to insert letters.");
			return;
		}
		view.editor.replaceSelection(text);
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
	}

	private example(input: string): string {
		return `${input} → ${transliterate(input, {
			scheme: this.plugin.settings.useBetaCode ? "beta" : "phonetic",
			diacritics: true,
			smartBreathing: this.plugin.settings.smartRoughBreathing,
		})}`;
	}
}
