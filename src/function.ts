import { FunctionExpr, FunctionStmt } from './ast';
import { Callable } from './callable';
import { ClassInstance } from './class';
import { Environment } from './environment';
import { Interpreter } from './interpreter';

export class Return extends Error {
  constructor(public value?: any) {
    super();
  }
}

export class Function extends Callable {
  constructor(
    private declaration: FunctionStmt,
    private closure: Environment,
    private isInitializer: boolean,
    public isGetter: boolean,
  ) {
    super();
  }

  arity() {
    return this.declaration.params!.length;
  }

  call(interpreter: Interpreter, args: any[]) {
    const env = new Environment(this.closure);
    this.declaration.params?.forEach((param, i) => {
      env.define(param.lexeme, args[i]);
    });

    try {
      interpreter.executeBlock(this.declaration.body, env);
    } catch (error) {
      if (error instanceof Return) {
        if (this.isInitializer) {
          return this.closure.getAt(0, 'this');
        }
        return error.value;
      }
      throw error;
    }

    if (this.isInitializer) {
      return this.closure.getAt(0, 'this');
    }
  }

  bind(instance: ClassInstance): Function {
    const env = new Environment(this.closure);
    env.define('this', instance);
    return new Function(this.declaration, env, this.isInitializer, this.isGetter);
  }
}

export class FunctionExpression extends Callable {
  constructor(private declaration: FunctionExpr, public closure: Environment) {
    super();
  }

  arity() {
    return this.declaration.params!.length;
  }

  call(interpreter: Interpreter, args: any[]) {
    const env = new Environment(this.closure);
    this.declaration.params?.forEach((param, i) => {
      env.define(param.lexeme, args[i]);
    });

    try {
      interpreter.executeBlock(this.declaration.body, env);
    } catch (error) {
      if (error instanceof Return) {
        return error.value;
      }
      throw error;
    }
  }
}
