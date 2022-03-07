import { Interpreter } from './interpreter';

export class Callable {
  arity(): number {
    throw new Error('Method not implemented.');
  }

  call(interpreter: Interpreter, args: any[]): any {
    throw new Error('Method not implemented.');
  }
}
