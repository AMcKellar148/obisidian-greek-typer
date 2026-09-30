import { App, Editor, Notice, Platform, WorkspaceLeaf } from "obsidian";
import type GreekTyperPlugin from "./main";
import { buildLookupUrl, cleanLookupTerm, wordAt } from "./dictionary";
import { containsGreek } from "./transliterate";

const WEB_VIEWER_TYPE = "webviewer";

/** The leaf used for the last lookup, reused so repeated lookups don't pile up tabs. */
let lookupLeaf: WorkspaceLeaf | null = null;

/** The selected text, or the word under the cursor. */
export function lookupTermFromEditor(editor: Editor): string {
	const selection = editor.getSelection();
	if (selection) return cleanLookupTerm(selection);
	const cursor = editor.getCursor();
	return cleanLookupTerm(wordAt(editor.getLine(cursor.line), cursor.ch));
}

/** Web Viewer is a desktop-only core plugin that may be disabled. */
function webViewerAvailable(app: App): boolean {
	if (!Platform.isDesktopApp) return false;
	// Not in the public API; if Obsidian changes it we just try to open the view.
	const registry = (app as App & { viewRegistry?: { getViewCreatorByType?: (type: string) => unknown } }).viewRegistry;
	if (typeof registry?.getViewCreatorByType !== "function") return true;
	return Boolean(registry.getViewCreatorByType(WEB_VIEWER_TYPE));
}

async function openInWebViewer(app: App, url: string): Promise<boolean> {
	const { workspace } = app;
	const reusable = lookupLeaf && workspace.getLeavesOfType(WEB_VIEWER_TYPE).includes(lookupLeaf);
	const leaf = reusable && lookupLeaf ? lookupLeaf : workspace.getRightLeaf(false);
	if (!leaf) return false;

	await leaf.setViewState({ type: WEB_VIEWER_TYPE, active: true, state: { url } });
	if (leaf.view.getViewType() !== WEB_VIEWER_TYPE) {
		leaf.detach();
		return false;
	}
	lookupLeaf = leaf;
	await workspace.revealLeaf(leaf);
	return true;
}

export async function lookupWord(plugin: GreekTyperPlugin, term: string): Promise<void> {
	const url = buildLookupUrl(plugin.settings.dictionaryUrl, term);
	if (!url) {
		new Notice("The dictionary URL needs a {word} placeholder. Check the Greek Typer settings.");
		return;
	}
	try {
		if (webViewerAvailable(plugin.app) && await openInWebViewer(plugin.app, url)) return;
	} catch (error) {
		console.error("Greek Typer: couldn't open Web Viewer, falling back to the browser", error);
	}
	window.open(url);
}

export function registerLookupMenu(plugin: GreekTyperPlugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on("editor-menu", (menu, editor) => {
			const term = lookupTermFromEditor(editor);
			if (!term || !containsGreek(term)) return;
			menu.addItem((item) => {
				item
					.setTitle(`Look up "${term}" in dictionary`)
					.setIcon("book-open")
					.onClick(() => lookupWord(plugin, term));
			});
		}),
	);
}
