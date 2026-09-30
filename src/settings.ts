import { GREEK_LETTERS, MARK_KEYS, Scheme, schemeKeys } from "./keymaps";
import { TransliterateOptions } from "./transliterate";

export interface GreekTyperSettings {
	isLiveTyping: boolean;
	useBetaCode: boolean;
	smartRoughBreathing: boolean;
	dictionaryUrl: string;
	/** Lowercase Greek letter → extra key sequence the user types for it. */
	customKeys: Record<string, string>;
}

export const DICTIONARY_PRESETS: Record<string, string> = {
	Logeion: "https://logeion.uchicago.edu/{word}",
	"Blue Letter Bible": "https://www.blueletterbible.org/search/search.cfm?Criteria={word}&t=TR",
	Perseus: "https://www.perseus.tufts.edu/hopper/morph?l={word}&la=greek",
};

export const DEFAULT_SETTINGS: GreekTyperSettings = {
	isLiveTyping: false,
	useBetaCode: false,
	smartRoughBreathing: true,
	dictionaryUrl: "https://logeion.uchicago.edu/{word}",
	customKeys: {},
};

const LEGACY_PERSEUS_URL = "http://www.perseus.tufts.edu/hopper/morph?l={word}&la=greek";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Resolve a legacy custom-mapping target (a phonetic key like "th", or a Greek letter) to a Greek letter. */
function legacyTargetToLetter(target: string): string | null {
	const lower = target.toLowerCase();
	const letter = schemeKeys("phonetic")[lower] ?? lower;
	return (GREEK_LETTERS as readonly string[]).includes(letter) ? letter : null;
}

function legacyCustomKeys(data: Record<string, unknown>): Record<string, string> {
	const pairs: Array<[string, string]> = [];
	if (typeof data.customMappingJson === "string") {
		try {
			const parsed: unknown = JSON.parse(data.customMappingJson);
			if (isRecord(parsed)) {
				for (const [key, value] of Object.entries(parsed)) {
					if (typeof value === "string") pairs.push([key, value]);
				}
			}
		} catch {
			// Unparseable legacy JSON: nothing to migrate.
		}
	}
	if (Array.isArray(data.customMappings)) {
		for (const entry of data.customMappings as unknown[]) {
			if (isRecord(entry) && typeof entry.key === "string" && typeof entry.replacement === "string") {
				pairs.push([entry.key, entry.replacement]);
			}
		}
	}
	const result: Record<string, string> = {};
	for (const [key, target] of pairs) {
		const letter = legacyTargetToLetter(target);
		if (letter && validateCustomKey(key) === null) result[letter] = key.trim();
	}
	return result;
}

/** Build valid settings from whatever `loadData()` returned, migrating older formats. */
export function normalizeSettings(raw: unknown): GreekTyperSettings {
	const data = isRecord(raw) ? raw : {};
	const settings: GreekTyperSettings = { ...DEFAULT_SETTINGS, customKeys: {} };

	if (typeof data.isLiveTyping === "boolean") settings.isLiveTyping = data.isLiveTyping;
	if (typeof data.useBetaCode === "boolean") settings.useBetaCode = data.useBetaCode;
	if (typeof data.smartRoughBreathing === "boolean") settings.smartRoughBreathing = data.smartRoughBreathing;
	if (typeof data.dictionaryUrl === "string") {
		settings.dictionaryUrl = data.dictionaryUrl === LEGACY_PERSEUS_URL
			? (DICTIONARY_PRESETS.Perseus ?? data.dictionaryUrl)
			: data.dictionaryUrl;
	}

	if (isRecord(data.customKeys)) {
		for (const [letter, key] of Object.entries(data.customKeys)) {
			if ((GREEK_LETTERS as readonly string[]).includes(letter) && typeof key === "string" && validateCustomKey(key) === null) {
				settings.customKeys[letter] = key;
			}
		}
	} else {
		settings.customKeys = legacyCustomKeys(data);
	}
	return settings;
}

/** Returns an error message, or null if `key` can be used as a custom key. */
export function validateCustomKey(key: string): string | null {
	const trimmed = key.trim();
	if (trimmed === "") return "Key can't be empty.";
	if (/\s/.test(trimmed)) return "Key can't contain spaces.";
	if ((MARK_KEYS as readonly string[]).some((m) => trimmed.includes(m))) {
		return "Key can't contain diacritic symbols.";
	}
	if (trimmed.includes("_")) return "Key can't contain an underscore.";
	return null;
}

/** Find another letter already typed with `key` (case-insensitive), by default or as a custom key. */
export function findCustomKeyConflict(
	customKeys: Record<string, string>,
	letter: string,
	key: string,
	scheme: Scheme,
): string | null {
	const lower = key.trim().toLowerCase();
	const defaultLetter = schemeKeys(scheme)[lower];
	if (defaultLetter && defaultLetter !== letter) return defaultLetter;
	for (const [other, otherKey] of Object.entries(customKeys)) {
		if (other !== letter && otherKey.toLowerCase() === lower) return other;
	}
	return null;
}

export function transliterateOptions(settings: GreekTyperSettings, diacritics: boolean): TransliterateOptions {
	const customKeys: Record<string, string> = {};
	for (const [letter, key] of Object.entries(settings.customKeys)) customKeys[key] = letter;
	return {
		scheme: settings.useBetaCode ? "beta" : "phonetic",
		diacritics,
		smartBreathing: settings.smartRoughBreathing,
		customKeys,
	};
}
