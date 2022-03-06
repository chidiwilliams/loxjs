import { Interpreter } from './interpreter';
import { Parser } from './parser';
import { Resolver } from './resolver';
import { Scanner } from './scanner';

export interface Writer {
  write: (str: string) => void;
}

export class Runner {
  private interpreter = new Interpreter();

  constructor(private stdOut: Writer, private stdErr: Writer) {}

  run(source: string) {
    const scanner = new Scanner(source, this.stdErr);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens, this.stdErr);
    const { statements, hadError } = parser.parse();

    if (hadError) {
      return;
    }

    const resolver = new Resolver(this.interpreter, this.stdErr);
    resolver.resolveStmts(statements);

    // console.log(statements, hadError);
  }
}
