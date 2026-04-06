import { App, PluginSettingTab, Setting } from 'obsidian';
import type BibleReferencePlugin from './main';
import { DEFAULT_SETTINGS } from './types';

export class BibleReferenceSettingTab extends PluginSettingTab {
  plugin: BibleReferencePlugin;

  constructor(app: App, plugin: BibleReferencePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Bible folder')
      .setDesc('Path to the folder containing Bible chapter files')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.bibleFolder)
        .setValue(this.plugin.settings.bibleFolder)
        .onChange(async (value) => {
          this.plugin.settings.bibleFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show verse preview')
      .setDesc('Show a preview of verse text when selecting verses')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showVersePreview)
        .onChange(async (value) => {
          this.plugin.settings.showVersePreview = value;
          await this.plugin.saveSettings();
        }));
  }
}
