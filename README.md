# Greek Typer for Obsidian

Type polytonic Greek in Obsidian with Latin keys. Choose a **phonetic** scheme (`th` → θ) or standard **Beta Code** (`q` → θ). Accents, breathings, iota subscripts and final sigma are handled for you. You can also look up words in an online dictionary.

## Features

- **Live typing**: each word turns into Greek when you type a space or start a new line. Code, links, tags and front matter are left alone. Undo brings back what you typed.
- **Convert a selection** to polytonic Greek, or to Greek letters without diacritics.
- **Two schemes**: phonetic or Beta Code, plus your own custom keys for any letter.
- **Smart 'h'**: `hodos` → ὁδος, `ho/ti` → ὅτι, `hoi` → οἱ (phonetic scheme only).
- **Dictionary lookup** from the command palette or the editor's right-click menu: Logeion, LSJ, Wiktionary, Perseus, Blue Letter Bible, or any URL you choose. Look up in your default dictionary, or pick another one for a single lookup.
- **Remove diacritics** from a selection (ἐν ἀρχῇ → εν αρχη), handy for searching.
- **Typing guide** in the sidebar showing your current keys. Select a letter to insert it.

## Usage

### Commands

Open the command palette (`Ctrl/Cmd + P`) and search for "Greek Typer":

| Command | What it does |
| --- | --- |
| Toggle live typing | Turn live typing on or off. You can also select the Ω ribbon icon or the **Greek: on/off** status bar item. |
| Convert selection to polytonic Greek | Convert the selected text, including diacritics. |
| Convert selection to Greek letters (no diacritics) | Convert letters only. Diacritic keys are left as typed. |
| Remove Greek diacritics from selection | Strip accents, breathings, iota subscripts and diaereses. |
| Look up word in dictionary | Look up the selected word, or the word under the cursor, in your default dictionary. |
| Look up word in a chosen dictionary | Pick which dictionary to use for this lookup. |
| Open typing guide | Show the key reference in the right sidebar. Select a letter to insert it into your note; hold Shift for a capital. |
| Switch between phonetic and Beta Code keys | Change the keyboard scheme. |
| Toggle smart 'h' rough breathing | Turn smart 'h' on or off. |

### Letters

| Greek | Phonetic | Beta Code | | Greek | Phonetic | Beta Code |
| --- | --- | --- | --- | --- | --- | --- |
| α | a | a | | ν | n | n |
| β | b | b | | ξ | x | c |
| γ | g | g | | ο | o | o |
| δ | d | d | | π | p | p |
| ε | e | e | | ρ | r | r |
| ζ | z | z | | σ/ς | s | s |
| η | h | h | | τ | t | t |
| θ | th | q | | υ | u | u |
| ι | i | i | | φ | ph | f |
| κ | k | k | | χ | ch | x |
| λ | l | l | | ψ | ps | y |
| μ | m | m | | ω | w | w |

Type a capital Latin letter for a capital Greek letter: `Logos` → Λογος, `I)hsou=s` → Ἰησοῦς.

In Beta Code you can also mark capitals with `*`, the standard Beta Code way. Diacritics can go before the letter (`*)ihsou=s` → Ἰησοῦς) or after it (`*a)/nqrwpos` → Ἄνθρωπος). Because a single `*` before a letter means "capital", use `_` for Markdown italics in Beta Code mode. `**bold**` is unaffected.

### Diacritics

Type these **after** the vowel, in any order:

| Key | Mark | Example |
| --- | --- | --- |
| `/` | acute | `a/` → ά |
| `\` | grave | `a\` → ὰ |
| `=` | circumflex | `a=` → ᾶ |
| `)` | smooth breathing | `a)` → ἀ |
| `(` | rough breathing | `a(` → ἁ |
| `|` | iota subscript | `a|` → ᾳ |
| `+` | diaeresis | `i+` → ϊ |

Marks combine: `a)/` → ἄ, `w(=|` → ᾧ. A mark a letter can't take stays as typed (`e=` → ε=), so brackets after consonants stay brackets: `(logos)` → (λογος).

### Tips

- **τη, πη, πσ in phonetic mode**: put `_` between the letters to stop them from forming θ, φ or ψ: `t_h/n` → τήν, `t_h=s` → τῆς.
- **Smart 'h'**: a word-initial `h` before a vowel or `r` becomes a rough breathing. It goes on the second vowel of a diphthong (`hoi` → οἱ). To start a word with η and a rough breathing, type `hh`: `hhme/ra` → ἡμέρα.
- **Final sigma** is automatic: σ at the end of a word becomes ς.

## Settings

- **Live typing**: on or off.
- **Keyboard scheme**: phonetic or Beta Code.
- **Smart 'h' for rough breathing** (phonetic only).
- **Dictionary** and **Dictionary URL**: your default dictionary. Choose a preset (Logeion, LSJ, Wiktionary, Perseus, Blue Letter Bible) or enter a URL with `{word}` where the word goes.
- **Custom keys**: add your own key for any letter, e.g. `q` for θ. The default keys keep working.

## Network use

Greek Typer works offline. The only network access is dictionary lookup, which you start yourself. It sends the word you look up to the dictionary website you choose (Logeion by default). Lookups open in Obsidian's **Web viewer** core plugin when it's enabled. Otherwise they open in your browser. Nothing else leaves your device, and there is no telemetry.

## Installation

Greek Typer isn't in the community plugin browser yet. To install it manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Copy them into `<your vault>/.obsidian/plugins/greek-typer/`.
3. Reload Obsidian and enable **Greek Typer** in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev     # rebuild on change
npm run check   # lint (including Obsidian's plugin rules), tests and production build
```

Source lives in `src/`. The transliteration engine (`src/transliterate.ts`) and the live-typing extension (`src/live-typing.ts`) have no Obsidian dependency and are covered by the tests in `tests/`.
