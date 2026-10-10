import { Plugin } from "obsidian";
import { registerCommands } from "./commands";
import { GUIDE_VIEW_TYPE, GuideView } from "./ui/guide-view";
import { GreekTyperSettingTab } from "./ui/settings-tab";
import { liveTypingExtension } from "./live-typing";
import { registerLookupMenu } from "./lookup";
import { GreekTyperSettings, normalizeSettings, transliterateOptions } from "./settings";
import { transliterate } from "./transliterate";

export default class GreekTyperPlugin extends Plugin {
	settings: GreekTyperSettings = normalizeSettings(null);
	private ribbonIconEl: HTMLElement | null = null;
	private statusBarEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(GUIDE_VIEW_TYPE, (leaf) => new GuideView(leaf, this));
		registerCommands(this);
		registerLookupMenu(this);

		this.ribbonIconEl = this.addRibbonIcon("omega", "Toggle Greek live typing", () => {
			void this.toggleLiveTyping();
		});

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("mod-clickable", "greek-typer-status");
		this.statusBarEl.setAttribute("aria-label", "Toggle Greek live typing");
		this.registerDomEvent(this.statusBarEl, "click", () => {
			void this.toggleLiveTyping();
		});

		this.registerEditorExtension(
			liveTypingExtension((word) => (this.settings.isLiveTyping ? this.convert(word, true) : null)),
		);

		this.addSettingTab(new GreekTyperSettingTab(this.app, this));
		this.updateLiveTypingIndicators();
	}

	/** Convert Latin transliteration to Greek using the current settings. */
	convert(text: string, diacritics: boolean): string {
		return transliterate(text, transliterateOptions(this.settings, diacritics));
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.updateLiveTypingIndicators();
		this.refreshGuideViews();
	}

	async toggleLiveTyping(): Promise<void> {
		this.settings.isLiveTyping = !this.settings.isLiveTyping;
		await this.saveSettings();
	}

	async activateGuideView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(GUIDE_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: GUIDE_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	private refreshGuideViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(GUIDE_VIEW_TYPE)) {
			if (leaf.view instanceof GuideView) leaf.view.render();
		}
	}

	private updateLiveTypingIndicators(): void {
		const on = this.settings.isLiveTyping;
		this.ribbonIconEl?.toggleClass("greek-typer-active", on);
		this.statusBarEl?.setText(`Greek: ${on ? "on" : "off"}`);
		this.statusBarEl?.toggleClass("greek-typer-active", on);
	}
}
