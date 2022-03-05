import { Writer } from '.';
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
import { Token, TokenType } from './token';

class ParseError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class Parser {
  private hadError = false;
  private current = 0;
  private loop = 0;

  constructor(private tokens: Token[], private stdErr: Writer) {}

  parse(): { statements: Stmt[]; hadError: boolean } {
    const statements: Stmt[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.declaration();
      statements.push(stmt);
    }
    return { statements, hadError: this.hadError };
  }

  private isAtEnd() {
    return this.peek().tokenType == TokenType.Eof;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private declaration(): Stmt {
    if (this.match(TokenType.Class)) {
      return this.classDeclaration();
    }
    if (this.match(TokenType.Fun)) {
      return this.function('function');
    }
    if (this.match(TokenType.Var)) {
      return this.varDeclaration();
    }
    return this.statement();
  }

  private match(...tokenTypes: TokenType[]) {
    for (const tokenType of tokenTypes) {
      if (this.check(tokenType)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  check(tokenType: TokenType) {
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().tokenType == tokenType;
  }

  private advance() {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private previous() {
    return this.tokens[this.current - 1];
  }

  private statement(): Stmt {
    if (this.match(TokenType.Print)) {
      return this.printStatement();
    }
    if (this.match(TokenType.LeftBrace)) {
      const statements = this.block();
      return new BlockStmt(statements);
    }
    if (this.match(TokenType.If)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.While)) {
      this.loop++;
      const statement = this.whileStatement();
      this.loop--;
      return statement;
    }
    if (this.match(TokenType.For)) {
      this.loop++;
      const statement = this.forStatement();
      this.loop--;
      return statement;
    }
    if (this.match(TokenType.Break)) {
      if (this.loop === 0) {
        this.error(this.previous(), 'Break outside loop.');
      }
      this.consume(TokenType.Semicolon, "Expect ';' after break.");
      return new BreakStmt();
    }
    if (this.match(TokenType.Continue)) {
      if (this.loop === 0) {
        this.error(this.previous(), 'Continue outside loop.');
      }
      this.consume(TokenType.Semicolon, "Expect ';' after continue.");
      return new ContinueStmt();
    }
    if (this.match(TokenType.Return)) {
      return this.returnStatement();
    }
    return this.expressionStatement();
  }

  private ifStatement(): Stmt {
    this.consume(TokenType.LeftParen, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RightParen, "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch: Stmt | undefined;
    if (this.match(TokenType.Else)) {
      elseBranch = this.statement();
    }
    return new IfStmt(condition, thenBranch, elseBranch);
  }

  private expressionStatement(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.Semicolon, "Expect ';' after value.");
    return new ExpressionStmt(expr);
  }

  private returnStatement(): Stmt {
    const keyword = this.previous();
    let value: Expr | undefined;
    if (!this.check(TokenType.Semicolon)) {
      value = this.expression();
    }
    this.consume(TokenType.Semicolon, "Expect ';' after return value.");
    return new ReturnStmt(keyword, value);
  }

  private forStatement(): Stmt {
    this.consume(TokenType.LeftParen, "Expect '(' after 'for'.");

    let initializer: Stmt | undefined;
    if (this.match(TokenType.Semicolon)) {
      initializer = undefined;
    } else if (this.match(TokenType.Var)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: Expr | undefined;
    if (!this.check(TokenType.Semicolon)) {
      condition = this.expression();
    }
    this.consume(TokenType.Semicolon, "Expect ';' after loop condition.");

    let increment: Expr | undefined;
    if (!this.check(TokenType.RightParen)) {
      increment = this.expression();
    }
    this.consume(TokenType.RightParen, "Expect ')' after for clauses.");

    let body = this.statement();

    if (increment) {
      body = new BlockStmt([body, new ExpressionStmt(increment)]);
    }

    if (!condition) {
      condition = new LiteralExpr(true);
    }
    body = new WhileStmt(body, condition);

    if (initializer) {
      body = new BlockStmt([initializer, body]);
    }

    return body;
  }

  private whileStatement(): Stmt {
    this.consume(TokenType.LeftParen, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RightParen, "Expect ')' after while condition.");
    const body = this.statement();
    return new WhileStmt(condition, body);
  }

  private varDeclaration() {
    const name = this.consume(TokenType.Identifier, 'Expect variable name.');
    let initializer: Expr | undefined;
    if (this.match(TokenType.Equal)) {
      initializer = this.expression();
    }
    this.consume(TokenType.Semicolon, "Expect ';' after variable declaration.");
    return new VarStmt(name, initializer);
  }

  private function(kind: string) {
    const name = this.consume(TokenType.Identifier, `Expect ${kind} name.`);

    let parameters: Token[] | undefined;

    if (kind !== 'method' || this.check(TokenType.LeftParen)) {
      parameters = [];
      this.consume(TokenType.LeftParen, `Expect '(' after ${kind} name.`);

      if (!this.check(TokenType.RightParen)) {
        do {
          if (parameters.length >= 255) {
            this.error(this.peek(), "Can't have more than 255 parameters.");
          }
          const param = this.consume(TokenType.Identifier, 'Expect parameter name.');
          parameters.push(param);
        } while (this.match(TokenType.Comma));
      }

      this.consume(TokenType.RightParen, "Expect ')' after parameters.");
    }

    this.consume(TokenType.LeftBrace, `Expect '{' before ${kind} body.`);

    const body = this.block();
    return new FunctionStmt(name, parameters, body);
  }

  private classDeclaration(): Stmt {
    const name = this.consume(TokenType.Identifier, 'Expect class name.');

    let superclass: VariableExpr | undefined;
    if (this.match(TokenType.Less)) {
      this.consume(TokenType.Identifier, 'Expect superclass name.');
      superclass = new VariableExpr(this.previous());
    }

    this.consume(TokenType.LeftBrace, "Expect '{' before class body.");

    const methods: FunctionStmt[] = [];
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const func = this.function('method');
      methods.push(func);
    }

    this.consume(TokenType.RightBrace, "Expect '}' after class body.");
    return new ClassStmt(name, superclass, methods);
  }

  private consume(tokenType: TokenType, message: string): Token {
    if (this.check(tokenType)) {
      return this.advance();
    }
    this.error(this.peek(), message);
  }

  private error(token: Token, message: string): never {
    const where = token.tokenType === TokenType.Eof ? ' at end' : ` at '${token.lexeme}'`;
    throw new ParseError(`[line ${token.line}] Error${where}: ${message}`);
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const stmt = this.declaration();
      statements.push(stmt);
    }
    this.consume(TokenType.RightBrace, "Expect '}' after block.");
    return statements;
  }

  private expression(): Expr {
    return this.series();
  }

  private series(): Expr {
    let expr = this.assignment();

    while (this.match(TokenType.Comma)) {
      const operator = this.previous();
      const right = this.assignment();
      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  private assignment(): Expr {
    const expr = this.ternary();

    if (this.match(TokenType.Equal)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof VariableExpr) {
        return new AssignExpr(expr.name, value);
      }
      if (expr instanceof GetExpr) {
        return new SetExpr(expr.object, expr.name, value);
      }
      this.error(equals, 'Invalid assignment target.');
    }
    return expr;
  }

  private ternary(): Expr {
    let expr = this.or();
    if (this.match(TokenType.QuestionMark)) {
      const left = this.ternary();
      this.consume(TokenType.Colon, "Expect ':' after conditional.");
      const right = this.ternary();
      expr = new TernaryExpr(expr, left, right);
    }
    return expr;
  }

  private or(): Expr {
    let expr = this.and();
    while (this.match(TokenType.Or)) {
      const operator = this.previous();
      const right = this.and();
      expr = new LogicalExpr(expr, operator, right);
    }
    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.match(TokenType.And)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new LogicalExpr(expr, operator, right);
    }
    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();
    while (this.match(TokenType.BangEqual, TokenType.EqualEqual)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();
    while (
      this.match(TokenType.Greater, TokenType.GreaterEqual, TokenType.Less, TokenType.LessEqual)
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private term(): Expr {
    let expr = this.factor();
    while (this.match(TokenType.Minus, TokenType.Plus)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();
    while (this.match(TokenType.Slash, TokenType.Star)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.Bang, TokenType.Minus)) {
      const operator = this.previous();
      const right = this.unary();
      return new UnaryExpr(operator, right);
    }
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LeftParen)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.Dot)) {
        const name = this.consume(TokenType.Identifier, "Expect property name after '.'.");
        expr = new GetExpr(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expr): Expr {
    const args: Expr[] = [];
    if (!this.check(TokenType.RightParen)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments.");
        }
        const expr = this.assignment(); // didn't use this.expression() because an expression can be a series
        args.push(expr);
      } while (this.match(TokenType.Comma));
    }
    const paren = this.consume(TokenType.RightParen, "Expect ')' after arguments.");
    return new CallExpr(callee, paren, args);
  }

  private primary(): Expr {
    switch (true) {
      case this.match(TokenType.False):
        return new LiteralExpr(false);
      case this.match(TokenType.True):
        return new LiteralExpr(true);
      case this.match(TokenType.Nil):
        return new LiteralExpr(null);
      case this.match(TokenType.Number, TokenType.String):
        return new LiteralExpr(this.previous().literal);
      case this.match(TokenType.LeftParen):
        const expr = this.expression();
        this.consume(TokenType.RightParen, "Expect ')' after expression.");
        return new GroupingExpr(expr);
      case this.match(TokenType.Identifier):
        return new VariableExpr(this.previous());
      case this.match(TokenType.Fun):
        return this.functionExpression();
      case this.match(TokenType.This):
        return new ThisExpr(this.previous());
      case this.match(TokenType.Super):
        const keyword = this.previous();
        this.consume(TokenType.Dot, "Expect '.' after 'super'.");
        const method = this.consume(TokenType.Identifier, 'Expect superclass method name.');
        return new SuperExpr(keyword, method);
      default:
        this.error(this.peek(), 'Expect expression.');
    }
  }

  private functionExpression(): Expr {
    let name: Token | undefined;
    if (!this.check(TokenType.LeftParen)) {
      name = this.consume(TokenType.Identifier, 'Expect function name.');
    }

    this.consume(TokenType.LeftParen, "Expect '(' after function name.");

    let parameters: Token[] = [];
    if (!this.check(TokenType.RightParen)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }
        const param = this.consume(TokenType.Identifier, 'Expect parameter name.');
        parameters.push(param);
      } while (this.match(TokenType.Comma));
    }

    this.consume(TokenType.RightParen, "Expect ')' after parameters.");
    this.consume(TokenType.LeftBrace, `Expect '{' before function body.`);

    const body = this.block();
    return new FunctionExpr(name, parameters, body);
  }

  private printStatement(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.Semicolon, "Expect ';' after value");
    return new PrintStmt(expr);
  }
}
