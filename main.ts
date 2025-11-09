import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from 'obsidian';
import { EditorView, ViewUpdate } from '@codemirror/view';

export default class GreekTyperPlugin extends Plugin {
	private isLiveTyping = true;

	// Greek letter map (basic letters)
	private readonly greekLettersMap: Record<string, string> = {
		a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η',
		i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', x: 'ξ', o: 'ο',
		p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', w: 'ω',
		th: 'θ', ph: 'φ', ch: 'χ', ps: 'ψ',
		A: 'Α', B: 'Β', G: 'Γ', D: 'Δ', E: 'Ε', Z: 'Ζ', H: 'Η',
		I: 'Ι', K: 'Κ', L: 'Λ', M: 'Μ', N: 'Ν', X: 'Ξ', O: 'Ο',
		P: 'Π', R: 'Ρ', S: 'Σ', T: 'Τ', U: 'Υ', W: 'Ω',
		Th: 'Θ', Ph: 'Φ', Ch: 'Χ', Ps: 'Ψ',
	};

	// Greek polytonic diacritics map (keyed sequences)
	private readonly greekDiacriticsMap: Record<string, string> = {
		"a": "α", "a/": "ά", "a\\": "ὰ", "a=": "ᾶ",
		"a)": "ἀ", "a(": "ἁ", "a)/": "ἄ", "a(\\": "ἃ", "a(=": "ἇ", "a)=": "ἆ",
		"a)|": "ᾀ", "a(|": "ᾁ", "a)/|": "ᾄ", "a(\\|": "ᾃ", "a)=|": "ᾆ", "a(=|": "ᾇ",

		"e": "ε", "e/": "έ", "e\\": "ὲ", "e)": "ἐ", "e(": "ἑ", "e)/": "ἔ", "e(\\": "ἓ",
		"h": "η", "h/": "ή", "h\\": "ὴ", "h=": "ῆ", "h)": "ἠ", "h(": "ἡ", "h)/": "ἤ", "h(\\": "ἣ", "h(=": "ἧ", "h)=": "ἦ",
		"h)|": "ᾐ", "h(|": "ᾑ", "h)/|": "ᾔ", "h(\\|": "ᾓ", "h)=|": "ᾖ", "h(=|": "ᾗ",

		"i": "ι", "i/": "ί", "i\\": "ὶ", "i=": "ῖ", "i+": "ϊ", "i/+": "ΐ", "i\\+": "ῒ", "i=+": "ῗ",
		"i)": "ἰ", "i(": "ἱ", "i)/": "ἴ", "i(\\": "ἳ", "i(=": "ἷ", "i)=": "ἶ",

		"o": "ο", "o/": "ό", "o\\": "ὸ", "o)": "ὀ", "o(": "ὁ", "o)/": "ὄ", "o(\\": "ὃ",
		"u": "υ", "u/": "ύ", "u\\": "ὺ", "u=": "ῦ", "u+": "ϋ", "u/+": "ΰ", "u\\+": "ῢ", "u=+": "ῧ",
		"u)": "ὐ", "u(": "ὑ", "u)/": "ὔ", "u(\\": "ὓ", "u(=": "ὗ", "u)=": "ὖ",
		"w": "ω", "w/": "ώ", "w\\": "ὼ", "w=": "ῶ", "w)": "ὠ", "w(": "ὡ", "w)/": "ὤ", "w(\\": "ὣ", "w(=": "ὧ", "w)=": "ὦ",
		"w)|": "ᾠ", "w(|": "ᾡ", "w)/|": "ᾤ", "w(\\|": "ᾣ", "w)=|": "ᾦ", "w(=|": "ᾧ",

		"th": "θ", "ph": "φ", "ch": "χ", "ps": "ψ",
	};

	// Plain Greek conversion (letters only)
	private toGreek(text: string): string {
		const keys = Object.keys(this.greekLettersMap).sort((a, b) => b.length - a.length);
		for (const key of keys) {
			text = text.split(key).join(this.greekLettersMap[key]);
		}
		// Final sigma
		text = text.replace(/σ(?=\s|$|[.,;!?:·’])/g, 'ς');
		return text;
	}

	// Full polytonic Greek conversion
	private toGreekWithDiacritics(input: string): string {
		let output = "";
		let i = 0;

		while (i < input.length) {
			let ch = input[i];
			if (!/[a-zA-Z]/.test(ch)) {
				output += ch;
				i++;
				continue;
			}

			let seq = ch;
			let j = i + 1;
			while (j < input.length && /[\\/=\(\)\|\+]/.test(input[j])) {
				seq += input[j];
				j++;
			}

			let greek = this.greekDiacriticsMap[seq.toLowerCase()];
			output += greek ? greek : seq;
			i = j;
		}

		// Final sigma
		output = output.replace(/σ(?=\s|$|[.,;!?:·’])/g, 'ς');
		return output;
	}




	async onload() {
		console.log('GreekTyper plugin loaded');

		// Greek Typing Guide
		  // Register the guide view
    this.registerView(TYPING_GUIDE_VIEW, (leaf) => new GreekTyperGuideView(leaf));

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
		const ribbonKeyboard = this.addRibbonIcon('omega', 'Toggle Live Typing', (_evt: MouseEvent) => {
			this.isLiveTyping = !this.isLiveTyping;
			new Notice(`Live Typing ${this.isLiveTyping ? "enabled" : "disabled"}`);
			ribbonKeyboard.setAttribute(
				"style",
				this.isLiveTyping ? "color: var(--interactive-accent);" : "color: var(--text-muted);"
			);
		});

		// Live typing extension (convert word at space)
		this.registerEditorExtension([
			EditorView.updateListener.of((update: ViewUpdate) => {
				if (!this.isLiveTyping) return;
				if (!update.docChanged) return;

				update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
					const view = update.view;
					const text = inserted.toString();

					// Only trigger on space (end of word)
					if (!text.includes(' ') && !text.includes('\n')) return;

					// Find the start of the current word
					const cursor = view.state.selection.main.head;
					const wordStart = view.state.doc.lineAt(cursor).from;
					const wordText = view.state.sliceDoc(wordStart, cursor);

					const converted = this.toGreekWithDiacritics(wordText);

					if (converted !== wordText) {
						view.dispatch({
							changes: { from: wordStart, to: cursor, insert: converted },
						});
					}
				});
			}),
		]);
	}

	onunload() {
		console.log('GreekTyper plugin unloaded');
	}
}

const TYPING_GUIDE_VIEW = "greek-typer-guide";

export class GreekTyperGuideView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
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

    const html = `
        <div style="padding: 1rem; font-family: system-ui, sans-serif; line-height: 1.5;">
            <h2 style="margin-bottom: 1rem; color: var(--interactive-accent); text-align: center;">Greek Typer Key Guide</h2>
            <p style="text-align: center;">Type the symbol immediately after the letter to apply the mark. Combine marks for polytonic Greek.</p>

            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 1rem;">
                <thead>
                    <tr style="background-color: var(--background-modifier-border);">
                        <th style="padding: 0.5rem; border: 1px solid var(--background-modifier-border);">Key</th>
                        <th style="padding: 0.5rem; border: 1px solid var(--background-modifier-border);">Effect</th>
                        <th style="padding: 0.5rem; border: 1px solid var(--background-modifier-border);">Example</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Accents -->
                    <tr>
                        <td>/</td><td>acute</td><td>ά</td>
                    </tr>
                    <tr>
                        <td>\\</td><td>grave</td><td>ὰ</td>
                    </tr>
                    <tr>
                        <td>=</td><td>circumflex</td><td>ᾶ</td>
                    </tr>

                    <!-- Breathings -->
                    <tr>
                        <td>)</td><td>smooth breathing</td><td>ἀ</td>
                    </tr>
                    <tr>
                        <td>(</td><td>rough breathing</td><td>ἁ</td>
                    </tr>

                    <!-- Other Marks -->
                    <tr>
                        <td>|</td><td>iota subscript</td><td>ᾳ</td>
                    </tr>
                    <tr>
                        <td>+</td><td>diaeresis</td><td>ϊ</td>
                    </tr>
                </tbody>
            </table>

            <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted); text-align: center;">
                <strong>Tip:</strong> Combine multiple marks after a letter for polytonic Greek, e.g., <span style="font-weight:bold;">α)/</span> → ἄ.
            </p>
        </div>
    `;

    container.innerHTML = html;
}


	async onClose() {
		// Nothing to clean up
	}
}

