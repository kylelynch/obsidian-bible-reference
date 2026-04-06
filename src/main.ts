import { Plugin, MarkdownView } from 'obsidian';
import { BibleReferenceSettings, DEFAULT_SETTINGS } from './types';
import { BibleReferenceSettingTab } from './settings';
import { BibleData } from './bible-data';
import { BibleModal } from './bible-modal';

export default class BibleReferencePlugin extends Plugin {
  settings: BibleReferenceSettings = DEFAULT_SETTINGS;
  bibleData!: BibleData;

  async onload() {
    await this.loadSettings();
    this.bibleData = new BibleData(this.app, this.settings.bibleFolder);

    this.addRibbonIcon('scroll-text', 'Insert Bible Reference', () => {
      this.openBibleModal();
    });

    this.addCommand({
      id: 'insert-bible-reference',
      name: 'Insert Bible Reference',
      icon: 'scroll-text',
      editorCallback: (editor) => {
        this.openBibleModal((text) => {
          const cursor = editor.getCursor();
          editor.replaceRange(text, cursor);
          const newCh = cursor.ch + text.length;
          editor.setCursor({ line: cursor.line, ch: newCh });
        });
      },
    });

    this.addSettingTab(new BibleReferenceSettingTab(this.app, this));
  }

  private openBibleModal(onInsert?: (text: string) => void) {
    this.bibleData.updateFolder(this.settings.bibleFolder);

    const insertFn = onInsert || ((text: string) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        const editor = view.editor;
        const cursor = editor.getCursor();
        editor.replaceRange(text, cursor);
        const newCh = cursor.ch + text.length;
        editor.setCursor({ line: cursor.line, ch: newCh });
      }
    });

    new BibleModal(this.app, this.bibleData, this.settings, insertFn).open();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
