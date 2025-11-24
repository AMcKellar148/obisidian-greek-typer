export const betaLettersMap: Record<string, string> = {
    a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η',
    q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', c: 'ξ', o: 'ο',
    p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', x: 'χ', y: 'ψ', w: 'ω',
    A: 'Α', B: 'Β', G: 'Γ', D: 'Δ', E: 'Ε', Z: 'Ζ', H: 'Η',
    Q: 'Θ', I: 'Ι', K: 'Κ', L: 'Λ', M: 'Μ', N: 'Ν', C: 'Ξ', O: 'Ο',
    P: 'Π', R: 'Ρ', S: 'Σ', T: 'Τ', U: 'Υ', F: 'Φ', X: 'Χ', Y: 'Ψ', W: 'Ω',
};

// Helper to generate diacritics map programmatically would be better, 
// but for consistency with existing code, we'll define explicit combinations 
// where they differ or are common. 
// However, the logic in main.ts handles diacritics by looking up the sequence.
// Beta code uses the same diacritic symbols as our default map for the most part:
// ) smooth, ( rough, / acute, \ grave, = circumflex, + diaeresis, | iota sub
// So we can largely reuse the structure, just ensuring the base letters match.

export const betaDiacriticsMap: Record<string, string> = {
    // Alpha
    "a": "α", "a/": "ά", "a\\": "ὰ", "a=": "ᾶ",
    "a)": "ἀ", "a(": "ἁ", "a)/": "ἄ", "a(\\": "ἃ", "a(=": "ἇ", "a)=": "ἆ",
    "a)|": "ᾀ", "a(|": "ᾁ", "a)/|": "ᾄ", "a(\\|": "ᾃ", "a)=|": "ᾆ", "a(=|": "ᾇ",
    "a|": "ᾳ", "a/|": "ᾴ", "a\\|": "ᾲ", "a=|": "ᾷ",

    // Epsilon
    "e": "ε", "e/": "έ", "e\\": "ὲ", "e)": "ἐ", "e(": "ἑ", "e)/": "ἔ", "e(\\": "ἓ",

    // Eta
    "h": "η", "h/": "ή", "h\\": "ὴ", "h=": "ῆ", "h)": "ἠ", "h(": "ἡ", "h)/": "ἤ", "h(\\": "ἣ", "h(=": "ἧ", "h)=": "ἦ",
    "h)|": "ᾐ", "h(|": "ᾑ", "h)/|": "ᾔ", "h(\\|": "ᾓ", "h)=|": "ᾖ", "h(=|": "ᾗ",
    "h|": "ῃ", "h/|": "ῄ", "h\\|": "ῂ", "h=|": "ῇ",

    // Iota
    "i": "ι", "i/": "ί", "i\\": "ὶ", "i=": "ῖ", "i+": "ϊ", "i/+": "ΐ", "i\\+": "ῒ", "i=+": "ῗ",
    "i)": "ἰ", "i(": "ἱ", "i)/": "ἴ", "i(\\": "ἳ", "i(=": "ἷ", "i)=": "ἶ",

    // Omicron
    "o": "ο", "o/": "ό", "o\\": "ὸ", "o)": "ὀ", "o(": "ὁ", "o)/": "ὄ", "o(\\": "ὃ",

    // Upsilon
    "u": "υ", "u/": "ύ", "u\\": "ὺ", "u=": "ῦ", "u+": "ϋ", "u/+": "ΰ", "u\\+": "ῢ", "u=+": "ῧ",
    "u)": "ὐ", "u(": "ὑ", "u)/": "ὔ", "u(\\": "ὓ", "u(=": "ὗ", "u)=": "ὖ",

    // Omega
    "w": "ω", "w/": "ώ", "w\\": "ὼ", "w=": "ῶ", "w)": "ὠ", "w(": "ὡ", "w)/": "ὤ", "w(\\": "ὣ", "w(=": "ὧ", "w)=": "ὦ",
    "w)|": "ᾠ", "w(|": "ᾡ", "w)/|": "ᾤ", "w(\\|": "ᾣ", "w)=|": "ᾦ", "w(=|": "ᾧ",
    "w|": "ῳ", "w/|": "ῴ", "w\\|": "ῲ", "w=|": "ῷ",

    // Rho
    "r(": "ῥ", "r)": "ῤ",
};
