import { Token } from './token';

interface ScopeVar {
  token?: Token;
  defined: boolean;
  used: boolean;
}

export class Scope {
  private values = new Map<string, ScopeVar>();

  declare(name: string, token: Token) {
    this.values.set(name, { token, defined: false, used: false });
  }

  define(name: string) {
    this.values.get(name)!.defined = true;
  }

  has(name: string) {
    const val = this.values.get(name);
    const declared = val !== undefined;
    return { declared: declared, defined: declared && val.defined };
  }

  use(name: string) {
    this.values.get(name)!.used = true;
  }

  set(name: string) {
    this.values.set(name, { defined: true, used: true });
  }

  entries() {
    return this.values.entries();
  }
}
