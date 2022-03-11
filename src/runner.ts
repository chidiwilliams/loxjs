import { Interpreter } from './interpreter';
import { Parser } from './parser';
import { Resolver } from './resolver';
import { Scanner } from './scanner';
import { Writer } from './writer';

export class Runner {
  private interpreter: Interpreter;

  constructor(stdOut: Writer, private stdErr: Writer) {
    this.interpreter = new Interpreter(stdOut, stdErr);
  }

  run(source: string): string {
    const scanner = new Scanner(source, this.stdErr);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens, this.stdErr);
    let { statements, hadError } = parser.parse();

    if (hadError) {
      return this.interpreter.stringify(null);
    }

    const resolver = new Resolver(this.interpreter, this.stdErr);
    hadError = resolver.resolveStmts(statements);

    if (hadError) {
      return this.interpreter.stringify(null);
    }

    return this.interpreter.stringify(this.interpreter.interpret(statements));
  }
}
