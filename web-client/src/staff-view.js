import { LitElement, html, css } from 'lit';
import { GetLarpServiceContext } from './service-context';
import './staff-characters-view';
import './staff-journal-view';
import './staff-downtime-view';

class StaffView extends LitElement {
    static properties = {
        _view: { state: true },
    }

    static styles = css`
        main {
            background-color: #FFFFFF; 
            width: 980px;
            margin: 0 auto;
            padding-left: 20px;
            padding-bottom: 12px;
        }

        div.menu {
        }

        div.menu-option {
            font-family: 'Playfair Display SC', serif;
            font-weight: 400;            
            text-transform: lowercase;
            font-size: 2em;
            display: inline-block;
            margin-right: 24px;
        }

        div.menu-option:hover {
            text-decoration: underline #aaaaaa;
        }

        div.menu-option.selected {
            text-decoration: underline;
        }

        div.section.folded {
            display: none;
        }

        span.player-name {
            font-family: 'Playfair Display SC', serif;
            font-weight: 400;            
            text-transform: none;
        }

        footer {
            background-color: #000000; 
            color: #FFFFFF;
            width: 980px;
            text-align: center;
            margin: 0 auto;
            margin-top: 12px;
        }
  `;

    _handle_update_view(view) {
        this._view = view;
    }

    constructor() {
        super();
        this._context = GetLarpServiceContext();
        this._context.addEventListener("updated", () => this.requestUpdate());
        this._view = 'downtime';
    }

    maybeError() {
        if (this._context.error() === null) return html``;
        return html`<div class="errorbox">${this._context.error()}</div>`;
    }

    sectionSelected(viewName) {
        return (viewName == this._view) ? 'selected' : '';
    }

    sectionVisibility(viewName) {
        return (viewName == this._view && this._context.data() !== null) ? 'unfolded' : 'folded';
    }

    render() {
        if (this._context.data() === null) {
            return html`<div class="section">Loading...</div>`;
        }

        return html`
      <main>        
        <div class="menu">
            <div 
                @click=${this._handle_update_view.bind(this, 'characters')} 
                class="menu-option ${this.sectionSelected('characters')}">Characters</div>
            <div 
                @click=${this._handle_update_view.bind(this, 'journal')} 
                class="menu-option ${this.sectionSelected('journal')}">Journal</div>
            <div
                @click=${this._handle_update_view.bind(this, 'downtime')}  
                class="menu-option ${this.sectionSelected('downtime')}">Downtime</div>
        </div>  
        ${this.maybeError()}

        <div class="section ${this.sectionVisibility('characters')}">
        <staff-characters-view></<staff-characters-view>
        </div>

        <div class="section ${this.sectionVisibility('journal')}">
        <staff-journal-view></<staff-journal-view>
        </div>

        <div class="section ${this.sectionVisibility('downtime')}">
        <staff-downtime-view></<staff-downtime-view>
        </div>
      </main>

      <footer>
        Logged in as ✨ <span class="player-name">${this._context.data().iam}</span> ✨. Use your powers wisely.
      </footer>
    `;
    }
}

customElements.define('staff-view', StaffView);