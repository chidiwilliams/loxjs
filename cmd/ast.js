const fs = require('fs');

const definitions = [
  {
    name: 'Expr',
    types: [
      'Assign   : Name Token, Value Expr',
      'Binary   : Left Expr, Operator Token, Right Expr',
      'Call     : Callee Expr, Paren Token, args Expr[]',
      'Function : Name Token?, Params Token[], Body Stmt[]',
      'Get      : Object Expr, Name Token',
      'Grouping : Expression Expr',
      'Literal  : Value any',
      'Logical  : Left Expr, Operator Token, Right Expr',
      'Set      : Object Expr, Name Token, Value Expr',
      'Super    : Keyword Token, Method Token',
      'This     : Keyword Token',
      'Ternary  : Cond Expr, Left Expr, Right Expr',
      'Unary    : Operator Token, Right Expr',
      'Variable : Name Token',
    ],
  },
  {
    name: 'Stmt',
    types: [
      'Block      : Statements Stmt[]',
      'Class      : Name Token, Superclass VariableExpr?, Methods FunctionStmt[]',
      'Expression : Expr Expr',
      'Function   : Name Token, Params Token[]?, Body Stmt[]',
      'If         : Condition Expr, ThenBranch Stmt, ElseBranch Stmt?',
      'Print      : Expr Expr',
      'Return     : Keyword Token, Value Expr?',
      'While      : Condition Expr, Body Stmt',
      'Continue   : ',
      'Break      : ',
      'Var        : Name Token, Initializer Expr?',
    ],
  },
];

writeAst(definitions);

function writeAst(definitions) {
  const ast = defineAst(definitions);
  fs.writeFileSync(`src/ast.ts`, ast, { encoding: 'utf-8' });
}

function defineAst(definitions) {
  let str = '';
  str += `import { Token } from "./token";\n\n`;

  definitions.forEach((definition) => {
    str += `export interface ${definition.name} {}\n\n`;
    definition.types.forEach((type) => {
      const [typeName, fields] = type.split(':');
      const fieldArguments = fields
        .trim()
        .split(',')
        .map((field) => field.trim().split(' '))
        .map(([fieldName, fieldValue]) =>
          fieldName[0]
            ? [
                [
                  fieldName[0].toLowerCase() + fieldName.slice(1),
                  fieldValue.endsWith('?')
                    ? `${fieldValue.slice(0, fieldValue.length - 1)} | undefined`
                    : fieldValue,
                ],
              ]
            : [],
        )
        .flat() // remove empty fields string
        .map(([fieldName, fieldValue]) => `public ${fieldName}: ${fieldValue}`)
        .join(', ');
      const className = `${typeName.trim()}${definition.name}`;
      str += `export class ${className} implements ${definition.name} {
  constructor(${fieldArguments}) {}
}\n\n`;
    });
  });

  return str;
}
