import { LitElement, html, css } from 'lit';
import { GetLarpServiceContext } from './service-context';
import './staff-downtime-widget';

class StaffDowntimeView extends LitElement {
    static properties = {
    }

    static styles = css`
        h2 {
            margin-bottom: 12px;
            font-family: "EB Garamond";
            font-size: 22px;
        }

        div.no-downtime-msg {
            margin-left: 2px;
            margin-top: 20px;
            margin-bottom: 20px;
            font-family: 'EB Garamond';
            font-size: 18px;
        }
  `;

    constructor() {
        super();
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => this.requestUpdate());
    }

    _handleRefreshAfterSubmit() {
        this.requestUpdate();
    }

    // TODO: show instructions.

    render() {
        const templates = [];
        if (this._context.data() !== null) {
            for (const character of this._context.data().characters) {
                const entries = [];
                for (const downtime of character.downtime) {
                    if (Number(downtime.staff_updated_ts || "0") < Number(downtime.player_updated_ts)) {
                        entries.push(html`
                            <staff-downtime-widget 
                                @complete=${this._handleRefreshAfterSubmit}
                                key='${character.key}' 
                                uid='${downtime.uid}' 
                                proposal='${downtime.proposal}'
                                staffnote='${downtime.staff_comment}'>
                            </staff-downtime-widget>`);
                    }
                }

                if (entries.length > 0) {
                    templates.push(html`<h2>${character.shadow_name} / ${character.player_name}</h2>`);
                    templates.push(...entries);
                }
            }
        }

        if (templates.length === 0) return html`<div class="no-downtime-msg">No downtime remaining! Nice work.</div>`;

        return html`${templates}`;
    }
}

customElements.define('staff-downtime-view', StaffDowntimeView);