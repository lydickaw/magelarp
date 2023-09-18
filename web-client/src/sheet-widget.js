import { LitElement, html, css } from 'lit';
import { GetLarpServiceContext } from './service-context';

const ATTRIBUTES = [
    'intelligence',
    'wits',
    'resolve',
    'strength',
    'dexterity',
    'stamina',
    'presence',
    'manipulation',
    'composure'
];

const MENTAL_SKILLS = [
    'academics',
    'computer',
    'crafts',
    'investigation',
    'medicine',
    'occult',
    'politics',
    'science'
];

const PHYSICAL_SKILLS = [
    'athletics',
    'brawl',
    'drive',
    'firearms',
    'larceny',
    'stealth',
    'survival',
    'weaponry'
];

const SOCIAL_SKILLS = [
    'animal ken',
    'empathy',
    'expression',
    'intimidation',
    'persuasion',
    'socialize',
    'streetwise',
    'subterfuge'
];

const WIZARD_TEMPLATE = [
    'death',
    'fate',
    'forces',
    'life',
    'matter',
    'mind',
    'prime',
    'space',
    'spirit',
    'time',
    'gnosis',
    'wisdom'
];

class SheetWidget extends LitElement {
    static properties = {
        edit: { type: Boolean },
    }

    static styles = css`
    div.stats-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        max-width: 420px;
    }

    div.stat-box {
        min-width: 140px;
    }

    div.stat-box-10 {
        width: 240px;
    }

    div.stat-dots {
        font-size: 38px;
    }

    div.stat-name {
        font-family: 'Courier Prime', monospace;
        font-size: 14px;
        padding-left: 3px;
    }

    div.stat-qual {
        font-family: 'Courier Prime', monospace;
        font-size: 12px;
        padding-left: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 140px;
    }

    h2 {
        font-family: 'Special Elite', cursive;
        margin-bottom: 0px;
    }

    #stats-text {
        display: block;
        width: 480px;
        height: 480px;
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

    button {
        margin-left: 12px;
    }

    button:hover {
        background-color: #f5f5f5;
        border-color: #000000;
    }

    div.edit-sheet-instructions {        
        font-family: "EB Garamond", serif;
        font-weight: 500;
        margin-bottom: 16px;
    }

    div.edit-sheet-example {
        display: inline-block;
        font-family: "Courier Prime", monospace;
        font-size: 13px;
        border: #aaaaaa solid 1px;
        padding: 3px;
        background-color: #eeeeee;
    }

    @media(max-width: 940px) {
        div.button-container {
            width: 100%;
        }

        #stats-text {
            width: 100%;
        }

        div.stats-container {
            max-width: 294px;
        }

        div.stat-box {
            min-width: 98px;
        }

        div.stat-dots {
            font-size: 24px;
        }

        div.stat-name {
            font-size: 12px;
            padding-left: 1px;
            max-width: 97px;
        }

        div.stat-qual {
            font-size: 11px;
            padding-left: 1px;
            max-width: 97px;
        }
    }
  `;

    constructor() {
        super();
        this.edit = false;
        this._context = GetLarpServiceContext();
    }

    statsToJson(stats) {
        const errors = [];
        const rxStat = /^\s*([a-zA-Z]+)\s*(\[.*\])?\s*:\s*(\d+)\s*$/;
        const json = {};

        for (const line of stats.split(/\r?\n/)) {
            // Skip blank lines.
            if (line.trim().length === 0) {
                continue;
            }

            // Try to parse stat line.
            const match = line.match(rxStat);
            if (match === null) {
                errors.push("Did not recognize: " + line);
            }

            const stat = match[1];
            const qualifier = match[2];
            const val = match[3];

            // TODO: verify stat is a known stat
            // TODO: verify length is reasonable
            // TODO: verify val is reasonable
            // TODO: normalize casing.

            const field = qualifier ? (stat + ' [' + qualifier + ']') : stat;
            json[field] = Number(val);
        }

        if (errors.length > 0) {
            // TODO: raise exception w/ validation hints.
        }

        return json;
    }

    _fireComplete() {
        this.dispatchEvent(new CustomEvent('complete', { bubbles: true, composed: true }));
    }

    async _handleUpdate() {
        const textarea = this.renderRoot.querySelector('#stats-text');
        const btnCancel = this.renderRoot.querySelector('#stats-cancel');
        const btnUpdate = this.renderRoot.querySelector('#stats-update');
        const stats = textarea.value;

        textarea.disabled = true;
        btnCancel.disabled = true;
        btnUpdate.disabled = true;

        // TODO: try/catch w/ form validation.
        const newstats = this.statsToJson(stats);

        try {            
            await this._context.updateStats(newstats);
            this._context.data().stats = newstats;
            this._fireComplete();
        } finally {
            textarea.disabled = false;
            btnCancel.disabled = false;
            btnUpdate.disabled = false;
        }
    }

    _handleCancel() {
        this._fireComplete();
    }

    _renderDots(count, opt_outOf) {
        const outOf = opt_outOf || 5;
        const dots = [];
        for (let i = 0; i < outOf || i < count; i++) {
            if (i < count) {
                dots.push('●');
            } else {
                dots.push('○');
            }
        }
        return dots;
    }

    _statsToNormalizedLookup() {
        const stats = this._context.data().stats;
        const rxName = /^([a-zA-Z]+)\s*(\[.*\])?$/;

        // Set of stat names that are never duplicated. Others get put in a list of "other".
        const distinctStats = new Set(ATTRIBUTES.concat(
            MENTAL_SKILLS, PHYSICAL_SKILLS, SOCIAL_SKILLS, WIZARD_TEMPLATE));

        const lookup = {};
        const other = [];

        for (const [name, dots] of Object.entries(stats)) {
            const unpacked = name.match(rxName);
            const unpacked_name = unpacked[1].toLowerCase();
            const unpacked_qual = unpacked[2] && unpacked[2].replaceAll('[', '').replaceAll(']', '');

            if (distinctStats.has(unpacked_name)) {
                lookup[unpacked_name] = { qual: unpacked_qual, dots: dots };
            } else {
                other.push({ name: unpacked_name, qual: unpacked_qual, dots: dots });
            }
        }

        // Put objects in a consistent order.
        other.sort((a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase()));

        return [lookup, other];
    }

    _visitStats(lookup, other, visitAttributes, visitSkills, visitArcana, visitMerits, opt_group_start) {
        opt_group_start && opt_group_start("attributes");

        for (const name of ATTRIBUTES) {
            const val = lookup[name.toLowerCase()] || { dots: 1 };
            visitAttributes(name, val);
        }

        opt_group_start && opt_group_start("skills");

        for (const name of MENTAL_SKILLS.concat(PHYSICAL_SKILLS, SOCIAL_SKILLS)) {
            const val = lookup[name.toLowerCase()];
            if (val) {
                visitSkills(name, val);
            }
        }

        opt_group_start && opt_group_start("arcana");

        for (const name of WIZARD_TEMPLATE) {
            const val = lookup[name.toLowerCase()];
            if (val) {
                visitArcana(name, val);
            }
        }

        opt_group_start && opt_group_start("merits");

        for (const val of other) {
            visitMerits(val.name, val);
        }
    }

    _sheetToText() {
        const [lookup, other] = this._statsToNormalizedLookup();
        const collector = [];
        const collect = (name, val) => {
            if (val.qual) {
                collector.push(`${name} [${val.qual}]: ${val.dots}`);
            } else {
                collector.push(`${name}: ${val.dots}`);
            }
        };
        const addBreak = (section) => {
            collector.push("");
        };

        this._visitStats(lookup, other, collect, collect, collect, collect, addBreak);

        return collector.join("\n").trim();
    }

    _renderSheet() {
        const [lookup, other] = this._statsToNormalizedLookup();

        const attributes = [];
        const visitAttributes = (name, val) => {
            attributes.push(
                html`
                <div class="stat-box">
                    <div class="stat-dots">${this._renderDots(val.dots)}</div>
                    <div class="stat-name">${name}</div>
                </div>`
            );
        };

        const skills = [];
        const visitSkills = (name, val) => {
            skills.push(
                html`
                <div class="stat-box">
                    <div class="stat-dots">${this._renderDots(val.dots)}</div>                    
                    <div class="stat-name">${name}</div>
                    <div class="stat-qual">${val.qual}</div>
                </div>`
            );
        };

        const arcana = [];
        const visitArcana = (name, val) => {
            arcana.push(
                html`
                <div class="stat-box">
                    <div class="stat-dots">${this._renderDots(val.dots)}</div>
                    <div class="stat-name">${name}</div>
                </div>`
            );
        };        

        const merits = [];
        const visitMerits = (name, val) => {
            merits.push(
                html`
                <div class="stat-box">
                    <div class="stat-dots">${this._renderDots(val.dots)}</div>                    
                    <div class="stat-name">${name}</div>
                    <div class="stat-qual">${val.qual}</div>
                </div>`
            );
        }

        this._visitStats(lookup, other, visitAttributes, visitSkills, visitArcana, visitMerits);

        return html`
        <h2>Attributes</h2>
        <div class="stats-container">
            ${attributes}
        </div>

        <h2>Skills</h2>
        <div class="stats-container">
            ${skills}
        </div>

        <h2>Arcana</h2>
        <div class="stats-container">
            ${arcana}
        </div>

        <h2>Merits</h2>
        <div class="stats-container">
            ${merits}        
        </div>
        `;
    }

    render() {
        if (this.edit) {
            return html`
            <div class="edit-sheet-instructions">
                <p>To provide a reference for the Storyteller, you can enter your stats below, one on each line. For example:</p>
                <div class="edit-sheet-example">Intelligence: 3</div>
                <p>For skill specalities or qualified merits, you can include additional information in brackets:</p>
                <div class="edit-sheet-example">
                    <div>Expression [sp: dance]: 2</div>
                    <div>Artifact [haunted trombone]: 3</div>
                </div>
                <p>Rotes, Equipment, and Derived stats (ex: defense, mana) are not currently supported.</p>
            </div>
            <div class="edit-sheet">
                <textarea id="stats-text" .value=${this._sheetToText()}></textarea>
                <div class="button-container">
                    <button id="stats-cancel"
                    @click=${this._handleCancel}>Cancel</button>
                    <button id="stats-update"
                    @click=${this._handleUpdate}>Update</button>
                </div>
            </div>
            `;
        } else {
            return this._renderSheet();
        }
    }
}

customElements.define('sheet-widget', SheetWidget);