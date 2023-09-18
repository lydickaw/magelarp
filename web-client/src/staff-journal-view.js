import { LitElement, html, css } from 'lit';
import { join } from 'lit/directives/join.js';
import { map } from 'lit/directives/map.js';
import { GetLarpServiceContext } from './service-context';
import { timestampToPretty } from './timestamp-util';

class StaffJournalView extends LitElement {
    static properties = {
    }

    static styles = css`
        div.journal-entry {
            font-family: "EB Garamond", serif;
            margin-bottom: 24px;
        }

        div.journal-entry:last-child {
            margin-bottom: 0px;
        }

        h2 {
            margin-bottom: 12px;
            font-family: 'EB Garamond';
            font-size: 22px;
        }

        div.journal-meta {
            font-size: 14px;
            font-style: italic;
            margin-top: 2px;
        }

        span.journal-meta-divider {
            font-size: 14px;
            font-family: monospace;
            font-style: normal;
        }

        span.journal-tag {
            background-color: #000000;
            color: #FFFFFF;
            padding-left: 6px;
            padding-right: 6px;
            padding-top: 1px;
            padding-bottom: 1px;
        }

        span.journal-unpublished-tag {
            background-color: #20474d;
            color: #FFFFFF;
            padding-left: 6px;
            padding-right: 6px;
            padding-top: 1px;
            padding-bottom: 1px;
        }

        div.journal-editor input {
            display: block;
            width: 480px;
            box-sizing: border-box;
            border-style: solid;
            border-width: 1px;
            border-color: #aaaaaa;
            padding-left: 8px;
            padding-top: 3px;
            padding-bottom: 2px;
            font-family: 'Courier Prime', monospace;
            margin-bottom: 6px;
        }

        div.journal-editor textarea {
            display: block;
            width: 480px;
            height: 120px;
            box-sizing: border-box;
            resize: none;
            overflow: auto;
            margin-bottom: 6px;
            padding-left: 8px;
            padding-right: 8px;
            padding-top: 3px;
            padding-bottom: 3px;
            border-color: #aaaaaa;
            font-family: 'Courier Prime', monospace;
        }

        button {
            padding-top: 3px;
            padding-bottom: 3px;
            padding-left: 20px;
            padding-right: 20px;
            background-color: #ffffff;
            border-style: solid;
            border-radius: 6px;
            border-width: 1px;
            border-color: #999999;
            text-transform: lowercase;
            font-family: 'Playfair Display SC';
            font-weight: normal;
            font-size: 16px;
            transition: all 0.5s linear;
        }
    
        button {
            margin-left: 12px;
        }
    
        button:hover {
            background-color: #f5f5f5;
            border-color: #000000;
        }

        div.button-container {
            width: 480px;
            display: flex;
            justify-content: flex-end;
        }

        div.publish-drafts-form {
            margin-top: 42px;
            text-align: center;
            font-style: italic;
            font-family: 'EB Garamond';
            font-size: 17px;
        }
  `;

    async _handlePublishDrafts() {
        const btn = this.renderRoot.querySelector('#btn-publish');
        btn.disabled = true;

        try {
            await this._context.publishDrafts();
            this._context.data().watermark = Date.now();
            this.requestUpdate();
        } finally {
            btn.disabled = false;
        }
    }

    async _handleSubmitEntry() {
        const textarea = this.renderRoot.querySelector('#journal-text');
        const tagsInput = this.renderRoot.querySelector('#journal-tags');
        const threadInput = this.renderRoot.querySelector('#journal-thread');
        const btn = this.renderRoot.querySelector('#journal-submit');

        const desc = textarea.value;
        const thread = threadInput.value;
        const tags = tagsInput.value.split(',').map(x => x.trim());

        textarea.disabled = true;
        btn.disabled = true;

        try {
            await this._context.submitJournal(desc, thread, tags);

            // Clear submission box on success.
            textarea.value = '';
            tagsInput.value = '';
            threadInput.value = '';

            const iam = this._context.data().iam;

            // Add placeholder entry to local data.
            this._context.data().journal.push({
                staff: iam,
                tags: tags,
                timestamp: String(Date.now()),
                thread: thread,
                description_md: desc
            });

            // Refresh view.
            this.requestUpdate();
        } finally {
            textarea.disabled = false;
            btn.disabled = false;
        }
    }

    constructor() {
        super();
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => this.requestUpdate());
    }

    // TODO: warn if creating a new thread (possible typo)
    // TODO: warn if creating a new tag (typo)
    // TODO: allow delete
    // TODO: allow edit (will need UID + server-side merge + defering local update till remove UID assignment)

    render() {
        const data = this._context.data();
        if (data === null) {
            return;
        }

        // TODO: see if we can share this code between player / staff journals.        
        // Group journal entries and find max-time for each thread.
        let threads = {};
        for (const j of data.journal) {
            if (!(j.thread in threads)) {
                threads[j.thread] = { title: j.thread, max_ts: 0, entries: [] };
            }
            const curThread = threads[j.thread];

            if (curThread.max_ts < Number(j.timestamp)) {
                curThread.max_ts = Number(j.timestamp);
            }

            curThread.entries.push(j);
        }

        // Make into array, so we can sort and iterate.
        threads = Object.values(threads);

        // Sort threads by max-time (ascending).
        threads.sort((a, b) => a.max_ts - b.max_ts);

        // Sort entries by ts (ascending) + render entries + headers.
        const journal_entries = [];
        for (const thread of threads) {
            journal_entries.push(html`<h2>${thread.title}</h2>`);
            journal_entries.push(html`<div class="journal-thread">`);

            thread.entries.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

            for (const entry of thread.entries) {
                const ts = Number(entry.timestamp);
                const draftMarker = (ts > this._context.data().watermark) ? 
                    html`<span class="journal-unpublished-tag">unpublished</span>` : html``;
                journal_entries.push(html`<div class="journal-entry">
                 <div class="journal-text">                
                    <markdown-text text="${entry.description_md}"></markdown-text>
                    <div class="journal-meta">               
                        ${draftMarker}
                        ${join(
                    map(entry.tags, (x => html`<span class="journal-tag">${x}</span>`)),
                    html`, `
                )} 
                        <span class="journal-meta-divider">--</span> 
                        ${timestampToPretty(ts)} by ${entry.staff}</span>
                    </div>
                 </div>
                </div>`);
            }

            // Close journal-thread div.
            journal_entries.push(html`</div>`);
        }

        return html`
            ${journal_entries}

            <div class="journal-editor">
            <form onsubmit="return false;">
                <input id="journal-thread" placeholder="Plot thread..."></input>
                <input id="journal-tags" placeholder="Entry tags: cabal:TheWatch, badgerseers, etc"></input>
                <textarea id="journal-text" placeholder="Write a new journal entry..."></textarea>
                <div class="button-container">
                  <button id="journal-submit" @click=${this._handleSubmitEntry}>Submit</button>
                </div>
            </form>
            </div>

            <div class="publish-drafts-form">
                Journal entries last published ${timestampToPretty(this._context.data().watermark)}.
                <button id="btn-publish" @click=${this._handlePublishDrafts}>Publish Drafts</button>
            </div>
    `;
    }
}

customElements.define('staff-journal-view', StaffJournalView);