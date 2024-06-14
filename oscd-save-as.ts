import { html, LitElement, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';

import '@material/mwc-snackbar';

import type { Snackbar } from '@material/mwc-snackbar';

function fileSize(kBSize: number): string {
  if (kBSize >= 1e6) return `${(kBSize / 1e6).toFixed(2)} MB`;
  if (kBSize < 1e6) return `${(kBSize / 1e3).toFixed(2)} kB`;
  return 'Unknown size';
}

/**
 * WebComponent for OpenSCD to allow saving to a file system location
 * using the File System API
 */
export default class SaveAs extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @property()
  docName!: string;

  @property()
  editCount: number = -1;

  @property({ attribute: false })
  usedDirectory: string = '';

  @property({ attribute: false })
  fileHandle: object | null = null;

  @property({ attribute: false })
  userMessage: string = '';

  usedFileNames: string[] = [];

  @query('#userMessage') userMessageUI?: Snackbar;

  async getSaveFileLocation(): Promise<void> {
    if (!this.doc) return;

    // File System API feature exists
    if ('showSaveFilePicker' in window) {
      // eslint-disable-next-line no-undef
      const opts: any = {
        startIn: 'downloads',
        suggestedName: this.docName,
        types: [
          {
            description: 'SCD file',
            accept: { 'text/xml': ['.scd', '.SCD'] },
          },
        ],
      };

      const fileHandle = await (<any>window.showSaveFilePicker(opts));

      if (fileHandle && fileHandle.kind === 'file') {
        this.fileHandle = fileHandle;
        this.fileSave();
      }
    } else {
      this.userMessage =
        'Sorry, your browser does not support the File System API required.';
      if (this.userMessageUI) this.userMessageUI!.show();
    }
  }

  constructor() {
    super();
    document.addEventListener('keydown', event => this.handleKeyPress(event));
  }

  private handleKeyPress(e: KeyboardEvent): void {
    if (!e.ctrlKey || (e.key !== 's' && e.key !== 'S')) return;

    if (e.shiftKey) {
      this.getSaveFileLocation();
    } else {
      this.fileSave();
    }

    e.stopPropagation();
    e.preventDefault();
  }

  async run(): Promise<void> {
    const plugin = (<any>(
      window.document.querySelector('open-scd')!
    )).loadedPlugins!.get(this.tagName.toLowerCase());

    // Currently using a fragment on the plugin source file name
    // probably not a very stable approach, but perhaps more easy to
    // avoid a conflict with the name
    if (plugin.src.endsWith('Save') && this.fileHandle) {
      this.fileSave();
    } else {
      this.getSaveFileLocation();
    }
  }

  // TODO: Unsure how to type the file handle correctly
  async fileSave() {
    if (!this.doc || !this.fileHandle) return;

    try {
      const writableStream = await (<any>this.fileHandle).createWritable();
      const xmlFile = new XMLSerializer().serializeToString(this.doc);
      await writableStream.write(xmlFile);

      this.userMessage = `File ${(<any>this.fileHandle).name} saved (${fileSize(
        xmlFile.length
      )}).`;

      await writableStream.close();
    } catch (error) {
      this.userMessage = `Unable to to write to file system. 
      Check storage space and permissions.`;

      if (this.userMessageUI) this.userMessageUI!.show();

      return;
    }

    if (this.userMessageUI) this.userMessageUI!.show();
  }

  render(): TemplateResult {
    return html`
      <mwc-snackbar
        id="userMessage"
        labelText="${this.userMessage}"
      ></mwc-snackbar>
    `;
  }
}
