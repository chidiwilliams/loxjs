import { Token, TokenType } from './token';
import { Writer } from './writer';

export class Scanner {
  private static keywords: Record<string, TokenType> = {
    and: TokenType.And,
    class: TokenType.Class,
    else: TokenType.Else,
    false: TokenType.False,
    for: TokenType.For,
    fun: TokenType.Fun,
    if: TokenType.If,
    nil: TokenType.Nil,
    or: TokenType.Or,
    print: TokenType.Print,
    return: TokenType.Return,
    super: TokenType.Super,
    this: TokenType.This,
    true: TokenType.True,
    var: TokenType.Var,
    while: TokenType.While,
    break: TokenType.Break,
    continue: TokenType.Continue,
  };

  private start = 0;
  private current = 0;
  private line = 0;
  private tokens: Token[] = [];

  constructor(private source: string, private stdErr: Writer) {}

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.Eof, '', null, this.line, 0));
    return this.tokens;
  }

  private scanToken() {
    const char = this.advance();
    switch (char) {
      case '(':
        this.addToken(TokenType.LeftParen);
        break;
      case ')':
        this.addToken(TokenType.RightParen);
        break;
      case '{':
        this.addToken(TokenType.LeftBrace);
        break;
      case '}':
        this.addToken(TokenType.RightBrace);
        break;
      case ',':
        this.addToken(TokenType.Comma);
        break;
      case '.':
        this.addToken(TokenType.Dot);
        break;
      case '-':
        this.addToken(TokenType.Minus);
        break;
      case '+':
        this.addToken(TokenType.Plus);
        break;
      case ';':
        this.addToken(TokenType.Semicolon);
        break;
      case ':':
        this.addToken(TokenType.Colon);
        break;
      case '*':
        this.addToken(TokenType.Star);
        break;
      case '?':
        this.addToken(TokenType.QuestionMark);
        break;

      case '!': {
        const nextToken = this.match('=') ? TokenType.BangEqual : TokenType.Bang;
        this.addToken(nextToken);
        break;
      }
      case '=': {
        const nextToken = this.match('=') ? TokenType.EqualEqual : TokenType.Equal;
        this.addToken(nextToken);
        break;
      }
      case '<': {
        const nextToken = this.match('=') ? TokenType.LessEqual : TokenType.Less;
        this.addToken(nextToken);
        break;
      }
      case '>': {
        const nextToken = this.match('=') ? TokenType.GreaterEqual : TokenType.Greater;
        this.addToken(nextToken);
        break;
      }
      case '/': {
        if (this.match('/')) {
          // comment
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken(TokenType.Slash);
        }
        break;
      }

      case ' ':
      case '\r':
      case '\t':
        break;

      case '\n':
        this.line++;
        break;

      case '"':
        this.string();
        break;

      default:
        if (this.isDigit(char)) {
          this.number();
        } else if (this.isAlpha(char)) {
          this.identifier();
        } else {
          this.error('Unexpected character.');
        }
        break;
    }
  }

  private advance() {
    const current = this.source[this.current];
    this.current++;
    return current;
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private addToken(tokenType: TokenType): void {
    this.addTokenWithLiteral(tokenType, null);
  }

  private addTokenWithLiteral(tokenType: TokenType, literal: any): void {
    const text = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(tokenType, text, literal, this.line, this.start));
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.current] !== expected) {
      return false;
    }

    this.current++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return '\\000';
    }
    return this.source[this.current];
  }

  private string() {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      this.error('Unterminated string.');
      return;
    }

    this.advance(); // closing "

    const value = this.source.slice(this.start + 1, this.current - 1);
    this.addTokenWithLiteral(TokenType.String, value);
  }

  private error(message: string) {
    this.stdErr.writeLn(`[line ${this.line}] Error: ${message}`);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char == '_';
  }

  private number() {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // look for fractional part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = parseFloat(this.source.slice(this.start, this.current));
    this.addTokenWithLiteral(TokenType.Number, value);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) {
      return '\\000';
    }
    return this.source[this.current + 1];
  }

  private identifier() {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.slice(this.start, this.current);
    let tokenType = Scanner.keywords[text] || TokenType.Identifier;
    this.addToken(tokenType);
  }

  private isAlphaNumeric(char: string) {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
