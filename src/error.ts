import { Token } from './token';

export class RuntimeError extends Error {
  constructor(private token: Token, public message: string) {
    super(message);
  }

  toString(): string {
    return `${this.message}\n[line ${this.token.line}]`;
  }
}
