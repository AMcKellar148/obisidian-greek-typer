import { ItemView, WorkspaceLeaf } from "obsidian";
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
		const letters = el.createDiv({ cls: "greek-typer-guide-letters" });
		for (const letter of GREEK_LETTERS) {
			const cell = letters.createDiv({ cls: "greek-typer-guide-letter" });
			cell.createSpan({ cls: "greek-typer-guide-greek", text: letter });
			const keys = [defaultKeyFor(scheme, letter), settings.customKeys[letter]].filter(Boolean);
			cell.createSpan({ cls: "greek-typer-guide-key", text: keys.join(" / ") });
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
		if (!settings.useBetaCode) {
			if (settings.smartRoughBreathing) {
				tips.createEl("li", { text: `A word-initial h before a vowel is a rough breathing: ${this.example("ho/ti")}, ${this.example("hoi")}.` });
			}
			tips.createEl("li", { text: `Use _ to split th, ph, ch or ps: ${this.example("t_h/n")}.` });
		}
		tips.createEl("li", { text: "Final sigma (ς) is added automatically." });
	}

	private example(input: string): string {
		return `${input} → ${transliterate(input, {
			scheme: this.plugin.settings.useBetaCode ? "beta" : "phonetic",
			diacritics: true,
			smartBreathing: this.plugin.settings.smartRoughBreathing,
		})}`;
	}
}
