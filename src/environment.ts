import { RuntimeError } from './error';
import { Interpreter } from './interpreter';
import { Token } from './token';

export class Environment {
  private values = new Map<string, any>();

  constructor(public enclosing?: Environment) {}

  define(name: string, value: any) {
    this.values.set(name, value);
  }

  get(interpreter: Interpreter | undefined, name: Token): any {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }
    if (this.enclosing) {
      return this.enclosing.get(interpreter, name);
    }
    throw new RuntimeError(name, `Undefined variable name '${name.lexeme}'`);
  }

  getAt(distance: number, name: string): any {
    return this.ancestor(distance).values.get(name);
  }

  assign(name: Token, value: any) {
    if (this.values.has(name.lexeme)) {
      this.define(name.lexeme, value);
      return;
    }
    if (this.enclosing) {
      this.enclosing.assign(name, value);
    }
    throw new RuntimeError(name, `Undefined variable name '${name.lexeme}'`);
  }

  assignAt(distance: number, name: Token, value: any) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  private ancestor(distance: number): Environment {
    let current: Environment = this;
    for (let i = 0; i < distance; i++) {
      current = current.enclosing!;
    }
    return current;
  }
}
