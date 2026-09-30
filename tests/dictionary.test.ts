import { buildLookupUrl, cleanLookupTerm, wordAt } from "../src/dictionary";

describe("wordAt", () => {
	const line = "ἐν ἀρχῇ ἦν, ὁ λόγος.";

	test("finds the word around the cursor", () => {
		expect(wordAt(line, 0)).toBe("ἐν");
		expect(wordAt(line, 5)).toBe("ἀρχῇ");
		expect(wordAt(line, 7)).toBe("ἀρχῇ");
		expect(wordAt(line, line.length - 1)).toBe("λόγος");
	});

	test("returns empty string between words", () => {
		expect(wordAt("a  b", 2)).toBe("");
		expect(wordAt("", 0)).toBe("");
	});

	test("does not wrap around to the end of the line", () => {
		expect(wordAt(" λόγος", 0)).toBe("");
	});

	test("clamps out-of-range positions", () => {
		expect(wordAt("λόγος", 99)).toBe("λόγος");
	});
});

describe("cleanLookupTerm", () => {
	test("strips surrounding punctuation", () => {
		expect(cleanLookupTerm("  «λόγος», ")).toBe("λόγος");
		expect(cleanLookupTerm("(ὅτι)")).toBe("ὅτι");
		expect(cleanLookupTerm("...")).toBe("");
	});
});

describe("buildLookupUrl", () => {
	test("encodes the word", () => {
		expect(buildLookupUrl("https://logeion.uchicago.edu/{word}", "λόγος"))
			.toBe("https://logeion.uchicago.edu/%CE%BB%CF%8C%CE%B3%CE%BF%CF%82");
	});

	test("returns null without a placeholder", () => {
		expect(buildLookupUrl("https://example.com", "λόγος")).toBeNull();
	});
});
