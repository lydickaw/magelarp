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
  `;

    constructor() {
        super();
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => this.requestUpdate());
    }

    // TODO: pretty layout
    // TODO: show placeholder when there are no downtimes pending.
    // TODO: show instructions.

    render() {
        const templates = [];
        if (this._context.data() !== null) {
            for (const character of this._context.data().characters) {
                if (character.downtime.length > 0) {
                    templates.push(html`<h2>${character.shadow_name} / ${character.player_name}</h2>`);
                }

                for (const downtime of character.downtime) {
                    templates.push(html`
                        <staff-downtime-widget 
                            key='${character.key}' 
                            uid='${downtime.uid}' 
                            proposal='${downtime.proposal}'
                            staffnote='${downtime.staff_comment}'>
                        </staff-downtime-widget>`);
                }
            }
        }
        return html`${templates}`;
    }
}

customElements.define('staff-downtime-view', StaffDowntimeView);