type Props = Record<string, any>;
type Child = string | number | boolean | null | undefined | Node | Child[];

export class Node {
  type: string | Function;
  props: Props;
  children: Child[];

  constructor(type: string | Function, props: Props = {}, ...children: Child[]) {
    this.type = type;
    this.props = props;
    this.children = children.flat();
  }

  toString(): string {
    if (typeof this.type === 'function') {
      return this.type({ ...this.props, children: this.children }).toString();
    }

    const props = Object.entries(this.props)
      .filter(([key]) => key !== 'children')
      .map(([key, value]) => {
        if (key === 'className') key = 'class';
        if (value === true) return key;
        if (value === false || value == null) return '';
        return `${key}="${value}"`;
      })
      .filter(Boolean)
      .join(' ');

    const children = this.children
      .map(child => child?.toString() ?? '')
      .join('');

    if (this.type === '') {
      return children;
    }

    return `<${this.type}${props ? ' ' + props : ''}>${children}</${this.type}>`;
  }

  toDOM(): HTMLElement | DocumentFragment {
    if (typeof this.type === 'function') {
      return this.type({ ...this.props, children: this.children }).toDOM();
    }

    if (this.type === '') {
      const fragment = document.createDocumentFragment();
      this.children.forEach(child => {
        if (child instanceof Node) {
          fragment.appendChild(child.toDOM());
        } else if (child != null) {
          fragment.appendChild(document.createTextNode(String(child)));
        }
      });
      return fragment;
    }

    const element = document.createElement(this.type);
    
    Object.entries(this.props).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        element.setAttribute(key, '');
      } else if (value != null && value !== false) {
        element.setAttribute(key, String(value));
      }
    });

    this.children.forEach(child => {
      if (child instanceof Node) {
        element.appendChild(child.toDOM());
      } else if (child != null) {
        element.appendChild(document.createTextNode(String(child)));
      }
    });

    return element;
  }
}

export const sjs = {
  createElement(type: string | Function, props: Props = {}, ...children: Child[]): Node {
    return new Node(type, props, ...children);
  },

  Fragment: '',

  render(node: Node, container: Element | null) {
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(node.toDOM());
  }
};

declare global {
  namespace JSX {
    interface Element extends Node {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
} 