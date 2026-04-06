# Bible Reference Inserter

An Obsidian plugin for browsing and inserting Bible verse references into your notes. Navigate a 3-step picker (Book → Chapter → Verses) and insert wikilink references that point to your Bible chapter files.

## How It Works

The plugin reads Markdown files from a Bible folder in your vault. Each file represents a chapter (e.g., `Genesis 1.md`, `Romans 3.md`). Verses within each file are identified by `######` (h6) headings in the format `###### v1`, `###### v2`, etc.

When you select verses, the plugin inserts wikilinks like:

- Single verse: `[[Genesis 1#v1|Genesis 1:1]]`
- Consecutive verses: `[[Romans 3#v23|Romans 3:23]]-[[Romans 3#v24|24]]-[[Romans 3#v25|25]]`
- Non-consecutive: `[[Romans 3#v23|Romans 3:23]]-[[Romans 3#v24|24]], [[Romans 3#v26|26]]`

## Requirements

### Bible Chapter Files

You need a folder in your vault containing Bible chapter files. The expected structure is:

```
Bible/
├── Genesis/
│   ├── Genesis 1.md
│   ├── Genesis 2.md
│   └── ...
├── Psalms/
│   ├── Psalms 1.md
│   └── ...
└── Romans/
    ├── Romans 1.md
    └── ...
```

Each chapter file should use h6 headings to mark verses:

```markdown
###### v1
In the beginning, God created the heavens and the earth.

###### v2
The earth was without form and void...
```

The plugin also supports flat structures (`Bible/Genesis 1.md`) and single-chapter books without a number (`Bible/Obadiah/Obadiah.md`).

## Installation

### Manual Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/bible-reference/`
2. Restart Obsidian
3. Enable "Bible Reference Inserter" in Settings → Community Plugins

### Build From Source

1. Clone this repository into your vault's `.obsidian/plugins/` directory:
   ```bash
   git clone https://github.com/kylelynch/obsidian-bible-reference.git .obsidian/plugins/bible-reference
   ```
2. Install dependencies and build:
   ```bash
   cd .obsidian/plugins/bible-reference
   npm install
   npm run build
   ```
3. Restart Obsidian and enable the plugin

## Usage

- Click the scroll icon in the ribbon sidebar, or
- Open the command palette and search for **Insert Bible Reference**

Then:

1. **Select a book** — organized by testament and section (Pentateuch, Historical, Wisdom, etc.)
2. **Select a chapter** — single-chapter books (Obadiah, Philemon, Jude, 2 John, 3 John) skip this step automatically
3. **Select verses** — tap/click individual verses, use Select All/Clear, or hold and drag to select a range

Press **Insert** to place the formatted reference at your cursor.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Bible folder | `Bible` | Path to the folder containing your Bible chapter files |
| Show verse preview | On | Display a preview of verse text in the verse picker |

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

MIT
