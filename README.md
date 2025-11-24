# Obsidian Greek Typer Plugin

A powerful plugin for Obsidian that allows you to type Koine Greek easily using Latin transliteration. It supports both **Phonetic** and **Beta Code** mappings, smart breathing marks, and integrated dictionary lookups.

---

## Features

### ⌨️ Typing & Conversion
*   **Live Typing**: Automatically converts words to Greek as you type (Disabled by default).
*   **Selection Conversion**: Convert existing text to Greek (Plain or Polytonic) or back to Latin.
*   **Two Mapping Modes**:
    *   **Phonetic**: Intuitive mapping (e.g., `th` → `θ`, `ph` → `φ`).
    *   **Beta Code**: Standard academic mapping (e.g., `q` → `θ`, `f` → `φ`, `c` → `ξ`).
*   **Smart 'h'**: Automatically treats an initial `h` before a vowel as a rough breathing mark (e.g., `hodos` → `ὁδός`).

### 📖 Dictionary Lookup
*   **Integrated View**: Look up Greek words directly within Obsidian using the **Core Web Viewer** plugin.
*   **Presets**: Quickly switch between **Logeion**, **Blue Letter Bible (Textus Receptus)**, and **Perseus**.
*   **Context Menu**: Right-click any Greek word to look it up instantly.

### ℹ️ Dynamic Typing Guide
*   A side pane guide that shows the current key mappings and diacritic codes.
*   Automatically updates based on your selected mapping mode (Phonetic vs. Beta Code).

---

## Usage

### Commands
Open the Command Palette (`Ctrl/Cmd + P`) and search for "Greek Typer":

*   **Toggle Live Typing**: Enable/disable automatic conversion while typing.
*   **Convert to Greek**: Converts selected Latin text to plain Greek letters.
*   **Convert to Greek (with Diacritics)**: Converts selected text to polytonic Greek.
*   **Convert to Latin**: Converts Greek text back to Latin (preserves rough breathing as `h`).
*   **Look up selection in Dictionary**: Opens the dictionary view for the selected word.
*   **Toggle Beta Code Mapping**: Switch between Phonetic and Beta Code layouts.
*   **Toggle Smart 'h'**: Enable/disable the smart rough breathing feature.

### Key Mappings

#### Diacritics (Common to both modes)
Type these symbols **after** the vowel:
*   `/` Acute (ά)
*   `\` Grave (ὰ)
*   `=` Circumflex (ᾶ)
*   `)` Smooth Breathing (ἀ)
*   `(` Rough Breathing (ἁ)
*   `|` Iota Subscript (ᾳ)
*   `+` Diaeresis (ϊ)

#### Phonetic Mode (Default)
*   `th` → `θ`
*   `ph` → `φ`
*   `ch` → `χ`
*   `ps` → `ψ`
*   `w` → `ω`
*   `h` → `η` (unless Smart 'h' is active)

#### Beta Code Mode
*   `q` → `θ`
*   `f` → `φ`
*   `x` → `χ`
*   `y` → `ψ`
*   `w` → `ω`
*   `c` → `ξ`

---

## Settings

*   **Enable Live Typing by Default**: Choose if you want to type in Greek automatically on startup.
*   **Use Beta Code Mapping**: Toggle between Phonetic and Beta Code layouts.
*   **Smart 'h' for Rough Breathing**: When enabled, `h` + vowel becomes a rough breathing mark (e.g., `ha` → `ἁ`).
*   **Dictionary URL**: Set your preferred dictionary. Use `{word}` as a placeholder.
    *   *Note: Requires the **Web Viewer** core plugin to be enabled.*
*   **Custom Key Mappings**: Override specific keys to your liking.

---

## Installation

1.  Search for "Greek Typer" in the Obsidian Community Plugins browser.
2.  Click **Install**.
3.  Click **Enable**.