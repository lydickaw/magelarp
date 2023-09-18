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
            padding-bottom: 4px;
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
            dsplay: inline-block;
            padding-left: 6px;
            padding-right: 6px;
            padding-top: 1px;
            padding-bottom: 1px;
            margin-right: 6px;
            margin-top: 4px;
        }

        input.add-tag {
            width: 100px;
            font-family: "EB Garamond";
            font-size: 14px;
            display: inline-block;
            border-style: solid;
            border-width: 1px;
            border-color: #999999;
            margin-top: 4px;
            margin-bottom: 2px;
            padding-top: 0px;
            padding-bottom: 0px;
        }

        input.add-tag:focus {
            padding-top: 2px;
            padding-bottom: 2px;
            margin-top: 2px;
            margin-bottom: 0px;
        }

        div.char-entry button {
            font-family: "EB Garamond";
            font-size: 14px;
            display: inline-block;
            background-color: #ffffff;
            border-style: solid;
            border-width: 1px;
            border-color: #999999;
            font-weight: normal;
            transition: all 0.5s linear;
            margin-top: 2px;
            margin-bottom: 2px;
            margin-left: -3px;
            padding-top: 0px;
            padding-bottom: 0px;
        }
        
        div.char-entry button:hover {
            background-color: #f5f5f5;
            border-color: #000000;
        }

        h2 {
            margin-bottom: 12px;
            font-family: "EB Garamond";
            font-size: 22px;
        }

        div.char-entry {
            margin-bottom: 20px;
        }

        div.add-staff-or-player-container {
            display: flex;
            flex-flow: row-reverse;
        }

        div.add-staff-or-player {
            margin-top: 35px;
            margin-right: 20px;
        }

        div.add-staff-or-player input {
            display: block;
            width: 240px;
            box-sizing: border-box;
            border-style: solid;
            border-width: 1px;
            border-color: rgb(170, 170, 170);
            padding-left: 8px;
            padding-top: 3px;
            padding-bottom: 2px;
            font-family: "Courier Prime", monospace;
            margin-bottom: 6px;
        }

        div.button-container {
            width: 240px;
            display: flex;
            justify-content: flex-end;
        }

        div.add-staff-or-player button {
            padding-top: 3px;
            padding-bottom: 3px;
            padding-left: 20px;
            padding-right: 20px;
            background-color: #ffffff;
            border-style: solid;
            border-width: 1px;
            border-color: #999999;
            text-transform: lowercase;
            font-family: 'Playfair Display SC';
            font-weight: normal;
            font-size: 16px;
            transition: all 0.5s linear;
        }

        div.add-staff-or-player button:hover {
            background-color: #f5f5f5;
            border-color: #000000;
        }

        span.get-login-link {            
            font-family: "Courier Prime", monospace;
            font-size: 12px;
            text-decoration: underline;
            margin-left: 6px;
        }

        span.login-link {         
            display: none;   
            font-family: "Courier Prime", monospace;
            font-size: 12px;
            border: solid #c5c5c5 1px;
            background-color: #f5f5f5;
            padding-top: 2px;
            padding-left: 4px;
            padding-right: 4px;
            margin-left: 6px;
        }
  `;

    constructor() {
        super();
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => this.requestUpdate());
    }

    async _handleDeleteTag(char, tag) {
        await this._context.deleteTag(char.key, tag);

        // Refresh local view.
        char.tags = char.tags.filter(x => x !== tag);
        this.requestUpdate();
    }

    async _handleAddTags(char) {
        const tags = this.renderRoot.querySelector('#tags-' + char.key);
        const parsedTags = tags.value.split(',').map(x => x.trim()).filter(x => x.length > 0);
        if (parsedTags.length === 0) {
            return;
        }

        await this._context.addTags(char.key, parsedTags);

        tags.value = '';
        char.tags.push(...parsedTags);
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

    _handleGetLink(key) {
        const span = this.renderRoot.querySelector('#login-link-' + key);
        span.style.display = 'initial';

        const oldSpan = this.renderRoot.querySelector('#get-login-link-' + key);
        oldSpan.style.display = 'none';
    }

    _renderCharacter(char) {
        return html`
            <div class="char-entry">
                <h2>${char.shadow_name} / ${char.player_name}</h2>
                <div class="char-stats">
                    ${Object.entries(char.stats).length === 0 ? html`no stats submitted` : html``}

                    ${join(
                        map(Object.entries(char.stats), x => this._renderStat(x)),
                        ', '
                    )}
                </div>
                <div class="char-tags">
                    ${map(char.tags, x => this._renderTag(char, x))}
                    <input id="${'tags-' + char.key}" class="add-tag" placeholder="add tags...">
                    </input><button @click=${this._handleAddTags.bind(this, char)}>+</button>
                    <span id="get-login-link-${char.key}" 
                          class="get-login-link" 
                          @click=${this._handleGetLink.bind(this, char.key)}>get login</span>
                    <span id="login-link-${char.key}" class="login-link">
                        ${window.location.origin + '/player-login?key=' + char.key}
                    </span>
                </div>
            </div>
        `;
    }

    async _handleAddCharacter() {
        const shadowName = this.renderRoot.querySelector('#shadow-name');
        const playerName = this.renderRoot.querySelector('#player-name');
        const btn = this.renderRoot.querySelector('#btn-add-player');

        if (shadowName.value.trim().length === 0 || playerName.value.trim().length === 0) {
            return;
        }

        btn.disabled = true;

        try {
            const character = await this._context.addCharacter(shadowName.value, playerName.value);
            this._context.data().characters.push(character);
            this.requestUpdate();
        } finally {
            btn.disabled = false;
            shadowName.value = '';
            playerName.value = '';
        }
    }

    render() {
        const data = this._context.data();
        if (data === null) {
            return;
        }

        return html`
            ${map(data.characters, x => this._renderCharacter(x))}

            <div class="add-staff-or-player-container">
                <div class="add-staff-or-player">
                    <input id="shadow-name" placeholder="Shadow name..."></input>
                    <input id="player-name" placeholder="Player name..."></input>
                    <div class="button-container">
                        <button id="btn-add-player" @click=${this._handleAddCharacter}>
                            Add Character
                        </button>
                    </div>
                </div>
            </div>
    `;
    }
}

customElements.define('staff-characters-view', StaffCharactersView);