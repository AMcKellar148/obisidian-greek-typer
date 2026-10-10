import { DIGRAPH_BREAK, Scheme, schemeKeys } from "./keymaps";

export interface TransliterateOptions {
	scheme: Scheme;
	/** Convert `/ \ = ) ( | +` after vowels into accents, breathings, etc. */
	diacritics: boolean;
	/** Phonetic only: word-initial `h` before a vowel or rho becomes a rough breathing. */
	smartBreathing: boolean;
	/** Extra key sequences → lowercase Greek letter. Case-insensitive, used in addition to the defaults. */
	customKeys?: Record<string, string>;
}

type MarkClass = "breathing" | "diaeresis" | "accent" | "iota";

const MARKS: Record<string, { cls: MarkClass; combining: string }> = {
	")": { cls: "breathing", combining: "̓" },
	"(": { cls: "breathing", combining: "̔" },
	"+": { cls: "diaeresis", combining: "̈" },
	"/": { cls: "accent", combining: "́" },
	"\\": { cls: "accent", combining: "̀" },
	"=": { cls: "accent", combining: "͂" },
	"|": { cls: "iota", combining: "ͅ" },
};

/** Canonical order for combining marks so NFC composes them into precomposed characters. */
const MARK_ORDER: MarkClass[] = ["breathing", "diaeresis", "accent", "iota"];

/** Which marks each base letter can carry. */
const ALLOWED_MARKS: Record<string, string> = {
	α: ")(/\\=|",
	ε: ")(/\\",
	η: ")(/\\=|",
	ι: ")(/\\=+",
	ο: ")(/\\",
	υ: ")(/\\=+",
	ω: ")(/\\=|",
	ρ: ")(",
};

const VOWELS = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);
const DIPHTHONGS = new Set(["αι", "ει", "οι", "υι", "αυ", "ευ", "ου", "ηυ"]);

interface LetterToken {
	kind: "letter";
	letter: string;
	upper: boolean;
	raw: string;
	marks: Partial<Record<MarkClass, string>>;
}
interface TextToken {
	kind: "text";
	text: string;
}
type Token = LetterToken | TextToken;

function buildKeyTable(options: TransliterateOptions): Map<string, string> {
	const table = new Map<string, string>(Object.entries(schemeKeys(options.scheme)));
	for (const [key, letter] of Object.entries(options.customKeys ?? {})) {
		if (key) table.set(key.toLowerCase(), letter);
	}
	return table;
}

function isUpper(ch: string): boolean {
	return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

function tryAddMark(token: LetterToken, key: string): boolean {
	const mark = MARKS[key];
	if (!mark || !(ALLOWED_MARKS[token.letter] ?? "").includes(key)) return false;
	if (token.marks[mark.cls]) return false;
	// A breathing and a diaeresis never appear on the same vowel.
	if (mark.cls === "breathing" && token.marks.diaeresis) return false;
	if (mark.cls === "diaeresis" && token.marks.breathing) return false;
	token.marks[mark.cls] = mark.combining;
	return true;
}

/** Beta Code capital marker: `*a` → Α, with marks before (`*)/a`) or after (`*a)/`) the letter. */
const BETA_CAPITAL = "*";

function matchBetaCapital(
	input: string,
	at: number,
	options: TransliterateOptions,
	matchLetter: (at: number) => LetterToken | null,
): { token: LetterToken; letterStart: number } | null {
	// `**bold**` is Markdown, not a capital.
	if (input[at - 1] === BETA_CAPITAL || input[at + 1] === BETA_CAPITAL) return null;

	let letterStart = at + 1;
	if (options.diacritics) {
		while (letterStart < input.length && (input[letterStart] ?? "") in MARKS) letterStart++;
	}
	const token = matchLetter(letterStart);
	if (!token) return null;
	token.upper = true;
	for (const key of input.slice(at + 1, letterStart)) {
		if (!tryAddMark(token, key)) return null;
	}
	return { token, letterStart };
}

function tokenize(input: string, options: TransliterateOptions): Token[] {
	const table = buildKeyTable(options);
	const maxKeyLength = Math.max(...Array.from(table.keys(), (k) => k.length));
	const digraphStarts = new Set(Array.from(table.keys()).filter((k) => k.length > 1).map((k) => k.slice(0, 2)));
	const matchLetter = (at: number): LetterToken | null => {
		for (let len = Math.min(maxKeyLength, input.length - at); len > 0; len--) {
			const raw = input.slice(at, at + len);
			const letter = table.get(raw.toLowerCase());
			if (letter) return { kind: "letter", letter, upper: isUpper(raw[0] ?? ""), raw, marks: {} };
		}
		return null;
	};

	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		const prev = tokens[tokens.length - 1];

		// `t_h` → τη: drop an underscore only where it actually splits a digraph.
		if (input[i] === DIGRAPH_BREAK && prev?.kind === "letter" && i + 1 < input.length) {
			const pair = (prev.raw.slice(-1) + input[i + 1]).toLowerCase();
			if (digraphStarts.has(pair)) {
				i++;
				continue;
			}
		}

		let matched: LetterToken | null = null;
		let start = i;
		if (options.scheme === "beta" && input[i] === BETA_CAPITAL) {
			const capital = matchBetaCapital(input, i, options, matchLetter);
			if (capital) {
				matched = capital.token;
				start = capital.letterStart;
			}
		} else {
			matched = matchLetter(i);
		}

		if (!matched) {
			tokens.push({ kind: "text", text: input[i] ?? "" });
			i++;
			continue;
		}

		i = start + matched.raw.length;
		if (options.diacritics) {
			while (i < input.length && tryAddMark(matched, input[i] ?? "")) i++;
		}
		tokens.push(matched);
	}
	return tokens;
}

/**
 * Word-initial `h` + vowel/rho → rough breathing on that vowel (on the second
 * vowel of a diphthong, as Greek orthography requires: `hoi` → οἱ).
 */
function applySmartBreathing(tokens: Token[], options: TransliterateOptions): Token[] {
	const result: Token[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		const next = tokens[i + 1];
		const prev = result[result.length - 1];
		const atWordStart = !prev || prev.kind === "text";

		if (
			token?.kind === "letter" && token.raw.toLowerCase() === "h" && token.letter === "η" &&
			Object.keys(token.marks).length === 0 && atWordStart &&
			next?.kind === "letter" && (VOWELS.has(next.letter) || next.letter === "ρ")
		) {
			let target = next;
			const after = tokens[i + 2];
			if (
				Object.keys(next.marks).length === 0 && after?.kind === "letter" &&
				DIPHTHONGS.has(next.letter + after.letter) && !after.marks.diaeresis
			) {
				target = after;
			}
			if (token.upper) next.upper = true;
			if (options.diacritics && !target.marks.breathing && !target.marks.diaeresis) {
				target.marks.breathing = MARKS["("]?.combining;
			}
			continue; // drop the `h`
		}
		if (token) result.push(token);
	}
	return result;
}

function render(tokens: Token[]): string {
	let out = "";
	for (const token of tokens) {
		if (token.kind === "text") {
			out += token.text;
			continue;
		}
		out += token.upper ? token.letter.toUpperCase() : token.letter;
		for (const cls of MARK_ORDER) out += token.marks[cls] ?? "";
	}
	return out.normalize("NFC");
}

/** σ at the end of a word becomes ς. */
export function applyFinalSigma(text: string): string {
	return text.replace(/σ(?![\p{L}\p{M}])/gu, "ς");
}

/** Convert Latin transliteration to Greek. Non-matching characters pass through unchanged. */
export function transliterate(input: string, options: TransliterateOptions): string {
	let tokens = tokenize(input, options);
	if (options.smartBreathing && options.scheme === "phonetic") {
		tokens = applySmartBreathing(tokens, options);
	}
	return applyFinalSigma(render(tokens));
}

/** Remove accents, breathings, iota subscripts and diaereses from Greek letters: ἄνθρωπος → ανθρωπος. */
export function stripDiacritics(text: string): string {
	return text
		.normalize("NFD")
		.replace(/([\u0370-\u03FF\u1F00-\u1FFF])[\u0300-\u036F]+/g, "$1")
		.normalize("NFC");
}

export function containsGreek(text: string): boolean {
	return /[Ͱ-Ͽἀ-῿]/.test(text);
}
