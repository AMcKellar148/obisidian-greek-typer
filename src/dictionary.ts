const WORD_CHAR = /[\p{L}\p{M}]/u;

/** The word (letters and combining marks) touching position `ch` in `line`, or "" if there is none. */
export function wordAt(line: string, ch: number): string {
	let start = Math.max(0, Math.min(ch, line.length));
	let end = start;
	while (start > 0 && WORD_CHAR.test(line[start - 1] ?? "")) start--;
	while (end < line.length && WORD_CHAR.test(line[end] ?? "")) end++;
	return line.slice(start, end);
}

/** Trim whitespace and surrounding punctuation from a lookup term. */
export function cleanLookupTerm(text: string): string {
	return text.trim().replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "");
}

/** Fill `{word}` in a dictionary URL template. Returns null if the template has no placeholder. */
export function buildLookupUrl(template: string, word: string): string | null {
	if (!template.includes("{word}")) return null;
	return template.split("{word}").join(encodeURIComponent(word));
}
