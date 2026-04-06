import { App, Modal } from 'obsidian';
import { BibleBook, BibleVerse, ModalStep, BibleReferenceSettings } from './types';
import { BibleData } from './bible-data';
import { buildInlineReference } from './callout-builder';

export class BibleModal extends Modal {
  private bibleData: BibleData;
  private settings: BibleReferenceSettings;
  private onInsert: (text: string) => void;

  private step: ModalStep = 'books';
  private selectedBook: BibleBook | null = null;
  private selectedChapter: number | null = null;
  private selectedVerses: Set<number> = new Set();
  private verses: BibleVerse[] = [];

  // Drag-select state
  private isDragSelecting = false;
  private dragSelectAction: 'select' | 'deselect' = 'select';
  private holdTimer: number | null = null;
  private lastDraggedVerse: number | null = null;
  private holdStartX = 0;
  private holdStartY = 0;

  constructor(app: App, bibleData: BibleData, settings: BibleReferenceSettings, onInsert: (text: string) => void) {
    super(app);
    this.bibleData = bibleData;
    this.settings = settings;
    this.onInsert = onInsert;
  }

  onOpen() {
    this.modalEl.addClass('bible-reference-modal');
    this.renderBooks();
  }

  onClose() {
    this.cancelHoldTimer();
    this.contentEl.empty();
  }

  private cancelHoldTimer() {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private getVerseRowFromPoint(x: number, y: number): { row: HTMLElement; verse: number } | null {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const row = (el as HTMLElement).closest('.bible-ref-verse-row') as HTMLElement | null;
    if (!row || !row.dataset.verse) return null;
    return { row, verse: parseInt(row.dataset.verse, 10) };
  }

  private renderBooks() {
    this.step = 'books';
    this.contentEl.empty();
    this.setTitle('Select Book');

    const scrollContainer = this.contentEl.createDiv({ cls: 'bible-ref-scroll-container' });

    const books = this.bibleData.getBooks();

    // Group by testament and section
    const testaments: Array<{ label: string; key: 'OT' | 'NT' }> = [
      { label: 'Old Testament', key: 'OT' },
      { label: 'New Testament', key: 'NT' },
    ];

    for (const testament of testaments) {
      const testamentBooks = books.filter(b => b.testament === testament.key);
      if (testamentBooks.length === 0) continue;

      scrollContainer.createEl('h3', {
        text: testament.label,
        cls: 'bible-ref-testament-header',
      });

      // Group by section
      const sections = new Map<string, BibleBook[]>();
      for (const book of testamentBooks) {
        if (!sections.has(book.section)) {
          sections.set(book.section, []);
        }
        sections.get(book.section)!.push(book);
      }

      for (const [section, sectionBooks] of sections) {
        scrollContainer.createEl('h4', {
          text: section,
          cls: 'bible-ref-section-header',
        });

        const grid = scrollContainer.createDiv({ cls: 'bible-ref-book-grid' });
        for (const book of sectionBooks) {
          const btn = grid.createEl('button', {
            text: book.name,
            cls: 'bible-ref-book-btn',
          });
          btn.addEventListener('click', () => this.selectBook(book));
        }
      }
    }
  }

  private async selectBook(book: BibleBook) {
    this.selectedBook = book;

    if (this.bibleData.isSingleChapterBook(book.name)) {
      // Auto-skip to verses for single-chapter books
      this.selectedChapter = 1;
      await this.loadAndRenderVerses();
    } else {
      this.renderChapters();
    }
  }

  private renderChapters() {
    this.step = 'chapters';
    this.contentEl.empty();
    this.setTitle(`${this.selectedBook!.name}`);

    const toolbar = this.contentEl.createDiv({ cls: 'bible-ref-toolbar' });
    const backBtn = toolbar.createEl('button', {
      text: '← Books',
      cls: 'bible-ref-back-btn',
    });
    backBtn.addEventListener('click', () => this.renderBooks());
    toolbar.createEl('span', {
      text: `${this.selectedBook!.chapters.length} chapters`,
      cls: 'bible-ref-toolbar-info',
    });

    const scrollContainer = this.contentEl.createDiv({ cls: 'bible-ref-scroll-container' });
    const grid = scrollContainer.createDiv({ cls: 'bible-ref-chapter-grid' });
    for (const ch of this.selectedBook!.chapters) {
      const btn = grid.createEl('button', {
        text: String(ch),
        cls: 'bible-ref-chapter-btn',
      });
      btn.addEventListener('click', async () => {
        this.selectedChapter = ch;
        await this.loadAndRenderVerses();
      });
    }
  }

  private async loadAndRenderVerses() {
    this.step = 'verses';
    this.contentEl.empty();
    this.selectedVerses.clear();
    this.setTitle(`${this.selectedBook!.name} ${this.selectedChapter} — Select Verses`);

    // Toolbar: back button + action buttons on one line
    const toolbar = this.contentEl.createDiv({ cls: 'bible-ref-toolbar' });

    const backLabel = this.bibleData.isSingleChapterBook(this.selectedBook!.name)
      ? '← Books'
      : '← Chapters';
    const backBtn = toolbar.createEl('button', {
      text: backLabel,
      cls: 'bible-ref-back-btn',
    });
    backBtn.addEventListener('click', () => {
      if (this.bibleData.isSingleChapterBook(this.selectedBook!.name)) {
        this.renderBooks();
      } else {
        this.renderChapters();
      }
    });

    const actions = toolbar.createDiv({ cls: 'bible-ref-actions' });
    const selectAllBtn = actions.createEl('button', { text: 'Select All', cls: 'bible-ref-action-btn' });
    const clearBtn = actions.createEl('button', { text: 'Clear', cls: 'bible-ref-action-btn' });

    // Verse list
    const verseList = this.contentEl.createDiv({ cls: 'bible-ref-verse-list' });

    this.verses = await this.bibleData.getVerses(this.selectedBook!.name, this.selectedChapter!);

    const checkboxes: HTMLInputElement[] = [];

    for (const verse of this.verses) {
      const row = verseList.createDiv({ cls: 'bible-ref-verse-row' });
      row.dataset.verse = String(verse.number);

      const checkbox = row.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
      checkbox.dataset.verse = String(verse.number);
      checkboxes.push(checkbox);

      const label = row.createDiv({ cls: 'bible-ref-verse-label' });
      label.createEl('span', { text: `${verse.number}`, cls: 'bible-ref-verse-num' });
      if (this.settings.showVersePreview && verse.preview) {
        label.createEl('span', { text: verse.preview, cls: 'bible-ref-verse-preview' });
      }

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedVerses.add(verse.number);
          row.addClass('is-selected');
        } else {
          this.selectedVerses.delete(verse.number);
          row.removeClass('is-selected');
        }
        this.updateConfirmButton(confirmBtn);
      });

      row.addEventListener('click', (e) => {
        // Don't handle click if we just finished a drag-select
        if (this.isDragSelecting) return;
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
    }

    // --- Drag-select: touch events ---
    const startHold = (x: number, y: number) => {
      this.holdStartX = x;
      this.holdStartY = y;
      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = null;
        const hit = this.getVerseRowFromPoint(x, y);
        if (!hit) return;

        this.isDragSelecting = true;
        this.lastDraggedVerse = hit.verse;
        verseList.addClass('is-drag-selecting');
        hit.row.addClass('drag-origin');

        // Determine action based on current state of the origin verse
        const isCurrentlySelected = this.selectedVerses.has(hit.verse);
        this.dragSelectAction = isCurrentlySelected ? 'deselect' : 'select';

        // Apply action to the origin verse
        this.applyDragAction(hit.row, hit.verse, checkboxes);
      }, 300);
    };

    const moveHold = (x: number, y: number, e: Event) => {
      // If timer is still pending, check movement tolerance
      if (this.holdTimer !== null) {
        const dx = x - this.holdStartX;
        const dy = y - this.holdStartY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          this.cancelHoldTimer();
        }
        return;
      }

      if (!this.isDragSelecting) return;

      // Prevent scrolling while drag-selecting
      e.preventDefault();

      const hit = this.getVerseRowFromPoint(x, y);
      if (!hit) return;
      if (hit.verse === this.lastDraggedVerse) return;

      this.lastDraggedVerse = hit.verse;
      this.applyDragAction(hit.row, hit.verse, checkboxes);
    };

    const endHold = () => {
      this.cancelHoldTimer();
      if (this.isDragSelecting) {
        verseList.removeClass('is-drag-selecting');
        const originRow = verseList.querySelector('.bible-ref-verse-row.drag-origin');
        if (originRow) originRow.removeClass('drag-origin');

        this.updateConfirmButton(confirmBtn);

        // Delay clearing the flag so the click handler on the row won't fire
        setTimeout(() => {
          this.isDragSelecting = false;
        }, 50);
      }
      this.lastDraggedVerse = null;
    };

    // Touch events
    verseList.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startHold(touch.clientX, touch.clientY);
    }, { passive: true });

    verseList.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      moveHold(touch.clientX, touch.clientY, e);
    }, { passive: false });

    verseList.addEventListener('touchend', () => endHold());
    verseList.addEventListener('touchcancel', () => endHold());

    // Mouse events (desktop hold + drag)
    let mouseIsDown = false;

    verseList.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      mouseIsDown = true;
      startHold(e.clientX, e.clientY);
    });

    verseList.addEventListener('mousemove', (e: MouseEvent) => {
      if (!mouseIsDown) return;
      moveHold(e.clientX, e.clientY, e);
    });

    const mouseUp = () => {
      if (!mouseIsDown) return;
      mouseIsDown = false;
      endHold();
    };

    verseList.addEventListener('mouseup', mouseUp);
    verseList.addEventListener('mouseleave', mouseUp);

    // --- End drag-select ---

    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { cb.checked = true; cb.closest('.bible-ref-verse-row')?.addClass('is-selected'); });
      this.verses.forEach(v => this.selectedVerses.add(v.number));
      this.updateConfirmButton(confirmBtn);
    });

    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { cb.checked = false; cb.closest('.bible-ref-verse-row')?.removeClass('is-selected'); });
      this.selectedVerses.clear();
      this.updateConfirmButton(confirmBtn);
    });

    // Sticky confirm button
    const confirmBar = this.contentEl.createDiv({ cls: 'bible-ref-confirm-bar' });
    const confirmBtn = confirmBar.createEl('button', {
      text: 'Select verses to insert',
      cls: 'bible-ref-confirm-btn',
    });
    confirmBtn.disabled = true;
    confirmBtn.addEventListener('click', () => this.confirmInsert());
  }

  private applyDragAction(row: HTMLElement, verseNum: number, checkboxes: HTMLInputElement[]) {
    const checkbox = checkboxes.find(cb => cb.dataset.verse === String(verseNum));
    if (!checkbox) return;

    if (this.dragSelectAction === 'select') {
      if (!checkbox.checked) {
        checkbox.checked = true;
        this.selectedVerses.add(verseNum);
        row.addClass('is-selected');
      }
    } else {
      if (checkbox.checked) {
        checkbox.checked = false;
        this.selectedVerses.delete(verseNum);
        row.removeClass('is-selected');
      }
    }
  }

  private updateConfirmButton(btn: HTMLButtonElement) {
    const count = this.selectedVerses.size;
    if (count === 0) {
      btn.textContent = 'Select verses to insert';
      btn.disabled = true;
    } else {
      btn.textContent = `Insert ${count} verse${count > 1 ? 's' : ''}`;
      btn.disabled = false;
    }
  }

  private confirmInsert() {
    if (!this.selectedBook || this.selectedChapter === null || this.selectedVerses.size === 0) return;

    const ref = buildInlineReference(
      this.selectedBook.name,
      this.selectedChapter,
      Array.from(this.selectedVerses)
    );

    this.onInsert(ref);
    this.close();
  }
}
