import { LitElement, html, css } from 'lit';
import './noauth-view';
import './player-view';
import './staff-view';
import { GetLarpServiceContext } from './service-context';

class WebClient extends LitElement {
  static properties = {
  }

  static styles = css`
  `;

  constructor() {
    super();
    this._context = GetLarpServiceContext();
  }

  render() {
    if (this._context.isStaff()) {
      return html`<staff-view></staff-view>`;
    } else if (this._context.isPlayer()) {
      return html`<player-view></player-view>`;
    } else {
      return html`<noauth-view></noauth-view>`;
    }
  }
}

customElements.define('web-client', WebClient);