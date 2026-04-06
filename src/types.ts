export interface BibleReferenceSettings {
  bibleFolder: string;
  showVersePreview: boolean;
}

export const DEFAULT_SETTINGS: BibleReferenceSettings = {
  bibleFolder: 'Bible',
  showVersePreview: true,
};

export interface BibleBook {
  name: string;
  testament: 'OT' | 'NT';
  section: string;
  chapters: number[];
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleVerse {
  number: number;
  heading: string;
  preview: string;
}

export type ModalStep = 'books' | 'chapters' | 'verses';
