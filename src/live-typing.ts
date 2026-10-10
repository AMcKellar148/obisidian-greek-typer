import { isolateHistory } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { ChangeSpec, EditorState, Extension, StateField, Transaction, TransactionSpec } from "@codemirror/state";

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

/** Events after which the text before the cursor wasn't just typed by the user. */
const RESETTING_EVENTS = ["undo", "redo", "input.paste", "input.drop", "input.complete", "select", "move", "delete.cut", "delete.selection"];

/**
 * Cursor positions directly after a letter the user just typed. A word is only
 * converted if the user typed its last letter, so text restored by undo, pasted
 * text, or an existing word the cursor was moved to is left alone.
 */
const typedHeads = StateField.define<readonly number[]>({
	create: () => [],
	update(heads, tr) {
		if (tr.docChanged && isTypingEvent(tr)) {
			let insertedWhitespace = false;
			tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
				if (/\s/.test(inserted.toString())) insertedWhitespace = true;
			});
			return insertedWhitespace ? [] : tr.state.selection.ranges.map((r) => r.head);
		}
		// Backspace/delete while typing a word keeps it eligible.
		if (heads.length > 0 && (tr.isUserEvent("delete.backward") || tr.isUserEvent("delete.forward"))) {
			return tr.state.selection.ranges.map((r) => r.head);
		}
		if (RESETTING_EVENTS.some((event) => tr.isUserEvent(event))) return [];
		// Unrelated edits (sync, other plugins) just shift the positions.
		return tr.docChanged ? heads.map((pos) => tr.changes.mapPos(pos)) : heads;
	},
});

function inSkippedContext(state: EditorState, pos: number, textBefore: string): boolean {
	// An odd number of backticks before the cursor on this line means we're inside inline code,
	// even if it isn't closed yet.
	if ((textBefore.match(/`/g)?.length ?? 0) % 2 === 1) return true;

	let node: ReturnType<ReturnType<typeof syntaxTree>["resolveInner"]> | null = syntaxTree(state).resolveInner(pos, -1);
	for (; node; node = node.parent) {
		if (SKIPPED_NODE.test(node.name)) return true;
	}
	return false;
}

/**
 * Converts the word before the cursor when the user types a space or newline right
 * after typing it. Paste, undo, sync and other plugins never trigger it, and the
 * conversion is a separate undo step so undo restores the Latin text.
 *
 * @param convert returns the converted word, or null when live typing is off.
 */
export function liveTypingExtension(convert: (word: string) => string | null): Extension {
	const filter = EditorState.transactionFilter.of((tr) => {
		if (!tr.docChanged || !isTypingEvent(tr)) return tr;
		const typed = tr.startState.field(typedHeads, false) ?? [];

		const replacements: ChangeSpec[] = [];
		tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
			if (fromA !== toA || !/^\s/.test(inserted.sliceString(0, 1)) || !typed.includes(fromA)) return;

			const line = tr.startState.doc.lineAt(fromA);
			const textBefore = tr.startState.sliceDoc(line.from, fromA);
			const match = /\S+$/.exec(textBefore);
			if (!match) return;
			const word = match[0];
			const wordStart = fromA - word.length;
			if (SKIPPED_WORD.test(word) || inSkippedContext(tr.startState, fromA, textBefore)) return;

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
	return [typedHeads, filter];
}
