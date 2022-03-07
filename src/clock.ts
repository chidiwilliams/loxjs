import { Callable } from './callable';
import { Interpreter } from './interpreter';

export class Clock extends Callable {
  arity(): number {
    return 0;
  }

  call(interpreter: Interpreter, args: any[]): number {
    return Date.now();
  }
}
