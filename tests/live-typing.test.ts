import { history, undo } from "@codemirror/commands";
import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { liveTypingExtension } from "../src/live-typing";
import { transliterate } from "../src/transliterate";

let enabled = true;
const convert = (word: string) =>
	enabled ? transliterate(word, { scheme: "phonetic", diacritics: true, smartBreathing: true }) : null;

function createState(doc: string, cursor = doc.length): EditorState {
	return EditorState.create({
		doc,
		selection: EditorSelection.cursor(cursor),
		extensions: [history(), liveTypingExtension(convert)],
	});
}

function type(state: EditorState, text: string, userEvent = "input.type"): EditorState {
	return state.update(state.replaceSelection(text), { userEvent }).state;
}

function typeChars(state: EditorState, text: string): EditorState {
	for (const ch of text) state = type(state, ch);
	return state;
}

function runUndo(state: EditorState): EditorState {
	let result = state;
	undo({ state, dispatch: (tr: Transaction) => { result = tr.state; } });
	return result;
}

beforeEach(() => {
	enabled = true;
});

describe("live typing", () => {
	test("converts the word when a space is typed", () => {
		const state = typeChars(createState(""), "lo/gos ");
		expect(state.doc.toString()).toBe("λόγος ");
		expect(state.selection.main.head).toBe("λόγος ".length);
	});

	test("converts on newline", () => {
		const state = type(createState("ho/ti"), "\n", "input");
		expect(state.doc.toString()).toBe("ὅτι\n");
	});

	test("converts each word in a sentence", () => {
		const state = typeChars(createState(""), "e)n a)rchh=| ");
		expect(state.doc.toString()).toBe("ἐν ἀρχῇ ");
	});

	test("only the word before the cursor is converted", () => {
		const state = type(createState("abc logos", 9), " ");
		expect(state.doc.toString()).toBe("abc λογος ");
	});

	test("does nothing when disabled", () => {
		enabled = false;
		const state = typeChars(createState(""), "logos ");
		expect(state.doc.toString()).toBe("logos ");
	});

	test("paste is not converted", () => {
		const state = type(createState(""), "logos kai ", "input.paste");
		expect(state.doc.toString()).toBe("logos kai ");
	});

	test("programmatic changes are not converted", () => {
		const start = createState("logos");
		const state = start.update({ changes: { from: 5, insert: " " } }).state;
		expect(state.doc.toString()).toBe("logos ");
	});

	test("undo restores the Latin text and does not re-convert", () => {
		let state = typeChars(createState(""), "logos ");
		expect(state.doc.toString()).toBe("λογος ");
		state = runUndo(state);
		expect(state.doc.toString()).toBe("logos");
	});

	test("URLs, links, tags and code are skipped", () => {
		for (const word of ["https://example.com", "[[logos]]", "#logos", "`logos`", "www.logos.com"]) {
			const state = type(createState(word), " ");
			expect(state.doc.toString()).toBe(`${word} `);
		}
	});

	test("works with multiple cursors", () => {
		const start = EditorState.create({
			doc: "logos\nkai",
			selection: EditorSelection.create([EditorSelection.cursor(5), EditorSelection.cursor(9)]),
			extensions: [EditorState.allowMultipleSelections.of(true), history(), liveTypingExtension(convert)],
		});
		const state = type(start, " ");
		expect(state.doc.toString()).toBe("λογος \nκαι ");
	});
});
