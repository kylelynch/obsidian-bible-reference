import { App, TFile, CachedMetadata } from 'obsidian';
import { BibleBook, BibleVerse } from './types';

// Canonical book order Genesis→Revelation for sorting
const CANONICAL_ORDER: string[] = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

const BOOK_SECTIONS: Record<string, { testament: 'OT' | 'NT'; section: string }> = {};

// OT sections
['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'].forEach(b => BOOK_SECTIONS[b] = { testament: 'OT', section: 'Pentateuch' });
['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther'].forEach(b => BOOK_SECTIONS[b] = { testament: 'OT', section: 'Historical' });
['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'].forEach(b => BOOK_SECTIONS[b] = { testament: 'OT', section: 'Wisdom' });
['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'].forEach(b => BOOK_SECTIONS[b] = { testament: 'OT', section: 'Major Prophets' });
['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'].forEach(b => BOOK_SECTIONS[b] = { testament: 'OT', section: 'Minor Prophets' });

// NT sections
['Matthew', 'Mark', 'Luke', 'John'].forEach(b => BOOK_SECTIONS[b] = { testament: 'NT', section: 'Gospels' });
['Acts'].forEach(b => BOOK_SECTIONS[b] = { testament: 'NT', section: 'History' });
['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'].forEach(b => BOOK_SECTIONS[b] = { testament: 'NT', section: 'Pauline Epistles' });
['Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'].forEach(b => BOOK_SECTIONS[b] = { testament: 'NT', section: 'General Epistles' });
['Revelation'].forEach(b => BOOK_SECTIONS[b] = { testament: 'NT', section: 'Prophecy' });

// Single-chapter books that should auto-skip chapter selection
const SINGLE_CHAPTER_BOOKS = ['Obadiah', 'Philemon', 'Jude', '2 John', '3 John'];

export class BibleData {
  private app: App;
  private bibleFolder: string;

  constructor(app: App, bibleFolder: string) {
    this.app = app;
    this.bibleFolder = bibleFolder;
  }

  updateFolder(folder: string): void {
    this.bibleFolder = folder;
  }

  getBooks(): BibleBook[] {
    const files = this.app.vault.getFiles().filter(f =>
      f.path.startsWith(this.bibleFolder + '/') && f.extension === 'md'
    );

    const bookMap = new Map<string, number[]>();

    for (const file of files) {
      const parsed = this.parseFileName(file.basename);
      if (!parsed) continue;

      const { book, chapter } = parsed;
      if (!bookMap.has(book)) {
        bookMap.set(book, []);
      }
      bookMap.get(book)!.push(chapter);
    }

    const books: BibleBook[] = [];
    for (const [name, chapters] of bookMap) {
      const info = BOOK_SECTIONS[name] || { testament: 'OT' as const, section: 'Unknown' };
      chapters.sort((a, b) => a - b);
      books.push({
        name,
        testament: info.testament,
        section: info.section,
        chapters,
      });
    }

    // Sort by canonical order
    books.sort((a, b) => {
      const idxA = CANONICAL_ORDER.indexOf(a.name);
      const idxB = CANONICAL_ORDER.indexOf(b.name);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return books;
  }

  isSingleChapterBook(bookName: string): boolean {
    return SINGLE_CHAPTER_BOOKS.includes(bookName);
  }

  getChapterFile(book: string, chapter: number): TFile | null {
    // Files are in subdirectories: Bible/Genesis/Genesis 1.md
    const paths = [
      `${this.bibleFolder}/${book}/${book} ${chapter}.md`,
      `${this.bibleFolder}/${book}/${book}.md`,
      `${this.bibleFolder}/${book} ${chapter}.md`,
      `${this.bibleFolder}/${book}.md`,
    ];

    for (const path of paths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) return file;
    }
    return null;
  }

  async getVerses(book: string, chapter: number): Promise<BibleVerse[]> {
    const file = this.getChapterFile(book, chapter);
    if (!file) return [];

    const cache: CachedMetadata | null = this.app.metadataCache.getFileCache(file);
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split('\n');
    const verses: BibleVerse[] = [];

    if (cache?.headings) {
      // Find all h6 headings that match "v1", "v2", etc.
      const verseHeadings = cache.headings.filter(h =>
        h.level === 6 && /^v\d+$/.test(h.heading)
      );

      for (let i = 0; i < verseHeadings.length; i++) {
        const heading = verseHeadings[i];
        const verseNum = parseInt(heading.heading.replace('v', ''), 10);
        
        // Get preview text: lines between this heading and the next heading
        const startLine = heading.position.start.line + 1;
        const endLine = i < verseHeadings.length - 1
          ? verseHeadings[i + 1].position.start.line
          : lines.length;

        const preview = lines.slice(startLine, endLine)
          .join(' ')
          .trim()
          .substring(0, 120);

        verses.push({
          number: verseNum,
          heading: heading.heading,
          preview,
        });
      }
    }

    verses.sort((a, b) => a.number - b.number);
    return verses;
  }

  private parseFileName(basename: string): { book: string; chapter: number } | null {
    // Match patterns like "Genesis 1", "1 Samuel 3", "Song of Solomon 2", "Psalms 119"
    const match = basename.match(/^(.+?)\s+(\d+)$/);
    if (match) {
      return { book: match[1], chapter: parseInt(match[2], 10) };
    }
    // Single chapter books might not have a number
    if (CANONICAL_ORDER.includes(basename)) {
      return { book: basename, chapter: 1 };
    }
    return null;
  }
}
