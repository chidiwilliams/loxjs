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
import { Interpreter } from './interpreter';
import { Scope } from './scope';
import { Stack } from './stack';
import { Token, TokenType } from './token';
import { Writer } from './writer';

enum FunctionType {
  None = 'None',
  Function = 'Function',
  Method = 'Method',
  Initializer = 'Initializer',
}

enum ClassType {
  None = 'None',
  Class = 'Class',
  Subclass = 'Subclass',
}

export class Resolver {
  private scopes = new Stack<Scope>();
  private currentFunction: FunctionType = FunctionType.None;
  private currentClass: ClassType = ClassType.None;
  private hadError = false;

  constructor(private interpreter: Interpreter, private stdErr: Writer) {}

  resolveStmts(statements: Stmt[]) {
    statements.forEach((statement) => {
      this.resolveStmt(statement);
    });
    return this.hadError;
  }

  private resolveStmt(stmt: Stmt) {
    if (stmt instanceof PrintStmt) {
      this.resolveExpr(stmt.expr);
      return;
    }
    if (stmt instanceof VarStmt) {
      this.declare(stmt.name);
      if (stmt.initializer) {
        this.resolveExpr(stmt.initializer);
      }
      this.define(stmt.name);
      return;
    }
    if (stmt instanceof BlockStmt) {
      this.beginScope();
      this.resolveStmts(stmt.statements);
      this.endScope();
      return;
    }
    if (stmt instanceof ExpressionStmt) {
      this.resolveExpr(stmt.expr);
      return;
    }
    if (stmt instanceof WhileStmt) {
      this.resolveExpr(stmt.condition);
      this.resolveStmt(stmt.body);
      return;
    }
    if (stmt instanceof IfStmt) {
      this.resolveExpr(stmt.condition);
      this.resolveStmt(stmt.thenBranch);
      if (stmt.elseBranch) {
        this.resolveStmt(stmt.elseBranch);
      }
      return;
    }
    if (stmt instanceof BreakStmt || stmt instanceof ContinueStmt) {
      return;
    }
    if (stmt instanceof FunctionStmt) {
      this.declare(stmt.name);
      this.define(stmt.name);
      this.resolveFunction(stmt, FunctionType.Function);
      return;
    }
    if (stmt instanceof ReturnStmt) {
      if (this.currentFunction === FunctionType.None) {
        this.error(stmt.keyword, "Can't return from top-level code.");
      }
      if (stmt.value) {
        this.resolveExpr(stmt.value);
      }
      return;
    }
    if (stmt instanceof ClassStmt) {
      const enclosingClass = this.currentClass;

      this.currentClass = ClassType.Class;

      this.declare(stmt.name);
      this.define(stmt.name);

      if (stmt.superclass && stmt.name.lexeme === stmt.superclass.name.lexeme) {
        this.error(stmt.superclass.name, "A class can't inherit from itself.");
      }

      if (stmt.superclass) {
        this.currentClass = ClassType.Subclass;
        this.resolveExpr(stmt.superclass);
      }

      if (stmt.superclass) {
        this.beginScope();
        this.scopes.peek().set('super');
      }

      this.beginScope();
      this.scopes.peek().set('this');

      stmt.methods.forEach((method) => {
        const declaration =
          method.name.lexeme === 'init' ? FunctionType.Initializer : FunctionType.Method;
        this.resolveFunction(method, declaration);
      });

      this.endScope();

      if (stmt.superclass) {
        this.endScope();
      }

      this.currentClass = enclosingClass;
      return;
    }

    throw `Can't resolve ${stmt.constructor.name}`;
  }

  private resolveFunction(fn: FunctionStmt, functionType: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = functionType;

    this.beginScope();
    fn.params?.forEach((param) => {
      this.declare(param);
      this.define(param);
    });
    this.resolveStmts(fn.body);
    this.endScope();

    this.currentFunction = enclosingFunction;
  }

  private resolveExpr(expr: Expr) {
    if (expr instanceof LiteralExpr) {
      return;
    }
    if (expr instanceof LogicalExpr) {
      this.resolveExpr(expr.left);
      this.resolveExpr(expr.right);
      return;
    }
    if (expr instanceof BinaryExpr) {
      this.resolveExpr(expr.left);
      this.resolveExpr(expr.right);
      return;
    }
    if (expr instanceof GroupingExpr) {
      this.resolveExpr(expr.expression);
      return;
    }
    if (expr instanceof SetExpr) {
      this.resolveExpr(expr.value);
      this.resolveExpr(expr.object);
      return;
    }
    if (expr instanceof TernaryExpr) {
      this.resolveExpr(expr.cond);
      this.resolveExpr(expr.left);
      this.resolveExpr(expr.right);
      return;
    }
    if (expr instanceof UnaryExpr) {
      this.resolveExpr(expr.right);
      return;
    }
    if (expr instanceof VariableExpr) {
      if (this.scopes.length() > 0) {
        const { declared, defined } = this.scopes.peek().has(expr.name.lexeme);
        if (declared && !defined) {
          this.error(expr.name, "Can't read local variable in its own initializer.");
        }
      }

      this.resolveLocal(expr, expr.name);
      return;
    }
    if (expr instanceof AssignExpr) {
      this.resolveExpr(expr.value);
      this.resolveLocal(expr, expr.name);
      return;
    }
    if (expr instanceof FunctionExpr) {
      const enclosingFunction = this.currentFunction;
      this.currentFunction = FunctionType.Function;

      this.beginScope();
      if (expr.name) {
        this.declare(expr.name);
        this.define(expr.name);
      }

      this.beginScope();
      expr.params?.forEach((param) => {
        this.declare(param);
        this.define(param);
      });
      this.resolveStmts(expr.body);
      this.endScope();
      this.endScope();

      this.currentFunction = enclosingFunction;
      return;
    }
    if (expr instanceof CallExpr) {
      this.resolveExpr(expr.callee);
      expr.args.forEach((arg) => {
        this.resolveExpr(arg);
      });
      return;
    }
    if (expr instanceof SuperExpr) {
      if (this.currentClass === ClassType.None) {
        this.error(expr.keyword, "Can't use 'super' outside of a class.");
      } else if (this.currentClass !== ClassType.Subclass) {
        this.error(expr.keyword, "Can't use 'super' in a class with no superclass.");
      }
      this.resolveLocal(expr, expr.keyword);
      return;
    }
    if (expr instanceof GetExpr) {
      this.resolveExpr(expr.object);
      return;
    }
    if (expr instanceof ThisExpr) {
      if (this.currentClass === ClassType.None) {
        this.error(expr.keyword, "Can't use 'this' outside of a class.");
      }
      this.resolveLocal(expr, expr.keyword);
      return;
    }

    throw `Can't resolve ${expr.constructor.name}`;
  }

  private declare(name: Token) {
    if (this.scopes.length() === 0) {
      return;
    }
    const scope = this.scopes.peek();
    const { defined } = scope.has(name.lexeme);
    if (defined) {
      this.error(name, 'Already a variable with this name in this scope');
    }
    scope.declare(name.lexeme, name);
  }

  private define(name: Token) {
    if (this.scopes.length() === 0) {
      return;
    }
    this.scopes.peek().define(name.lexeme);
  }

  private error(token: Token, message: string) {
    const where = token.tokenType === TokenType.Eof ? ' at end' : ` at '${token.lexeme}'`;
    this.stdErr.writeLn(`[line ${token.line}] Error${where}: ${message}`);
    this.hadError = true;
  }

  private beginScope() {
    this.scopes.push(new Scope());
  }

  private endScope() {
    const scope = this.scopes.peek();
    for (const [name, value] of scope.entries()) {
      if (!value.used) {
        this.error(value.token!, `Variable '${name}' declared but not used.`);
      }
    }
    this.scopes.pop();
  }

  private resolveLocal(expr: Expr, name: Token) {
    for (let i = this.scopes.length() - 1; i >= 0; i--) {
      const scope = this.scopes.get(i);
      const { defined } = scope.has(name.lexeme);
      if (defined) {
        const depth = this.scopes.length() - 1 - i;
        this.interpreter.resolve(expr, depth);
        scope.use(name.lexeme);
        return;
      }
    }
  }
}
