import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from 'obsidian';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { greekLettersMap, greekDiacriticsMap } from './greek-maps';
import { betaLettersMap, betaDiacriticsMap } from './beta-maps';

interface GreekTyperSettings {
	isLiveTyping: boolean;
	customMappings: Array<{ key: string, replacement: string }>;
	dictionaryUrl: string;
	useBetaCode: boolean;
	smartRoughBreathing: boolean;
}

const DEFAULT_SETTINGS: GreekTyperSettings = {
	isLiveTyping: false,
	customMappings: [],
	dictionaryUrl: "https://logeion.uchicago.edu/{word}",
	useBetaCode: false,
	smartRoughBreathing: true
}

export default class GreekTyperPlugin extends Plugin {
	settings: GreekTyperSettings;
	private ribbonKeyboard: HTMLElement;
	private statusBarItem: HTMLElement;
	public customMapping: Record<string, string> = {};

	async onload() {
		console.log('GreekTyper plugin loaded');

		await this.loadSettings();

		// Greek Typing Guide
		// Register the guide view
		this.registerView(TYPING_GUIDE_VIEW, (leaf) => new GreekTyperGuideView(leaf, this));

		// Check if the guide is already open
		const existingLeaves = this.app.workspace.getLeavesOfType(TYPING_GUIDE_VIEW);
		if (existingLeaves.length === 0) {
			// Open guide in right pane
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: TYPING_GUIDE_VIEW,
					active: true
				});
			}
		}

		//////////////////////////////////////////////////
		// Convert selection to plain Greek
		this.addCommand({
			id: 'convert-to-greek',
			name: 'Convert to Greek',
			editorCallback: (editor) => {
				const selection = editor.getSelection();
				if (!selection) return;
				editor.replaceSelection(this.toGreek(selection));
			},
		});

		// Convert selection to Greek with diacritics
		this.addCommand({
			id: 'convert-to-greek-diacritics',
			name: 'Convert to Greek (with Diacritics)',
			editorCallback: (editor) => {
				const selection = editor.getSelection();
				if (!selection) return;
				editor.replaceSelection(this.toGreekWithDiacritics(selection));
				new Notice("Converted to Greek with diacritics");
			},
		});

		// Ribbon icon to toggle live typing
		this.ribbonKeyboard = this.addRibbonIcon('omega', 'Toggle Live Typing', (_evt: MouseEvent) => {
			this.toggleLiveTyping();
		});

		// Command to toggle live typing
		this.addCommand({
			id: 'toggle-live-typing',
			name: 'Toggle Live Typing',
			callback: () => {
				this.toggleLiveTyping();
			}
		});

		// Command to toggle Beta Code
		this.addCommand({
			id: 'toggle-beta-code',
			name: 'Toggle Beta Code Mapping',
			callback: async () => {
				this.settings.useBetaCode = !this.settings.useBetaCode;
				await this.saveSettings();
				new Notice(`Beta Code Mapping ${this.settings.useBetaCode ? "enabled" : "disabled"}`);
			}
		});

		// Command to toggle Smart H
		this.addCommand({
			id: 'toggle-smart-h',
			name: "Toggle Smart 'h'",
			callback: async () => {
				this.settings.smartRoughBreathing = !this.settings.smartRoughBreathing;
				await this.saveSettings();
				new Notice(`Smart 'h' ${this.settings.smartRoughBreathing ? "enabled" : "disabled"}`);
			}
		});

		// Dictionary Lookup Command
		this.addCommand({
			id: 'lookup-greek-word',
			name: 'Look up selection in Dictionary',
			editorCallback: (editor) => {
				const selection = editor.getSelection();
				if (selection) {
					this.lookupWord(selection);
				} else {
					// If no selection, try to get word under cursor
					const cursor = editor.getCursor();
					const word = this.getWordAtCursor(editor, cursor);
					if (word) this.lookupWord(word);
				}
			}
		});

		// Context Menu for Lookup
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selection = editor.getSelection();
				if (selection && this.containsGreek(selection)) {
					menu.addItem((item) => {
						item
							.setTitle("Look up in Dictionary")
							.setIcon("book")
							.onClick(() => {
								this.lookupWord(selection);
							});
					});
				}
			})
		);

		// Status Bar Item
		this.statusBarItem = this.addStatusBarItem();
		this.updateUI();

		// Live typing extension (convert word at space)
		this.registerEditorExtension([
			EditorView.updateListener.of((update: ViewUpdate) => {
				if (!this.settings.isLiveTyping) return;
				if (!update.docChanged) return;

				update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
					const view = update.view;
					const text = inserted.toString();

					// Only trigger on space (end of word)
					if (!text.includes(' ') && !text.includes('\n')) return;

					// Find the start of the current word
					const cursor = view.state.selection.main.head;
					const line = view.state.doc.lineAt(cursor);
					const textBeforeCursor = view.state.sliceDoc(line.from, cursor);

					// Find the last word before the cursor (ignoring the just-typed space/newline)
					const match = textBeforeCursor.match(/(\S+)\s*$/);
					if (!match) return;

					const word = match[1];
					const wordStart = cursor - match[0].length;
					const wordEnd = wordStart + word.length;

					const converted = this.toGreekWithDiacritics(word);

					if (converted !== word) {
						view.dispatch({
							changes: { from: wordStart, to: wordEnd, insert: converted },
						});
					}
				});
			}),
		]);

		// Add Settings Tab
		this.addSettingTab(new GreekTyperSettingTab(this.app, this));
	}

	onunload() {
		console.log('GreekTyper plugin unloaded');
	}

	async loadSettings() {
		const data = await this.loadData();

		// Migration from old JSON format
		if (data && data.customMappingJson) {
			try {
				const jsonMap = JSON.parse(data.customMappingJson);
				data.customMappings = Object.entries(jsonMap).map(([key, replacement]) => ({
					key,
					replacement: replacement as string
				}));
				delete data.customMappingJson;
			} catch (e) {
				console.error("Greek Typer: Failed to migrate custom mapping JSON", e);
			}
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		this.rebuildCustomMappingLookup();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.rebuildCustomMappingLookup();

		// Refresh guide if open
		const leaves = this.app.workspace.getLeavesOfType(TYPING_GUIDE_VIEW);
		for (const leaf of leaves) {
			if (leaf.view instanceof GreekTyperGuideView) {
				leaf.view.onOpen();
			}
		}
	}

	rebuildCustomMappingLookup() {
		this.customMapping = {};
		for (const map of this.settings.customMappings) {
			if (map.key && map.replacement) {
				this.customMapping[map.key] = map.replacement;
			}
		}
	}

	async toggleLiveTyping() {
		this.settings.isLiveTyping = !this.settings.isLiveTyping;
		await this.saveSettings();
		new Notice(`Live Typing ${this.settings.isLiveTyping ? "enabled" : "disabled"}`);
		this.updateUI();
	}

	updateUI() {
		if (this.ribbonKeyboard) {
			this.ribbonKeyboard.setAttribute(
				"style",
				this.settings.isLiveTyping ? "color: var(--interactive-accent);" : "color: var(--text-muted);"
			);
		}

		if (this.statusBarItem) {
			this.statusBarItem.setText(`Greek: ${this.settings.isLiveTyping ? "ON" : "OFF"}`);
		}
	}

	// Plain Greek conversion (letters only)
	public toGreek(text: string): string {
		if (this.settings.smartRoughBreathing) {
			// Remove initial 'h' before vowels/rho for plain Greek
			text = text.replace(/\bh([aeiouwhr])/gi, '$1');
		}

		text = this.applyCustomMapping(text);
		const map = this.settings.useBetaCode ? betaLettersMap : greekLettersMap;
		const keys = Object.keys(map).sort((a, b) => b.length - a.length);
		for (const key of keys) {
			text = text.split(key).join(map[key]);
		}
		// Final sigma
		text = text.replace(/σ(?=\s|$|[.,;!?:·’])/g, 'ς');
		return text;
	}

	private applyCustomMapping(text: string): string {
		if (Object.keys(this.customMapping).length === 0) return text;

		// Sort keys by length descending to handle multi-char mappings correctly
		const keys = Object.keys(this.customMapping).sort((a, b) => b.length - a.length);

		// We need to be careful not to replace characters that have already been replaced
		// But for simple 1-to-1 or 1-to-many mappings, a simple replace loop works if we are careful.
		// A better approach for a "pre-processor" is to just run the replacements.
		// Since this maps UserKey -> InternalKey (e.g. 'q' -> 'th'), and InternalKeys are [a-z],
		// we might have collisions if we are not careful (e.g. mapping 'a' -> 'b' and 'b' -> 'c').
		// However, for a simple implementation, we'll assume users map unused keys to used ones.

		for (const key of keys) {
			// Global replace of the custom key with the internal key
			// Escape special regex characters in the key
			const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(escapedKey, 'g');
			text = text.replace(regex, this.customMapping[key]);
		}
		return text;
	}

	// Full polytonic Greek conversion
	public toGreekWithDiacritics(input: string): string {
		if (this.settings.smartRoughBreathing) {
			// Convert initial 'h' before vowels/rho to rough breathing '('
			// We append the '(' after the vowel so the mapper picks it up (e.g. 'ha' -> 'a(')
			input = input.replace(/\bh([aeiouwhr])/gi, '$1(');
		}

		input = this.applyCustomMapping(input);
		const lettersMap = this.settings.useBetaCode ? betaLettersMap : greekLettersMap;
		const diacriticsMap = this.settings.useBetaCode ? betaDiacriticsMap : greekDiacriticsMap;

		let output = "";
		let i = 0;

		while (i < input.length) {
			let ch = input[i];
			if (!/[a-zA-Z]/.test(ch)) {
				output += ch;
				i++;
				continue;
			}

			let next = input[i + 1];
			let base = ch;
			let consumed = 1;

			// Check for 2-char sequence (e.g. th, ph)
			if (next && (lettersMap[ch + next] || diacriticsMap[(ch + next).toLowerCase()])) {
				base = ch + next;
				consumed = 2;
			}

			let seq = base;
			let j = i + consumed;
			while (j < input.length && /[\\/=\(\)\|\+]/.test(input[j])) {
				seq += input[j];
				j++;
			}

			let greek = diacriticsMap[seq.toLowerCase()] || lettersMap[seq];
			output += greek ? greek : seq;
			i = j;
		}

		// Final sigma
		output = output.replace(/σ(?=\s|$|[.,;!?:·’])/g, 'ς');
		return output;
	}

	async lookupWord(word: string) {
		const url = this.settings.dictionaryUrl.replace('{word}', encodeURIComponent(word));

		// Use Obsidian's Core Web Viewer plugin
		const leaf = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
		await leaf.setViewState({
			type: 'webviewer',
			active: true,
			state: { url: url }
		});

		this.app.workspace.revealLeaf(leaf);
	}

	getWordAtCursor(editor: Editor, cursor: any): string {
		const line = editor.getLine(cursor.line);
		const left = line.slice(0, cursor.ch).search(/\S+$/);
		const right = line.slice(cursor.ch).search(/\s/);
		const word = line.slice(left, right === -1 ? undefined : cursor.ch + right);
		return word;
	}

	containsGreek(text: string): boolean {
		return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
	}
}

class GreekTyperSettingTab extends PluginSettingTab {
	plugin: GreekTyperPlugin;

	constructor(app: App, plugin: GreekTyperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable Live Typing by Default')
			.setDesc('Automatically convert text to Greek as you type.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isLiveTyping)
				.onChange(async (value) => {
					this.plugin.settings.isLiveTyping = value;
					await this.plugin.saveSettings();
					this.plugin.updateUI();
				}));

		new Setting(containerEl)
			.setName('Use Beta Code Mapping')
			.setDesc('Use standard Beta Code (e.g. q=θ, c=ξ, f=φ, y=ψ) instead of phonetic mapping.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useBetaCode)
				.onChange(async (value) => {
					this.plugin.settings.useBetaCode = value;
					await this.plugin.saveSettings();
				}));



		new Setting(containerEl)
			.setName("Smart 'h' for Rough Breathing")
			.setDesc("Treat initial 'h' before a vowel as a rough breathing mark (e.g. 'hodos' -> 'ὁδός').")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.smartRoughBreathing)
				.onChange(async (value) => {
					this.plugin.settings.smartRoughBreathing = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Dictionary Lookup' });

		const noteDiv = containerEl.createDiv({ cls: 'setting-item-description' });
		noteDiv.style.marginBottom = '1rem';
		noteDiv.style.color = 'var(--text-accent)';
		noteDiv.createSpan({ text: 'Note: Requires the "Web Viewer" core plugin to be enabled in Obsidian settings.' });

		new Setting(containerEl)
			.setName('Dictionary URL')
			.setDesc('URL for dictionary lookup. Use {word} as placeholder.')
			.addText(text => text
				.setPlaceholder('https://example.com/{word}')
				.setValue(this.plugin.settings.dictionaryUrl)
				.onChange(async (value) => {
					this.plugin.settings.dictionaryUrl = value;
					await this.plugin.saveSettings();
				}));

		const presetDiv = containerEl.createDiv({ cls: 'setting-item-description' });
		presetDiv.style.marginBottom = '1rem';
		presetDiv.createSpan({ text: 'Presets: ' });

		const addPreset = (name: string, url: string) => {
			const btn = presetDiv.createEl('button', { text: name });
			btn.style.marginRight = '0.5rem';
			btn.onclick = async () => {
				this.plugin.settings.dictionaryUrl = url;
				await this.plugin.saveSettings();
				this.display();
			};
		};

		addPreset('Logeion', 'https://logeion.uchicago.edu/{word}');
		addPreset('Blue Letter Bible (TR)', 'https://www.blueletterbible.org/search/search.cfm?Criteria={word}&t=TR');
		addPreset('Perseus', 'http://www.perseus.tufts.edu/hopper/morph?l={word}&la=greek');

		containerEl.createEl('h3', { text: 'Key Mappings' });
		containerEl.createEl('p', { text: 'Customize the keys used to type Greek letters.', cls: 'setting-item-description' });

		const keys = Object.keys(greekLettersMap).sort((a, b) => {
			// Sort by length (single chars first) then alphabetically
			if (a.length !== b.length) return a.length - b.length;
			return a.localeCompare(b);
		});

		for (const internalCode of keys) {
			const greekLetter = greekLettersMap[internalCode];
			const existingMapping = this.plugin.settings.customMappings.find(m => m.replacement === internalCode);
			const customKey = existingMapping ? existingMapping.key : '';

			new Setting(containerEl)
				.setName(`${greekLetter}`)
				.setDesc(`Default: ${internalCode}`)
				.addText(text => text
					.setPlaceholder('Custom Key')
					.setValue(customKey)
					.onChange(async (value) => {
						// Remove existing mapping for this internal code
						this.plugin.settings.customMappings = this.plugin.settings.customMappings.filter(m => m.replacement !== internalCode);

						// Add new mapping if value is present
						if (value.trim() !== '') {
							this.plugin.settings.customMappings.push({ key: value.trim(), replacement: internalCode });
						}

						await this.plugin.saveSettings();
						this.plugin.rebuildCustomMappingLookup();
					}));
		}
	}
}

const TYPING_GUIDE_VIEW = "greek-typer-guide";

export class GreekTyperGuideView extends ItemView {
	plugin: GreekTyperPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GreekTyperPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return TYPING_GUIDE_VIEW;
	}

	getDisplayText() {
		return "Greek Typer Guide";
	}

	getIcon(): string {
		return "omega";
	}

	async onOpen() {
		const container = this.containerEl;
		container.empty();

		const isBeta = this.plugin.settings.useBetaCode;
		const title = isBeta ? "Beta Code Guide" : "Phonetic Guide";

		let mappingHtml = "";
		if (isBeta) {
			mappingHtml = `
			<h3 style="margin-top: 1rem; border-bottom: 1px solid var(--background-modifier-border);">Key Mappings</h3>
			<table style="width: 100%; border-collapse: collapse; text-align: center;">
				<tr><td>a = α</td><td>b = β</td><td>g = γ</td><td>d = δ</td></tr>
				<tr><td>e = ε</td><td>z = ζ</td><td>h = η</td><td><strong>q = θ</strong></td></tr>
				<tr><td>i = ι</td><td>k = κ</td><td>l = λ</td><td>m = μ</td></tr>
				<tr><td>n = ν</td><td><strong>c = ξ</strong></td><td>o = ο</td><td>p = π</td></tr>
				<tr><td>r = ρ</td><td>s = σ</td><td>t = τ</td><td>u = υ</td></tr>
				<tr><td><strong>f = φ</strong></td><td>x = χ</td><td><strong>y = ψ</strong></td><td>w = ω</td></tr>
			</table>
			`;
		} else {
			mappingHtml = `
			<h3 style="margin-top: 1rem; border-bottom: 1px solid var(--background-modifier-border);">Key Mappings</h3>
			<table style="width: 100%; border-collapse: collapse; text-align: center;">
				<tr><td>a = α</td><td>b = β</td><td>g = γ</td><td>d = δ</td></tr>
				<tr><td>e = ε</td><td>z = ζ</td><td>h = η</td><td><strong>th = θ</strong></td></tr>
				<tr><td>i = ι</td><td>k = κ</td><td>l = λ</td><td>m = μ</td></tr>
				<tr><td>n = ν</td><td>x = ξ</td><td>o = ο</td><td>p = π</td></tr>
				<tr><td>r = ρ</td><td>s = σ</td><td>t = τ</td><td>u = υ</td></tr>
				<tr><td><strong>ph = φ</strong></td><td><strong>ch = χ</strong></td><td><strong>ps = ψ</strong></td><td>w = ω</td></tr>
			</table>
			`;
		}

		const html = `
        <div style="padding: 1rem; font-family: system-ui, sans-serif; line-height: 1.5;">
            <h2 style="margin-bottom: 1rem; color: var(--interactive-accent); text-align: center;">${title}</h2>
            <p style="text-align: center;">Type the symbol immediately after the letter to apply the mark.</p>

			${mappingHtml}

            <h3 style="margin-top: 1rem; border-bottom: 1px solid var(--background-modifier-border);">Diacritics</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 0.5rem;">
                <thead>
                    <tr style="background-color: var(--background-modifier-border);">
                        <th style="padding: 0.5rem;">Key</th>
                        <th style="padding: 0.5rem;">Effect</th>
                        <th style="padding: 0.5rem;">Ex</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>/</td><td>acute</td><td>ά</td></tr>
                    <tr><td>\\</td><td>grave</td><td>ὰ</td></tr>
                    <tr><td>=</td><td>circumflex</td><td>ᾶ</td></tr>
                    <tr><td>)</td><td>smooth</td><td>ἀ</td></tr>
                    <tr><td>(</td><td>rough</td><td>ἁ</td></tr>
                    <tr><td>|</td><td>iota sub</td><td>ᾳ</td></tr>
                    <tr><td>+</td><td>diaeresis</td><td>ϊ</td></tr>
                </tbody>
            </table>
        </div>
    `;

		container.innerHTML = html;
	}


	async onClose() {
		// Nothing to clean up
	}
}
