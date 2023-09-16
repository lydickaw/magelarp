import { LitElement, html, css } from 'lit';

class NoAuthView extends LitElement {
  static properties = {
  }

  static styles = css`
  `;

  constructor() {
    super();
  }

  render() {
    return html`
      <main>
        <div class='infobox'>
            You aren't logged in. Please visit your "/player-login" link to get signed in (or ask your Storyteller for one).
        </div>
      </main>
    `;
  }
}

customElements.define('noauth-view', NoAuthView);