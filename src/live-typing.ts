import { isolateHistory } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { ChangeSpec, EditorState, Extension, Transaction, TransactionSpec } from "@codemirror/state";

/** Syntax nodes (Obsidian's markdown token names) whose text should never be converted. */
const SKIPPED_NODE = /codeblock|inline-code|frontmatter|math|internal-link|url|hashtag|html|hmd-embed/;
/** Words that look like links, URLs, tags or code. */
const SKIPPED_WORD = /:\/\/|\[\[|\]\]|`|^#|^www\./;

function isTypingEvent(tr: Transaction): boolean {
	return tr.isUserEvent("input") &&
		!tr.isUserEvent("input.paste") &&
		!tr.isUserEvent("input.drop") &&
		!tr.isUserEvent("input.complete");
}

function inSkippedContext(state: EditorState, pos: number): boolean {
	let node: ReturnType<ReturnType<typeof syntaxTree>["resolveInner"]> | null = syntaxTree(state).resolveInner(pos, -1);
	for (; node; node = node.parent) {
		if (SKIPPED_NODE.test(node.name)) return true;
	}
	return false;
}

/**
 * Converts the word before the cursor when the user types a space or newline.
 * Only real typing triggers it (not paste, undo, sync or other plugins), and the
 * conversion is a separate undo step so undo restores the Latin text.
 *
 * @param convert returns the converted word, or null when live typing is off.
 */
export function liveTypingExtension(convert: (word: string) => string | null): Extension {
	return EditorState.transactionFilter.of((tr) => {
		if (!tr.docChanged || !isTypingEvent(tr)) return tr;

		const replacements: ChangeSpec[] = [];
		tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
			if (fromA !== toA || !/^\s/.test(inserted.sliceString(0, 1))) return;

			const line = tr.startState.doc.lineAt(fromA);
			const match = /\S+$/.exec(tr.startState.sliceDoc(line.from, fromA));
			if (!match) return;
			const word = match[0];
			const wordStart = fromA - word.length;
			if (SKIPPED_WORD.test(word) || inSkippedContext(tr.startState, fromA)) return;

			const converted = convert(word);
			if (converted === null || converted === word) return;
			replacements.push({
				from: tr.changes.mapPos(wordStart, 1),
				to: tr.changes.mapPos(fromA, -1),
				insert: converted,
			});
		});

		if (replacements.length === 0) return tr;
		const conversion: TransactionSpec = {
			changes: replacements,
			sequential: true,
			annotations: isolateHistory.of("full"),
		};
		return [tr, conversion];
	});
}
