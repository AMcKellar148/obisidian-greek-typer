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

function backspace(state: EditorState): EditorState {
	const head = state.selection.main.head;
	return state.update({ changes: { from: head - 1, to: head }, userEvent: "delete.backward" }).state;
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
		const state = type(typeChars(createState(""), "ho/ti"), "\n", "input");
		expect(state.doc.toString()).toBe("ὅτι\n");
	});

	test("converts each word in a sentence", () => {
		const state = typeChars(createState(""), "e)n a)rchh=| ");
		expect(state.doc.toString()).toBe("ἐν ἀρχῇ ");
	});

	test("only the word before the cursor is converted", () => {
		const state = typeChars(createState("abc "), "logos ");
		expect(state.doc.toString()).toBe("abc λογος ");
	});

	test("does nothing when disabled", () => {
		enabled = false;
		const state = typeChars(createState(""), "logos ");
		expect(state.doc.toString()).toBe("logos ");
	});

	test("programmatic changes are not converted", () => {
		const start = createState("logos");
		const state = start.update({ changes: { from: 5, insert: " " } }).state;
		expect(state.doc.toString()).toBe("logos ");
	});

	test("backspace while typing a word keeps it eligible", () => {
		let state = typeChars(createState(""), "logoz");
		state = backspace(state);
		state = typeChars(state, "s ");
		expect(state.doc.toString()).toBe("λογος ");
	});

	test("works with multiple cursors", () => {
		let state = EditorState.create({
			doc: "\n",
			selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(1)]),
			extensions: [EditorState.allowMultipleSelections.of(true), history(), liveTypingExtension(convert)],
		});
		state = typeChars(state, "kai ");
		expect(state.doc.toString()).toBe("και \nκαι ");
	});
});

describe("text the user didn't just type is left alone", () => {
	test("undo restores the Latin text", () => {
		let state = typeChars(createState(""), "logos ");
		expect(state.doc.toString()).toBe("λογος ");
		state = runUndo(state);
		expect(state.doc.toString()).toBe("logos");
	});

	test("a space after undo keeps the Latin text", () => {
		let state = runUndo(typeChars(createState(""), "logos "));
		state = typeChars(state, " kai ");
		expect(state.doc.toString()).toBe("logos και ");
	});

	test("paste is not converted, even by the next space", () => {
		let state = type(createState(""), "logos kai", "input.paste");
		state = type(state, " ");
		expect(state.doc.toString()).toBe("logos kai ");
	});

	test("typing after a paste converts only the new word", () => {
		let state = type(createState(""), "logos ", "input.paste");
		state = typeChars(state, "kai ");
		expect(state.doc.toString()).toBe("logos και ");
	});

	test("a space after moving the cursor to an existing word keeps it", () => {
		let state = createState("logos", 0);
		state = state.update({ selection: EditorSelection.cursor(5), userEvent: "select.pointer" }).state;
		state = type(state, " ");
		expect(state.doc.toString()).toBe("logos ");
	});

	test("an edit elsewhere doesn't stop the word being typed from converting", () => {
		let state = typeChars(createState("x\n"), "logos");
		state = state.update({ changes: { from: 0, insert: "synced " } }).state;
		state = type(state, " ");
		expect(state.doc.toString()).toBe("synced x\nλογος ");
	});
});

describe("skipped contexts", () => {
	test("URLs, links, tags and code words are skipped", () => {
		for (const word of ["https://example.com", "[[logos]]", "#logos", "`logos`", "www.logos.com"]) {
			const state = typeChars(createState(""), `${word} `);
			expect(state.doc.toString()).toBe(`${word} `);
		}
	});

	test("words inside closed inline code are skipped", () => {
		// Cursor inside `…|` with the closing backtick already there (Obsidian auto-pairs it).
		let state = createState("`code `", 6);
		state = typeChars(state, "logos ");
		expect(state.doc.toString()).toBe("`code logos `");
	});

	test("words inside unclosed inline code are skipped", () => {
		const state = typeChars(createState(""), "`code logos ");
		expect(state.doc.toString()).toBe("`code logos ");
	});

	test("words after closed inline code are converted", () => {
		const state = typeChars(createState(""), "`code` logos ");
		expect(state.doc.toString()).toBe("`code` λογος ");
	});
});
