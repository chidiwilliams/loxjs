export enum TokenType {
  LeftParen = 'TokenLeftParen',
  RightParen = 'TokenRightParen',
  LeftBrace = 'TokenLeftBrace',
  RightBrace = 'TokenRightBrace',
  Comma = 'TokenComma',
  Dot = 'TokenDot',
  Minus = 'TokenMinus',
  Plus = 'TokenPlus',
  Semicolon = 'TokenSemicolon',
  Slash = 'TokenSlash',
  Star = 'TokenStar',
  Colon = 'TokenColon',
  QuestionMark = 'TokenQuestionMark',
  Bang = 'TokenBang',
  BangEqual = 'TokenBangEqual',
  Equal = 'TokenEqual',
  EqualEqual = 'TokenEqualEqual',
  Greater = 'TokenGreater',
  GreaterEqual = 'TokenGreaterEqual',
  Less = 'TokenLess',
  LessEqual = 'TokenLessEqual',
  Identifier = 'TokenIdentifier',
  String = 'TokenString',
  Number = 'TokenNumber',
  And = 'TokenAnd',
  Class = 'TokenClass',
  Else = 'TokenElse',
  False = 'TokenFalse',
  Fun = 'TokenFun',
  For = 'TokenFor',
  If = 'TokenIf',
  Nil = 'TokenNil',
  Or = 'TokenOr',
  Print = 'TokenPrint',
  Return = 'TokenReturn',
  Super = 'TokenSuper',
  This = 'TokenThis',
  True = 'TokenTrue',
  Var = 'TokenVar',
  While = 'TokenWhile',
  Break = 'TokenBreak',
  Continue = 'TokenContinue',
  Eof = 'TokenEof',
}

export class Token {
  constructor(
    public tokenType: TokenType,
    public lexeme: string,
    public literal: any,
    public line: number,
    public start: number,
  ) {}
}