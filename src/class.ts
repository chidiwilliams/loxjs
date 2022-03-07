import { Callable } from './callable';
import { RuntimeError } from './error';
import { Function } from './function';
import { Interpreter } from './interpreter';
import { Token } from './token';

export class BaseInstance extends Callable {
  get(interpreter: Interpreter, name: Token) {
    throw new Error('Method not implemented.');
  }
}

export class Class extends BaseInstance {
  constructor(
    private name: string,
    private methods: Map<string, Function>,
    private superclass?: Class,
  ) {
    super();
  }

  findMethod(name: string): Function | undefined {
    return this.methods.get(name) || this.superclass?.findMethod(name);
  }

  get(interpreter: Interpreter, name: Token) {
    const method = this.findMethod(name.lexeme);
    if (method !== undefined) {
      return method;
    }
    throw new RuntimeError(name, `Undefined property '${name.lexeme}'`);
  }

  arity(): number {
    return this.findMethod('init')?.arity() ?? 0;
  }

  call(interpreter: Interpreter, args: any[]) {
    const instance = new ClassInstance(this);
    const initializer = this.findMethod('init');
    if (initializer !== undefined) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }
}

export class ClassInstance extends BaseInstance {
  private fields = new Map<string, any>();

  constructor(private clazz: Class) {
    super();
  }

  get(interpreter: Interpreter, name: Token) {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.clazz.findMethod(name.lexeme);
    if (method !== undefined) {
      const boundMethod = method.bind(this);
      return method.isGetter ? boundMethod.call(interpreter, []) : boundMethod;
    }

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: Token, value: any) {
    this.fields.set(name.lexeme, value);
  }
}
