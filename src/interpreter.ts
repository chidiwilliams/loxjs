import {
  AssignExpr,
  BinaryExpr,
  BlockStmt,
  BreakStmt,
  CallExpr,
  ClassStmt,
  ContinueStmt,
  Expr,
  ExpressionStmt,
  FunctionExpr,
  FunctionStmt,
  GetExpr,
  GroupingExpr,
  IfStmt,
  LiteralExpr,
  LogicalExpr,
  PrintStmt,
  ReturnStmt,
  SetExpr,
  Stmt,
  SuperExpr,
  TernaryExpr,
  ThisExpr,
  UnaryExpr,
  VariableExpr,
  VarStmt,
  WhileStmt,
} from './ast';
import { Callable } from './callable';
import { BaseInstance, Class, ClassInstance } from './class';
import { Clock } from './clock';
import { Environment } from './environment';
import { RuntimeError } from './error';
import { Function, FunctionExpression, Return } from './function';
import { Token, TokenType } from './token';
import { Writer } from './writer';

class Continue extends Error {}
class Break extends Error {}

export class Interpreter {
  private locals = new Map<Expr, number>();
  private globals: Environment;
  public environment: Environment;

  constructor(private stdOut: Writer, private stdErr: Writer) {
    this.globals = new Environment();
    this.globals.define('clock', new Clock());
    this.environment = this.globals;
  }

  resolve(expr: Expr, depth: number) {
    this.locals.set(expr, depth);
  }

  interpret(statements: Stmt[]): any {
    try {
      let result: any;
      statements.forEach((stmt) => {
        result = this.execute(stmt);
      });
      return result;
    } catch (error) {
      this.stdErr.writeLn(error instanceof RuntimeError ? error.toString() : `Error: ${error}`);
    }
  }

  executeBlock(statements: Stmt[], environment: Environment) {
    const previous = this.environment;
    try {
      this.environment = environment;
      statements.forEach((stmt) => {
        this.execute(stmt);
      });
    } finally {
      this.environment = previous;
    }
  }

  stringify(value: any) {
    if (value === null || value === undefined) {
      return 'nil';
    }
    return value.toString();
  }

  private execute(stmt: Stmt): any {
    if (stmt instanceof PrintStmt) {
      const value = this.evaluate(stmt.expr);
      this.stdOut.writeLn(this.stringify(value));
      return;
    }
    if (stmt instanceof VarStmt) {
      let value: any;
      if (stmt.initializer !== undefined) {
        value = this.evaluate(stmt.initializer);
      }
      this.environment.define(stmt.name.lexeme, value);
      return;
    }
    if (stmt instanceof ExpressionStmt) {
      return this.evaluate(stmt.expr);
    }
    if (stmt instanceof BlockStmt) {
      this.executeBlock(stmt.statements, new Environment(this.environment));
      return;
    }
    if (stmt instanceof WhileStmt) {
      try {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
          try {
            this.execute(stmt.body);
          } catch (error) {
            if (!(error instanceof Continue)) {
              throw error;
            }
          }
        }
      } catch (error) {
        if (!(error instanceof Break)) {
          throw error;
        }
      }
      return;
    }
    if (stmt instanceof IfStmt) {
      if (this.isTruthy(this.evaluate(stmt.condition))) {
        this.execute(stmt.thenBranch);
      } else if (stmt.elseBranch !== undefined) {
        this.execute(stmt.elseBranch);
      }
      return;
    }
    if (stmt instanceof BreakStmt) {
      throw new Break();
    }
    if (stmt instanceof ContinueStmt) {
      throw new Continue();
    }
    if (stmt instanceof FunctionStmt) {
      const func = new Function(stmt, this.environment, false, false);
      this.environment.define(stmt.name.lexeme, func);
      return;
    }
    if (stmt instanceof ReturnStmt) {
      let value: any;
      if (stmt.value !== undefined) {
        value = this.evaluate(stmt.value);
      }
      throw new Return(value);
    }
    if (stmt instanceof ClassStmt) {
      let superclass: Class | undefined;
      if (stmt.superclass !== undefined) {
        const maybeSuperclass = this.evaluate(stmt.superclass);
        if (!(maybeSuperclass instanceof Class)) {
          this.error(stmt.superclass.name, 'Superclass must be a class.');
        }
        superclass = maybeSuperclass;
      }

      this.environment.define(stmt.name.lexeme, undefined);

      if (superclass !== undefined) {
        this.environment = new Environment(this.environment);
        this.environment.define('super', superclass);
      }

      const methods = new Map<string, Function>();
      stmt.methods.forEach((method) => {
        const func = new Function(
          method,
          this.environment,
          method.name.lexeme === 'init',
          method.params === undefined,
        );
        methods.set(method.name.lexeme, func);
      });

      const clazz = new Class(stmt.name.lexeme, methods, superclass);
      if (superclass !== undefined) {
        this.environment = this.environment.enclosing!;
      }

      this.environment.assign(stmt.name, clazz);
      return;
    }

    throw `Can't execute ${stmt.constructor.name}`;
  }

  private evaluate(expr: Expr): any {
    if (expr instanceof LiteralExpr) {
      return expr.value;
    }
    if (expr instanceof LogicalExpr) {
      const left = this.evaluate(expr.left);
      if (expr.operator.tokenType === TokenType.Or) {
        if (this.isTruthy(left)) {
          return left;
        }
      } else {
        // and
        if (!this.isTruthy(left)) {
          return left;
        }
      }
      return this.evaluate(expr.right);
    }
    if (expr instanceof BinaryExpr) {
      const left = this.evaluate(expr.left);
      const right = this.evaluate(expr.right);
      switch (expr.operator.tokenType) {
        case TokenType.Plus:
          if (typeof left === 'number' && typeof right === 'number') {
            return left + right;
          }
          if (typeof left === 'string' && typeof right === 'string') {
            return left + right;
          }
          this.error(expr.operator, 'Operands must be two numbers or two strings.');
        case TokenType.Minus:
          this.checkNumberOperands(expr.operator, left, right);
          return left - right;
        case TokenType.Slash:
          this.checkNumberOperands(expr.operator, left, right);
          return left / right;
        case TokenType.Star:
          this.checkNumberOperands(expr.operator, left, right);
          return left * right;
        case TokenType.Greater:
          this.checkNumberOperands(expr.operator, left, right);
          return left > right;
        case TokenType.GreaterEqual:
          this.checkNumberOperands(expr.operator, left, right);
          return left >= right;
        case TokenType.Less:
          this.checkNumberOperands(expr.operator, left, right);
          return left < right;
        case TokenType.LessEqual:
          this.checkNumberOperands(expr.operator, left, right);
          return left <= right;
        case TokenType.EqualEqual:
          this.checkNumberOperands(expr.operator, left, right);
          return left === right;
        case TokenType.BangEqual:
          this.checkNumberOperands(expr.operator, left, right);
          return left !== right;
        case TokenType.Comma:
          this.checkNumberOperands(expr.operator, left, right);
          return right;
        default:
          throw 'Unknown binary operator.';
      }
    }
    if (expr instanceof TernaryExpr) {
      const cond = this.evaluate(expr.cond);
      if (this.isTruthy(cond)) {
        return this.evaluate(expr.left);
      }
      return this.evaluate(expr.right);
    }
    if (expr instanceof GroupingExpr) {
      return this.evaluate(expr.expression);
    }
    if (expr instanceof UnaryExpr) {
      const right = this.evaluate(expr.right);
      switch (expr.operator.tokenType) {
        case TokenType.Bang:
          return !this.isTruthy(right);
        case TokenType.Minus:
          this.checkNumberOperand(expr.operator, right);
          return -right;
        default:
          break;
      }
    }
    if (expr instanceof VariableExpr) {
      return this.lookupVariable(expr.name, expr);
    }
    if (expr instanceof AssignExpr) {
      const value = this.evaluate(expr.value);
      if (this.locals.has(expr)) {
        const distance = this.locals.get(expr)!;
        this.environment.assignAt(distance, expr.name, value);
      } else {
        this.globals.assign(expr.name, value);
      }
      return value;
    }
    if (expr instanceof CallExpr) {
      const callee = this.evaluate(expr.callee);

      const args: any[] = [];
      expr.args.forEach((arg) => {
        args.push(this.evaluate(arg));
      });

      if (!(callee instanceof Callable)) {
        this.error(expr.paren, 'Can only call functions and classes.');
      }

      if (args.length !== callee.arity()) {
        this.error(expr.paren, `Expected ${callee.arity()} arguments but got ${args.length}.`);
      }

      return callee.call(this, args);
    }
    if (expr instanceof FunctionExpr) {
      const func = new FunctionExpression(expr, new Environment(this.environment));
      if (expr.name !== undefined) {
        func.closure.define(expr.name.lexeme, func);
      }
      return func;
    }
    if (expr instanceof SuperExpr) {
      const distance = this.locals.get(expr)!;
      const superclass: Class = this.environment.getAt(distance, 'super');
      const object: ClassInstance = this.environment.getAt(distance - 1, 'this');
      const method = superclass.findMethod(expr.method.lexeme);
      if (method === undefined) {
        this.error(expr.method, `Undefined property '${expr.method.lexeme}'.`);
      }
      return method.bind(object);
    }
    if (expr instanceof GetExpr) {
      const object = this.evaluate(expr.object);
      if (object instanceof BaseInstance) {
        return object.get(this, expr.name);
      }
      this.error(expr.name, 'Only instances have properties.');
    }
    if (expr instanceof SetExpr) {
      const object = this.evaluate(expr.object);
      if (!(object instanceof ClassInstance)) {
        this.error(expr.name, 'Only instances have fields.');
      }

      const value = this.evaluate(expr.value);
      object.set(expr.name, value);
      return;
    }
    if (expr instanceof ThisExpr) {
      return this.lookupVariable(expr.keyword, expr);
    }

    throw `Can't evaluate ${expr.constructor.name}`;
  }

  private error(token: Token, message: string): never {
    throw new RuntimeError(token, message);
  }

  private isTruthy(val: any): boolean {
    if (val === null || val === undefined) {
      return false;
    }
    if (typeof val === 'boolean') {
      return val;
    }
    return true;
  }

  private checkNumberOperands(operator: Token, left: any, right: any) {
    if (typeof left === 'number' && typeof right === 'number') {
      return;
    }
    throw new RuntimeError(operator, 'Operands must be numbers.');
  }

  private checkNumberOperand(operator: Token, operand: any) {
    if (typeof operand === 'number') {
      return;
    }
    throw new RuntimeError(operator, 'Operand must be a number.');
  }

  private lookupVariable(name: Token, expr: Expr): any {
    if (this.locals.has(expr)) {
      return this.environment.getAt(this.locals.get(expr)!, name.lexeme);
    }
    return this.globals.get(undefined, name);
  }
}
