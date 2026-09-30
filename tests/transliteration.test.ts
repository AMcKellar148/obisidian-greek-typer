import { transliterate, TransliterateOptions, applyFinalSigma, containsGreek } from "../src/transliterate";

const phonetic: TransliterateOptions = { scheme: "phonetic", diacritics: true, smartBreathing: true };
const phoneticNoSmartH: TransliterateOptions = { ...phonetic, smartBreathing: false };
const phoneticPlain: TransliterateOptions = { ...phonetic, diacritics: false };
const beta: TransliterateOptions = { scheme: "beta", diacritics: true, smartBreathing: true };
const betaPlain: TransliterateOptions = { ...beta, diacritics: false };

const polytonic = (s: string) => transliterate(s, phonetic);

describe("phonetic letters", () => {
	test.each([
		["logos", "λογος"],
		["kosmos", "κοσμος"],
		["theos", "θεος"],
		["philos", "φιλος"],
		["christos", "χριστος"],
		["psuche", "ψυχε"],
		["xenos", "ξενος"],
		["123", "123"],
	])("%s → %s", (input, expected) => {
		expect(transliterate(input, phoneticNoSmartH)).toBe(expected);
	});

	test("letters with no Greek equivalent pass through", () => {
		expect(transliterate("qvj", phonetic)).toBe("qvj");
	});

	test("existing Greek text is left alone", () => {
		expect(polytonic("λόγος")).toBe("λόγος");
	});
});

describe("capitals", () => {
	test.each([
		["Logos", "Λογος"],
		["Theos", "Θεος"],
		["THeos", "Θεος"],
		["I)hsou=s", "Ἰησοῦς"],
		["A)/nthrwpos", "Ἄνθρωπος"],
		["W)=|", "ᾮ"],
		["A|", "ᾼ"],
		["Ai)/", "Αἴ"],
	])("%s → %s", (input, expected) => {
		expect(polytonic(input)).toBe(expected);
	});
});

describe("diacritics", () => {
	test.each([
		["a/", "ά"],
		["e\\", "ὲ"],
		["h=", "ῆ"],
		["a)", "ἀ"],
		["a(", "ἁ"],
		["a)/", "ἄ"],
		["a(/", "ἅ"],
		["a)\\", "ἂ"],
		["e(/", "ἕ"],
		["o(/", "ὅ"],
		["h(/", "ἥ"],
		["i(/", "ἵ"],
		["u(/", "ὕ"],
		["w(/", "ὥ"],
		["w(=|", "ᾧ"],
		["h|", "ῃ"],
		["i+", "ϊ"],
		["r(", "ῥ"],
	])("%s → %s", (input, expected) => {
		expect(polytonic(input)).toBe(expected);
	});

	test("marks can be typed in any order", () => {
		expect(polytonic("a/)")).toBe("ἄ");
		expect(polytonic("w|=(")).toBe("ᾧ");
		expect(polytonic("i+/")).toBe("ΐ");
		expect(polytonic("i/+")).toBe("ΐ");
	});

	test("marks a letter can't take are left as typed", () => {
		expect(polytonic("e=")).toBe("ε=");
		expect(polytonic("o|")).toBe("ο|");
		expect(polytonic("a//")).toBe("ά/");
	});

	test("brackets after consonants stay brackets", () => {
		expect(polytonic("(logos)")).toBe("(λογος)");
		expect(polytonic("[kai]")).toBe("[και]");
	});

	test("plain mode ignores diacritic keys", () => {
		expect(transliterate("lo/gos", phoneticPlain)).toBe("λο/γος");
	});

	test("full phrase", () => {
		expect(polytonic("e)n a)rchh=| h)=n o( lo/gos")).toBe("ἐν ἀρχῇ ἦν ὁ λόγος");
	});
});

describe("digraph breaker", () => {
	test("t_h types tau + eta instead of theta", () => {
		expect(polytonic("t_h/n")).toBe("τήν");
		expect(polytonic("t_h=s")).toBe("τῆς");
		expect(polytonic("t_h=|")).toBe("τῇ");
		expect(polytonic("p_s")).toBe("πς");
	});

	test("other underscores are kept", () => {
		expect(polytonic("a_b")).toBe("α_β");
		expect(polytonic("_logos_")).toBe("_λογος_");
	});
});

describe("smart h (rough breathing)", () => {
	test.each([
		["ho", "ὁ"],
		["hodos", "ὁδος"],
		["ho/ti", "ὅτι"],
		["ha/gios", "ἅγιος"],
		["ho/s", "ὅς"],
		["hw/sper", "ὥσπερ"],
		["hhme/ra", "ἡμέρα"],
		["hrh=ma", "ῥῆμα"],
		["Hodos", "Ὁδος"],
	])("%s → %s", (input, expected) => {
		expect(polytonic(input)).toBe(expected);
	});

	test("breathing goes on the second vowel of a diphthong", () => {
		expect(polytonic("hoi")).toBe("οἱ");
		expect(polytonic("hoi/")).toBe("οἵ");
		expect(polytonic("huio/s")).toBe("υἱός");
		expect(polytonic("hai")).toBe("αἱ");
		expect(polytonic("Hoi")).toBe("Οἱ");
	});

	test("explicit breathing wins", () => {
		expect(polytonic("hui(o/s")).toBe("υἱός");
	});

	test("only applies at the start of a word", () => {
		expect(polytonic("the")).toBe("θε");
		expect(polytonic("ah")).toBe("αη");
		expect(polytonic("h")).toBe("η");
		expect(polytonic("h)=n")).toBe("ἦν");
	});

	test("plain mode drops the h", () => {
		expect(transliterate("hodos", phoneticPlain)).toBe("οδος");
	});

	test("disabled", () => {
		expect(transliterate("hodos", phoneticNoSmartH)).toBe("ηοδος");
	});

	test("never applies in Beta Code, where h is eta", () => {
		expect(transliterate("hmera", beta)).toBe("ημερα");
		expect(transliterate("he", betaPlain)).toBe("ηε");
	});
});

describe("Beta Code", () => {
	test.each([
		["qeo/s", "θεός"],
		["a)/nqrwpos", "ἄνθρωπος"],
		["yuxh/", "ψυχή"],
		["filo/s", "φιλός"],
		["cei=nos", "ξεῖνος"],
		["*A", "*Α"],
		["A)/NQRWPOS", "ἌΝΘΡΩΠΟΣ"],
	])("%s → %s", (input, expected) => {
		expect(transliterate(input, beta)).toBe(expected);
	});

	test("phonetic digraphs are not special", () => {
		expect(transliterate("th", beta)).toBe("τη");
	});
});

describe("final sigma", () => {
	test.each([
		["logos", "λογος"],
		["logos.", "λογος."],
		["(logos)", "(λογος)"],
		["**logos**", "**λογος**"],
		["logos\n", "λογος\n"],
		["\"logos\"", "\"λογος\""],
		["kosmos kai", "κοσμος και"],
	])("%j → %j", (input, expected) => {
		expect(polytonic(input)).toBe(expected);
	});

	test("medial sigma is unchanged", () => {
		expect(polytonic("sw=ma")).toBe("σῶμα");
		expect(applyFinalSigma("σῶμα")).toBe("σῶμα");
	});
});

describe("custom keys", () => {
	const custom: TransliterateOptions = { ...phonetic, customKeys: { q: "θ", c: "χ", v: "ϝ" } };

	test("custom keys work alongside the defaults", () => {
		expect(transliterate("qeos", custom)).toBe("θεος");
		expect(transliterate("theos", custom)).toBe("θεος");
		expect(transliterate("Qeos", custom)).toBe("Θεος");
		expect(transliterate("cristos", custom)).toBe("χριστος");
	});

	test("multi-character custom keys take priority over shorter matches", () => {
		expect(transliterate("kha/os", { ...phonetic, customKeys: { kh: "χ" } })).toBe("χάος");
	});
});

describe("containsGreek", () => {
	test("detects Greek", () => {
		expect(containsGreek("λόγος")).toBe(true);
		expect(containsGreek("ὅτι")).toBe(true);
		expect(containsGreek("logos")).toBe(false);
	});
});
