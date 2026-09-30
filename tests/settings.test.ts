import {
	DEFAULT_SETTINGS,
	findCustomKeyConflict,
	normalizeSettings,
	transliterateOptions,
	validateCustomKey,
} from "../src/settings";

describe("normalizeSettings", () => {
	test("returns defaults for empty or invalid data", () => {
		expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings("nonsense")).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings({ isLiveTyping: "yes" })).toEqual(DEFAULT_SETTINGS);
	});

	test("does not share the default customKeys object", () => {
		const settings = normalizeSettings(null);
		settings.customKeys.α = "q";
		expect(DEFAULT_SETTINGS.customKeys).toEqual({});
	});

	test("keeps valid values", () => {
		const settings = normalizeSettings({
			isLiveTyping: true,
			useBetaCode: true,
			smartRoughBreathing: false,
			dictionaryUrl: "https://example.com/{word}",
			customKeys: { θ: "q", bogus: "z", χ: "c c" },
		});
		expect(settings).toEqual({
			isLiveTyping: true,
			useBetaCode: true,
			smartRoughBreathing: false,
			dictionaryUrl: "https://example.com/{word}",
			customKeys: { θ: "q" },
		});
	});

	test("migrates the legacy customMappings array", () => {
		const settings = normalizeSettings({
			customMappings: [
				{ key: "q", replacement: "th" },
				{ key: "Q", replacement: "Th" },
				{ key: "v", replacement: "not a letter" },
			],
		});
		expect(settings.customKeys).toEqual({ θ: "Q" });
	});

	test("migrates the legacy customMappingJson string", () => {
		const settings = normalizeSettings({ customMappingJson: JSON.stringify({ c: "ch", f: "ph" }) });
		expect(settings.customKeys).toEqual({ χ: "c", φ: "f" });
		expect(normalizeSettings({ customMappingJson: "{broken" }).customKeys).toEqual({});
	});

	test("upgrades the old http Perseus URL to https", () => {
		const settings = normalizeSettings({ dictionaryUrl: "http://www.perseus.tufts.edu/hopper/morph?l={word}&la=greek" });
		expect(settings.dictionaryUrl).toBe("https://www.perseus.tufts.edu/hopper/morph?l={word}&la=greek");
	});
});

describe("custom key validation", () => {
	test("rejects unusable keys", () => {
		expect(validateCustomKey("q")).toBeNull();
		expect(validateCustomKey("kh")).toBeNull();
		expect(validateCustomKey("")).not.toBeNull();
		expect(validateCustomKey("a b")).not.toBeNull();
		expect(validateCustomKey("a/")).not.toBeNull();
		expect(validateCustomKey("t_")).not.toBeNull();
	});

	test("finds conflicts case-insensitively", () => {
		expect(findCustomKeyConflict({ θ: "q" }, "χ", "Q", "phonetic")).toBe("θ");
		expect(findCustomKeyConflict({ θ: "q" }, "θ", "q", "phonetic")).toBeNull();
		expect(findCustomKeyConflict({ θ: "q" }, "χ", "c", "phonetic")).toBeNull();
	});

	test("rejects another letter's default key", () => {
		expect(findCustomKeyConflict({}, "β", "a", "phonetic")).toBe("α");
		expect(findCustomKeyConflict({}, "θ", "TH", "phonetic")).toBeNull();
		expect(findCustomKeyConflict({}, "χ", "c", "beta")).toBe("ξ");
	});
});

describe("transliterateOptions", () => {
	test("maps settings to converter options", () => {
		const options = transliterateOptions({ ...DEFAULT_SETTINGS, useBetaCode: true, customKeys: { θ: "q" } }, false);
		expect(options).toEqual({ scheme: "beta", diacritics: false, smartBreathing: true, customKeys: { q: "θ" } });
	});
});
