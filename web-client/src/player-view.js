import { LitElement, html, css } from 'lit';
import { GetLarpServiceContext } from './service-context';
import { timestampToPretty } from './timestamp-util';
import './markdown-text';
import './sheet-widget';

class PlayerView extends LitElement {
    static properties = {
        _editStats: { state: true }
    }

    static styles = css`
        main {
            background-color: #FFFFFF; 
            width: 940px;
            margin: 0 auto;
            margin-top: 22px;
            padding-bottom: 12px;
            padding-right: 20px;
            padding-left: 20px;
        }

        button {
            padding-top: 8px;
            padding-bottom: 8px;
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

        button:hover {
            background-color: #f5f5f5;
            border-color: #000000;
        }

        footer {
            color: #FFFFFF;
            width: 980px;
            text-align: center;
        }

        h1 {
            font-family: 'Playfair Display SC', serif;
            font-weight: 400;            
            text-transform: lowercase;
            font-size: 2em;
            margin-left: 8px;
            margin-right: 8px;
            border-bottom-style: solid;
            border-bottom-width: 2px;
            padding-bottom: 2px;
            padding-left: 12px;
        }

        h1:first-child {
            margin-top: 0px;
        }

        span.player-name {
            font-family: 'Indie Flower', cursive;
            font-weight: 400;            
            text-transform: none;
        }

        div.empty-journal {
            font-family: "EB Garamond", serif;
            font-style: italic;     
            font-weight: 500;
            margin-bottom: 24px;
            margin-left: 20px;
        }

        div.journal-entry {
            font-family: "EB Garamond", serif;
            margin-bottom: 24px;
        }

        div.journal-entry:last-child {
            margin-bottom: 0px;
        }

        div.journal-entries h2 {
            margin-left: 150px;
            margin-bottom: 12px;
            font-family: 'EB Garamond';
            font-size: 22px;
        }

        div.journal-text {
            margin-left: 150px;
        }

        div.downtime-entry {
            font-family: 'EB Garamond', serif;
            font-weight: 500;   
            margin-bottom: 24px;         
        }

        div.downtime-text {
            margin-left: 150px;
        }

        div.downtime-hint {
            font-weight: bold;
            display: inline-block;
        }

        div.downtime-comment {
            margin-bottom: 6px;
            margin-left: 3px;
            padding-left: 4px;
            border-left-width: 4px;
            border-left-style: solid;
            border-left-color: #aaaaaa;
            font-style: italic;
        }

        div.entry-date {
            float: left;
            font-style: italic;
            font-size: 14px;
            width: 120px;
            text-align: right;
        }

        div.downtime-editor {
            margin-left: 20px;
        }

        div.downtime-editor textarea {
            display: block;
            width: 480px;
            height: 120px;
            box-sizing: border-box;
            resize: none;
            overflow: auto;
            margin-bottom: 6px;
            padding-left: 8px;
            padding-right: 8px;
            padding-top: 2px;
            padding-bottom: 2px;
            border-color: #aaaaaa;
            font-family: 'Courier Prime', monospace;
        }

        div.button-container {
            width: 480px;
            display: flex;
            justify-content: flex-end;
        }

        div.sheet-container {
            margin-left: 20px;
        }

        div.stats-button-container {
            display: flex;
            justify-content: flex-end;
            padding-right: 20px;
        }

        footer {
            font-family: 'EB Garamond', serif;
            text-align: center;
            margin-top: 8px;
        }

        footer span.bigsymbol {
            font-size: 28px;
            display: inline-block;
            margin-left: 12px;
            margin-right: 12px;
        }

        @media(max-width: 940px) {
            main {
                width: initial;
                margin: 4px;
                padding-left: 8px;
                padding-right: 8px;
            }

            h1 {
                margin-left: initial;
                text-align: right;
            }

            footer {
                width: initial;
            }
            
            div.empty-journal {
                margin-left: initial;
            }

            div.journal-entries h2 {
                margin-left: initial;
            }

            div.journal-text {
                margin-left: initial;
            }
            
            div.downtime-text {
                margin-left: initial;
            }

            div.downtime-editor {
                margin-left: initial;
            }

            div.downtime-editor textarea {
                width: 100%
            }

            div.entry-date {
                float: initial;
                text-align: initial;
            }

            div.stats-button-container {
                width: initial;
                padding-right: initial;
            }

            div.sheet-container {
                margin-left: initial;
                margin-bottom: 20px;
            }
        }
  `;

    constructor() {
        super();
        this._editStats = false;
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => {
            this.requestUpdate();
        });
    }

    async _handleSubmitDowntime() {
        const textarea = this.renderRoot.querySelector('#downtime_proposal');
        const btn = this.renderRoot.querySelector('#downtime_proposal_btn');
        const proposal = textarea.value;

        // Ignore attempts to submit empty downtimes.
        if (textarea.value.trim().length === 0) {
            return;
        }

        textarea.disabled = true;
        btn.disabled = true;

        try {
            await this._context.submitDowntime(proposal);

            // Clear submission box on success.
            textarea.value = '';

            // Add placeholder entry to local data.
            const data = this._context.data();
            data.downtime.push({
                uid: "LOCAL_PLACEHOLDER",
                is_complete: false,
                proposal: proposal,
                player_updated_ts: String(Date.now())
            });

            // Refresh view.
            this.requestUpdate();
        } finally {
            textarea.disabled = false;
            btn.disabled = false;
        }
    }

    async _handleUpdateDowntime(uid) {
        const textarea = this.renderRoot.querySelector('#dt_' + uid);
        const btn = this.renderRoot.querySelector('#btn_' + uid);
        const proposal = textarea.value;

        textarea.disabled = true;
        btn.disabled = true;

        try {
            await this._context.submitDowntime(proposal, uid);

            // Clear submission box on success.
            textarea.value = '';

            // Update local downtime entry.
            const data = this._context.data();
            const dt = data.downtime.find(x => x.uid === uid);
            dt.proposal = proposal;
            dt.player_updated_ts = Date.now();

            // Refresh view.
            this.requestUpdate();
        } finally {
            textarea.disabled = false;
            btn.disabled = false;
        }
    }

    _handleEditStats() {
        this._editStats = true;
    }

    _handleEditStatsComplete() {
        this._editStats = false;
    }

    render() {
        const data = this._context.data();
        if (data === null) {
            return html`Loading...`;
        }

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
                journal_entries.push(html`<div class="journal-entry">
                 <div class="entry-date">${timestampToPretty(ts)}</div>
                 <div class="journal-text">                
                    <markdown-text text="${entry.description_md}"></markdown-text>
                 </div>
                </div>`);
            }

            // Close journal-thread div.
            journal_entries.push(html`</div>`);
        }

        if (journal_entries.length === 0) {
            journal_entries.push(html`
                <div class="empty-journal">
                    Your journal is currently empty, but the Storyteller will fill it with interesting leads, past events, and downtime results as your adventures continue!
                </div>            
            `);
        }

        const downtime_entries = [];
        for (const dt of data.downtime) {
            const waiting_for_player = (dt.staff_updated_ts > dt.player_updated_ts);
            const ts = Math.max(Number(dt.staff_updated_ts || 0), Number(dt.player_updated_ts));
            let entry = null;
            if (waiting_for_player && !dt.is_complete) {
                entry = html`<div class="downtime-entry downtime-editor">
                    <div class="downtime-comment">Staff comment: ${dt.staff_comment}</div>
                    <textarea id="${'dt_' + dt.uid}" .value=${dt.proposal}></textarea>
                    <div class="button-container">
                      <button 
                        id="${'btn_' + dt.uid}" 
                        @click=${this._handleUpdateDowntime.bind(this, dt.uid)}>Update</button>
                    </div>
                </div>
                `;
            } else {
                entry = html`<div class="downtime-entry">
                    <div class="entry-date">${timestampToPretty(ts)}</div>
                    <div class="downtime-text">
                      <div class="downtime-hint">${dt.is_complete ? 'Done. ' : 'Waiting. '}</div>                    
                      ${dt.proposal}
                    </div>                    
                </div>`;
            }
            downtime_entries.push(entry);
        }

        // TODO:
        // - add contact info for staff (footer)
        // - add logout button to footer
        // - show something nice if no journal entries are visible.
        // - show something nice if no downtime exists (instructions).
        // - display errors

        return html`
      <main>
        <h1>Journal</h1>
        <div class="journal-entries">${journal_entries}</div>

        <h1>Downtime</h1>
        <div class="downtime-entries">${downtime_entries}</div>

        <div class="downtime-editor">
        <form onsubmit="return false;">
            <textarea id="downtime_proposal" placeholder="Propose a new downtime action..."></textarea>
            <div class="button-container">
              <button id="downtime_proposal_btn" @click=${this._handleSubmitDowntime}>Submit</button>
            </div>
        </form>
        </div>

        <h1>Stats</h1>
        <div class="sheet-container">
            <sheet-widget id="sheet-widget"
                @complete=${this._handleEditStatsComplete} ?edit=${this._editStats}></sheet-widget>            
        </div>
        <div class="stats-button-container">
            <button 
                style="${this._editStats ? 'display: none' : ''}"
                @click=${this._handleEditStats}>Edit Stats</button>
        </div>
      </main>

      <footer>
        You are logged in as <span class="player-name">${data.player_name} / ${data.shadow_name}</span>. 
        <span class="bigsymbol">🜏</span>
        Made with 💙, ✨, and sinister deeds by <span class="player-name">Anlace</span>.
      </footer>
    `;
    }
}

customElements.define('player-view', PlayerView);