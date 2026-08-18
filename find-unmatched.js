const fs = require("fs");
const ts = require("typescript");

const file = "scripts/enrich-d1-rosters-dom.ts";
const text = fs.readFileSync(file, "utf8");

const scanner = ts.createScanner(
  ts.ScriptTarget.Latest,
  false,
  ts.LanguageVariant.Standard,
  text
);

const pairs = {
  [ts.SyntaxKind.OpenBraceToken]: ts.SyntaxKind.CloseBraceToken,
  [ts.SyntaxKind.OpenParenToken]: ts.SyntaxKind.CloseParenToken,
  [ts.SyntaxKind.OpenBracketToken]: ts.SyntaxKind.CloseBracketToken,
};

const closing = {
  [ts.SyntaxKind.CloseBraceToken]: ts.SyntaxKind.OpenBraceToken,
  [ts.SyntaxKind.CloseParenToken]: ts.SyntaxKind.OpenParenToken,
  [ts.SyntaxKind.CloseBracketToken]: ts.SyntaxKind.OpenBracketToken,
};

const stack = [];

let token;

while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTokenPos();

  if (pairs[token]) {
    stack.push({
      token,
      pos,
    });
    continue;
  }

  if (closing[token]) {
    const expected = closing[token];
    const top = stack[stack.length - 1];

    if (top && top.token === expected) {
      stack.pop();
    }
  }
}

console.log("Unmatched opening delimiters:", stack.length);

for (const item of stack.slice(-20)) {
  const lc = ts.getLineAndCharacterOfPosition(
    ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true
    ),
    item.pos
  );

  console.log(
    `${ts.tokenToString(item.token)} at line ${lc.line + 1}, column ${lc.character + 1}`
  );
}
