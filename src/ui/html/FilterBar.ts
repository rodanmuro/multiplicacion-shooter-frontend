/**
 * Barra de filtros HTML superpuesta al canvas. Los estilos viven en
 * `style.css` (clases `.filter-*`); aquí solo se crean y retiran los nodos.
 */

export type FilterBarVariant = 'stats' | 'users' | 'sessions';
export type FilterInputSize = 'short' | 'date' | 'narrow' | 'wide';

export class FilterBar {
  readonly element: HTMLDivElement;

  constructor(variant: FilterBarVariant, id?: string) {
    this.element = document.createElement('div');
    this.element.className = `filter-bar filter-bar--${variant}`;
    if (id) this.element.id = id;
  }

  label(text: string): HTMLSpanElement {
    return this.span('filter-label', text);
  }

  separator(text: string): HTMLSpanElement {
    return this.span('filter-separator', text);
  }

  total(text: string): HTMLSpanElement {
    return this.span('filter-total', text);
  }

  input(type: string, size?: FilterInputSize): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.className = size ? `filter-input filter-input--${size}` : 'filter-input';
    return input;
  }

  select(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'filter-select';
    return select;
  }

  button(text: string, primary = false): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = primary ? 'filter-btn filter-btn--primary' : 'filter-btn';
    button.textContent = text;
    return button;
  }

  append(...nodes: Node[]): this {
    nodes.forEach((node) => this.element.appendChild(node));
    return this;
  }

  mount(): this {
    document.body.appendChild(this.element);
    return this;
  }

  destroy(): void {
    this.element.remove();
  }

  private span(className: string, text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
}
