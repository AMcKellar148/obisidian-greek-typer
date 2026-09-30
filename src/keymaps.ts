export type Scheme = "phonetic" | "beta";

/** The 24 lowercase Greek letters in alphabetical order. */
export const GREEK_LETTERS = [
	"α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ",
	"ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
] as const;

export const LETTER_NAMES: Record<string, string> = {
	α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta",
	η: "eta", θ: "theta", ι: "iota", κ: "kappa", λ: "lambda", μ: "mu",
	ν: "nu", ξ: "xi", ο: "omicron", π: "pi", ρ: "rho", σ: "sigma",
	τ: "tau", υ: "upsilon", φ: "phi", χ: "chi", ψ: "psi", ω: "omega",
};

/** Lowercase Latin key sequence → Greek letter. Uppercase input produces capitals. */
const PHONETIC_KEYS: Record<string, string> = {
	a: "α", b: "β", g: "γ", d: "δ", e: "ε", z: "ζ", h: "η", th: "θ",
	i: "ι", k: "κ", l: "λ", m: "μ", n: "ν", x: "ξ", o: "ο", p: "π",
	r: "ρ", s: "σ", t: "τ", u: "υ", ph: "φ", ch: "χ", ps: "ψ", w: "ω",
};

const BETA_KEYS: Record<string, string> = {
	a: "α", b: "β", g: "γ", d: "δ", e: "ε", z: "ζ", h: "η", q: "θ",
	i: "ι", k: "κ", l: "λ", m: "μ", n: "ν", c: "ξ", o: "ο", p: "π",
	r: "ρ", s: "σ", t: "τ", u: "υ", f: "φ", x: "χ", y: "ψ", w: "ω",
};

export function schemeKeys(scheme: Scheme): Record<string, string> {
	return scheme === "beta" ? BETA_KEYS : PHONETIC_KEYS;
}

/** The default key sequence that types `letter` in `scheme`. */
export function defaultKeyFor(scheme: Scheme, letter: string): string {
	const keys = schemeKeys(scheme);
	return Object.keys(keys).find((k) => keys[k] === letter) ?? "";
}

/** Characters typed after a letter to add a diacritic. */
export const MARK_KEYS = ["/", "\\", "=", ")", "(", "|", "+"] as const;

/**
 * Separates two keys that would otherwise form a digraph,
 * e.g. `t_h` → τη instead of θ.
 */
export const DIGRAPH_BREAK = "_";
