import { Expr } from './ast';

export class Interpreter {
  private locals = new Map<Expr, number>();

  constructor() {}

  resolve(expr: Expr, depth: number) {
    this.locals.set(expr, depth);
  }
}
