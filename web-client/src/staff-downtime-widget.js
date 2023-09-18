import { LitElement, html, css } from 'lit';
import { GetLarpServiceContext } from './service-context';

class StaffDowntimeWidget extends LitElement {
    static properties = {
        key: { type: String },
        uid: { type: String },
        proposal: { type: String },
        staffnote: {type: String},
        _hasComment: { state: true },
    }

    static styles = css`
        div.downtime-entry {        
            font-family: "EB Garamond";
            font-size: 16px;
            max-width: 480px;
            margin-bottom: 20px;
        }

        div.downtime-proposal {
            margin-bottom: 8px;
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

        div.downtime-entry input {
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

        div.downtime-entry textarea {
            display: block;
            width: 480px;
            height: 60px;
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
  `;

    _handleInputChange() {
        const textarea = this.renderRoot.querySelector('#comment');
        this._hasComment = textarea.value.length > 0;
    }

    _getAcceptButtonDescription() {
        if (!this._hasComment) {
            return "Accept (silently)";
        } else {
            return "Accept (note in journal)";
        }
    }

    _fireComplete() {
        this.dispatchEvent(new CustomEvent('complete', { bubbles: true, composed: true }));
    }

    _getDowntimeEntry() {
        const char = this._context.data().characters.find(x => x.key === this.key);
        if (!char) return null;
        return char.downtime.find(x => x.uid === this.uid);
    }

    _handleReject() {
        if (!this._hasComment) return;
        const textarea = this.renderRoot.querySelector('#comment');
        this._context.rejectDowntime(this.key, this.uid, textarea.value);

        const toUpdate = this._getDowntimeEntry();
        toUpdate.staff_comment = textarea.value;
        toUpdate.staff_updated_ts = String(Date.now());

        this._fireComplete();
    }

    _handleAccept() {
        const textarea = this.renderRoot.querySelector('#comment');
        const tags = this.renderRoot.querySelector('#tags');
        const parsedTags = tags.value.split(',').map(x => x.trim()).filter(x => x.length > 0);
        if (parsedTags.length === 0) {
            return;
        }

        this._context.acceptDowntime(this.key, this.uid, textarea.value, parsedTags);

        const toUpdate = this._getDowntimeEntry();
        toUpdate.is_complete = true;
        toUpdate.staff_updated_ts = String(Date.now());

        // TODO: need to update Character view as well (to refresh tags applied).
        this._fireComplete();
    }

    constructor() {
        super();
        this.key = '';
        this.uid = '';
        this.proposal = '';
        this.staffnote = '';
        this._context = GetLarpServiceContext();
        this._hasComment = false;
    }

    render() {
        // actions:
        // approve (silent)                     |
        // approve (note in character journal)  | Share button, two form fields.
        // approve (set player tag(s))          | 
        // reject w/ comment                    || Button #2 (reuse comment field)

        // TODO: warn if unknown tags are provided (help catch typos, etc)
        // TODO: show previous staff comment
        // TODO: make transactional so multiple staff updating don't step on each other.
        // TODO: make *server* side transactional so we don't have racing updates.

        const staffComment = this.staffnote ? 
            html`<div class="downtime-comment">Prior comment: ${this.staffnote}</div>` : html``;

        return html`
            <div class="downtime-entry">    
                <form onsubmit="return false;">
                ${staffComment}                
                <div class="downtime-proposal">${this.proposal}</div>
                <textarea @input=${this._handleInputChange} id="comment" placeholder="Notes"></textarea>
                <input id="tags" placeholder="some:tag, anothertag, etc"></input>
                <div class="button-container">
                  <button @click=${this._handleReject} ?disabled=${!this._hasComment}>Reject</button>
                  <button @click=${this._handleAccept}>${this._getAcceptButtonDescription()}</button>
                </div>
                </form>
            </div>
        `
    }
}

customElements.define('staff-downtime-widget', StaffDowntimeWidget);