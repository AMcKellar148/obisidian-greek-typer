import { App, debounce, PluginSettingTab, Setting } from "obsidian";
import type GreekTyperPlugin from "../main";
import { defaultKeyFor, GREEK_LETTERS, LETTER_NAMES } from "../keymaps";
import { DICTIONARY_PRESETS, findCustomKeyConflict, validateCustomKey } from "../settings";

const CUSTOM_PRESET = "custom";

export class GreekTyperSettingTab extends PluginSettingTab {
	private readonly plugin: GreekTyperPlugin;
	private readonly saveDebounced: () => void;

	constructor(app: App, plugin: GreekTyperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.saveDebounced = debounce(() => void this.plugin.saveSettings(), 500, true);
	}

	display(): void {
		const { containerEl } = this;
		const { settings } = this.plugin;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Live typing")
			.setDesc("Convert each word to Greek when you type a space or start a new line. Code, links, tags and front matter are left alone. You can also toggle this from the ribbon, the status bar or the command palette.")
			.addToggle((toggle) => toggle
				.setValue(settings.isLiveTyping)
				.onChange(async (value) => {
					settings.isLiveTyping = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Keyboard scheme")
			.setDesc("Phonetic uses th, ph, ch and ps. Beta Code uses q, f, x and y, with c for ξ.")
			.addDropdown((dropdown) => dropdown
				.addOption("phonetic", "Phonetic")
				.addOption("beta", "Beta Code")
				.setValue(settings.useBetaCode ? "beta" : "phonetic")
				.onChange(async (value) => {
					settings.useBetaCode = value === "beta";
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName("Smart 'h' for rough breathing")
			.setDesc(settings.useBetaCode
				? "Only available with phonetic keys, since h is eta in Beta Code."
				: "Treat a word-initial h before a vowel or rho as a rough breathing, e.g. ho/ti → ὅτι, hoi → οἱ.")
			.setDisabled(settings.useBetaCode)
			.addToggle((toggle) => toggle
				.setValue(settings.smartRoughBreathing)
				.setDisabled(settings.useBetaCode)
				.onChange(async (value) => {
					settings.smartRoughBreathing = value;
					await this.plugin.saveSettings();
				}));

		this.displayDictionarySettings(containerEl);
		this.displayCustomKeys(containerEl);
	}

	private displayDictionarySettings(containerEl: HTMLElement): void {
		const { settings } = this.plugin;
		new Setting(containerEl).setName("Dictionary lookup").setHeading();

		const presetName = Object.keys(DICTIONARY_PRESETS).find((name) => DICTIONARY_PRESETS[name] === settings.dictionaryUrl);
		new Setting(containerEl)
			.setName("Dictionary")
			.setDesc("Used by default. To pick a different one for a single lookup, use the right-click menu or the command palette. Lookups open in the Web viewer core plugin when it's enabled, otherwise in your browser. The word you look up is sent to the dictionary's website.")
			.addDropdown((dropdown) => {
				for (const name of Object.keys(DICTIONARY_PRESETS)) dropdown.addOption(name, name);
				dropdown
					.addOption(CUSTOM_PRESET, "Custom URL")
					.setValue(presetName ?? CUSTOM_PRESET)
					.onChange(async (value) => {
						const url = DICTIONARY_PRESETS[value];
						if (url) {
							settings.dictionaryUrl = url;
							await this.plugin.saveSettings();
						}
						this.display();
					});
			});

		const urlSetting = new Setting(containerEl).setName("Dictionary URL");
		const describeUrl = (url: string) => {
			const valid = url.includes("{word}");
			urlSetting.setDesc(valid ? "Use {word} where the looked-up word goes." : "The URL must contain {word}.");
			urlSetting.descEl.toggleClass("mod-warning", !valid);
		};
		urlSetting.addText((text) => text
			.setPlaceholder("https://example.com/{word}")
			.setValue(settings.dictionaryUrl)
			.onChange((value) => {
				settings.dictionaryUrl = value.trim();
				describeUrl(settings.dictionaryUrl);
				this.saveDebounced();
			}));
		describeUrl(settings.dictionaryUrl);
	}

	private displayCustomKeys(containerEl: HTMLElement): void {
		const { settings } = this.plugin;
		const scheme = settings.useBetaCode ? "beta" : "phonetic";

		new Setting(containerEl)
			.setName("Custom keys")
			.setDesc("Add your own key for any letter. The default keys keep working.")
			.setHeading()
			.addExtraButton((button) => button
				.setIcon("rotate-ccw")
				.setTooltip("Clear all custom keys")
				.onClick(async () => {
					settings.customKeys = {};
					await this.plugin.saveSettings();
					this.display();
				}));

		for (const letter of GREEK_LETTERS) {
			const defaultDesc = `Default: ${defaultKeyFor(scheme, letter)}`;
			const row = new Setting(containerEl)
				.setName(`${letter} (${LETTER_NAMES[letter] ?? ""})`)
				.setDesc(defaultDesc);
			row.addText((text) => text
				.setPlaceholder("Custom key")
				.setValue(settings.customKeys[letter] ?? "")
				.onChange((value) => {
					const key = value.trim();
					let error: string | null = null;
					if (key !== "") {
						const conflict = findCustomKeyConflict(settings.customKeys, letter, key, scheme);
						error = validateCustomKey(key) ?? (conflict ? `Already used for ${conflict}.` : null);
					}
					row.setDesc(error ?? defaultDesc);
					row.descEl.toggleClass("mod-warning", error !== null);
					text.inputEl.toggleClass("greek-typer-invalid", error !== null);
					if (error) return;

					if (key === "") delete settings.customKeys[letter];
					else settings.customKeys[letter] = key;
					this.saveDebounced();
				}));
		}
	}
}
