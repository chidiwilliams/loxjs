import { Token } from "./token";

export interface Expr {}

export class AssignExpr implements Expr {
  constructor(public name: Token, public value: Expr) {}
}

export class BinaryExpr implements Expr {
  constructor(public left: Expr, public operator: Token, public right: Expr) {}
}

export class CallExpr implements Expr {
  constructor(public callee: Expr, public paren: Token, public args: Expr[]) {}
}

export class FunctionExpr implements Expr {
  constructor(public name: Token | undefined, public params: Token[], public body: Stmt[]) {}
}

export class GetExpr implements Expr {
  constructor(public object: Expr, public name: Token) {}
}

export class GroupingExpr implements Expr {
  constructor(public expression: Expr) {}
}

export class LiteralExpr implements Expr {
  constructor(public value: any) {}
}

export class LogicalExpr implements Expr {
  constructor(public left: Expr, public operator: Token, public right: Expr) {}
}

export class SetExpr implements Expr {
  constructor(public object: Expr, public name: Token, public value: Expr) {}
}

export class SuperExpr implements Expr {
  constructor(public keyword: Token, public method: Token) {}
}

export class ThisExpr implements Expr {
  constructor(public keyword: Token) {}
}

export class TernaryExpr implements Expr {
  constructor(public cond: Expr, public left: Expr, public right: Expr) {}
}

export class UnaryExpr implements Expr {
  constructor(public operator: Token, public right: Expr) {}
}

export class VariableExpr implements Expr {
  constructor(public name: Token) {}
}

export interface Stmt {}

export class BlockStmt implements Stmt {
  constructor(public statements: Stmt[]) {}
}

export class ClassStmt implements Stmt {
  constructor(public name: Token, public superclass: VariableExpr | undefined, public methods: FunctionStmt[]) {}
}

export class ExpressionStmt implements Stmt {
  constructor(public expr: Expr) {}
}

export class FunctionStmt implements Stmt {
  constructor(public name: Token, public params: Token[] | undefined, public body: Stmt[]) {}
}

export class IfStmt implements Stmt {
  constructor(public condition: Expr, public thenBranch: Stmt, public elseBranch: Stmt | undefined) {}
}

export class PrintStmt implements Stmt {
  constructor(public expr: Expr) {}
}

export class ReturnStmt implements Stmt {
  constructor(public keyword: Token, public value: Expr | undefined) {}
}

export class WhileStmt implements Stmt {
  constructor(public condition: Expr, public body: Stmt) {}
}

export class ContinueStmt implements Stmt {
  constructor() {}
}

export class BreakStmt implements Stmt {
  constructor() {}
}

export class VarStmt implements Stmt {
  constructor(public name: Token, public initializer: Expr | undefined) {}
}

