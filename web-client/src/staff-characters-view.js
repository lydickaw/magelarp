import { LitElement, html, css } from 'lit';
import { map } from 'lit/directives/map.js';
import { join } from 'lit/directives/join.js';
import { GetLarpServiceContext } from './service-context';

class StaffCharactersView extends LitElement {
    static properties = {
    }

    static styles = css`
        div.char-stats {
            font-family: 'Courier Prime', monospace;
            font-size: 14px;
            padding-bottom: 8px;
        }

        span.char-stat {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        span.char-stat-name {            
        }

        span.char-stat-dots {            
        }

        span.char-tag {
            font-family: "EB Garamond";
            font-size: 14px;
            background-color: #000000;
            color: #FFFFFF;
            padding-left: 6px;
            padding-right: 6px;
            padding-top: 1px;
            padding-bottom: 1px;
            margin-right: 6px;
        }

        h2 {
            margin-bottom: 12px;
            font-family: "EB Garamond";
            font-size: 22px;
        }

        div.char-entry {
            margin-bottom: 20px;
        }
  `;

    constructor() {
        super();
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => this.requestUpdate());
    }

    // TODO:
    // Add tag [make input outline invisible-ish until mouseover]        
    // Get link
    // Regenerate link        

    // TODO: FUTURE:
    // search for players with stat
    // audit trail (journal entries for Admin Actions)
    // Easy undo from admin actions page (instead of safeguards)
    // warn about typo tags

    async _handleDeleteTag(char, tag) {
        await this._context.deleteTag(char.key, tag);

        // Refresh local view.
        char.tags = char.tags.filter(x => x !== tag);
        this.requestUpdate();
    }

    _renderTag(char, tag) {
        return html`
            <span class="char-tag">${tag} 
            <span class="char-tag-del" @click=${this._handleDeleteTag.bind(this, char, tag)}>🗙</span>
            </span>
        `;
    }

    _renderStat(pair) {
        // TODO: share the [[ ]] fixup code.
        const rxName = /^([a-zA-Z]+)\s*(\[.*\])?$/;
        const [name, dots] = pair;
        const unpacked = name.match(rxName);
        const unpacked_name = unpacked[1].toLowerCase();
        const unpacked_qual = unpacked[2] && unpacked[2].replaceAll('[', '').replaceAll(']', '');
        const repacked_name = unpacked_qual ? `${unpacked_name} [${unpacked_qual}]` : unpacked_name;

        return html`<span class="char-stat">
            <span class="char-stat-name">${repacked_name}</span><span class="char-stat-sep">:</span>
            <span class="char-stat-dots">${dots}</span></span>`;
    }

    _renderCharacter(char) {
        return html`
            <div class="char-entry">
                <h2>${char.shadow_name} / ${char.player_name}</h2>
                <div class="char-stats">                
                    ${join(
                        map(Object.entries(char.stats), x => this._renderStat(x)),
                        ', '
                    )}
                </div>
                <div class="char-tags">
                    ${map(char.tags, x => this._renderTag(char, x))}
                    <input class="add-tag"></input>
                </div>
            </div>
        `;
    }

    render() {
        const data = this._context.data();
        if (data === null) {
            return;
        }

        return html`
            ${map(data.characters, x => this._renderCharacter(x))}

            <div>TODO: add player [shadow name] [real name]</div>
            <div>TODO: add staff [name]</div>
    `;
    }
}

customElements.define('staff-characters-view', StaffCharactersView);