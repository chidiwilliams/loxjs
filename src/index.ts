import { Parser } from './parser';
import { Scanner } from './scanner';

export interface Writer {
  write: (str: string) => void;
}

export class Runner {
  constructor(private stdOut: Writer, private stdErr: Writer) {}

  run(source: string) {
    const scanner = new Scanner(source, this.stdErr);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens, this.stdErr);
    const { statements, hadError } = parser.parse();

    // console.log(statements, hadError);
  }
}
