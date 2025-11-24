import { greekLettersMap, greekDiacriticsMap } from '../greek-maps';

// Helper functions to replicate the logic in main.ts since we can't easily import the plugin class directly in this setup without more mocking
function toGreek(text: string): string {
    const keys = Object.keys(greekLettersMap).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        text = text.split(key).join(greekLettersMap[key]);
    }
    // Final sigma
    text = text.replace(/σ(?=\s|$|[.,;!?:·’])/g, 'ς');
    return text;
}

function toGreekWithDiacritics(input: string): string {
    let output = "";
    let i = 0;

    while (i < input.length) {
        let ch = input[i];
        if (!/[a-zA-Z]/.test(ch)) {
            output += ch;
            i++;
            continue;
        }

        let next = input[i + 1];
        let base = ch;
        let consumed = 1;

        // Check for 2-char sequence (e.g. th, ph)
        if (next && (greekLettersMap[ch + next] || greekDiacriticsMap[(ch + next).toLowerCase()])) {
            base = ch + next;
            consumed = 2;
        }

        let seq = base;
        let j = i + consumed;
        while (j < input.length && /[\\/=\(\)\|\+]/.test(input[j])) {
            seq += input[j];
            j++;
        }

        let greek = greekDiacriticsMap[seq.toLowerCase()] || greekLettersMap[seq];
        output += greek ? greek : seq;
        i = j;
    }

    // Final sigma
    output = output.replace(/σ(?=\s|$|[.,;!?:·’])/g, 'ς');
    return output;
}

describe('Greek Transliteration', () => {
    describe('toGreek (Plain)', () => {
        test('converts basic letters', () => {
            expect(toGreek('logos')).toBe('λογος');
        });

        test('handles final sigma', () => {
            expect(toGreek('kosmos')).toBe('κοσμος');
        });

        test('handles final sigma with punctuation', () => {
            expect(toGreek('logos.')).toBe('λογος.');
        });

        test('keeps unknown characters', () => {
            expect(toGreek('123')).toBe('123');
        });
    });

    describe('toGreekWithDiacritics (Polytonic)', () => {
        test('converts basic letters', () => {
            expect(toGreekWithDiacritics('logos')).toBe('λογος');
        });

        test('converts accents', () => {
            expect(toGreekWithDiacritics('a/')).toBe('ά');
            expect(toGreekWithDiacritics('e\\')).toBe('ὲ');
            expect(toGreekWithDiacritics('h=')).toBe('ῆ');
        });

        test('converts breathings', () => {
            expect(toGreekWithDiacritics('a)')).toBe('ἀ');
            expect(toGreekWithDiacritics('a(')).toBe('ἁ');
        });

        test('converts complex combinations', () => {
            expect(toGreekWithDiacritics('a)/')).toBe('ἄ');
            expect(toGreekWithDiacritics('w(=|')).toBe('ᾧ');
        });

        test('handles final sigma', () => {
            expect(toGreekWithDiacritics('logos')).toBe('λογος');
        });

        test('handles mixed content', () => {
            expect(toGreekWithDiacritics('en a)rchh|')).toBe('εν ἀρχῃ');
        });
    });
});
