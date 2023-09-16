import { LitElement, html, css } from 'lit';

//
// Handle basic Markdown formatting and generate corresponding HTML.
//
// Supported: 
// *Italic*
// **Bold**
// > blockquote
//

class MarkdownText extends LitElement {
    static properties = {
        text: { type: String }
    }

    static styles = css`
        div.md-blockquote {
            padding-left: 4px;
            border-left-width: 4px;
            border-left-style: solid;
            border-left-color: #aaaaaa;
            font-style: italic;
        }
  `;

    constructor() {
        super();
    }

    renderItalic(markdown) {
        const splits = markdown.split('*');
        const templates = [];

        let inItalic = false;
        for (let i = 0; i < splits.length; i++) {
            if (inItalic && (i + 1 < splits.length)) {
                templates.push(html`<i>${splits[i]}</i>`);
            } else {
                templates.push(html`${splits[i]}`);
            }
            inItalic = !inItalic;
        }

        return templates;
    }

    renderBold(markdown) {
        const splits = markdown.split('**');
        const templates = [];

        let inBold = false;
        for (let i = 0; i < splits.length; i++) {
            if (inBold && (i + 1 < splits.length)) {
                templates.push(html`<b>${this.renderItalic(splits[i])}</b>`);
            } else {
                templates.push(this.renderItalic(splits[i]));
            }
            inBold = !inBold;
        }

        return templates;
    }

    renderParagraph(markdown) {
        const blockquote = markdown.startsWith('>');

        return html`
    <div class="md-para ${blockquote ? 'md-blockquote' : ''}">
        ${this.renderBold(blockquote ? markdown.substring(1) : markdown)}
    </div>
    `;
    }

    renderMarkdown(markdown) {
        // Split into paragraphs by linebreak.
        return markdown.split(/\r?\n/).map(line => this.renderParagraph(line));
    }

    render() {
        return html`
      <div class='md-text'>
        ${this.renderMarkdown(this.text)}
      </div>
    `;
    }
}

customElements.define('markdown-text', MarkdownText);