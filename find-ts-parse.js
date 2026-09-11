const fs = require("fs");
const ts = require("typescript");

const file = "scripts/enrich-d1-rosters-dom.ts";
const text = fs.readFileSync(file, "utf8");

const source = ts.createSourceFile(
  file,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS
);

function line(pos) {
  return source.getLineAndCharacterOfPosition(pos).line + 1;
}

console.log("Parse diagnostics:");
for (const d of source.parseDiagnostics) {
  console.log(
    `line ${line(d.start || 0)}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`
  );
}

console.log("\nTop-level statements near end:");

for (const stmt of source.statements.slice(-20)) {
  console.log(
    `${ts.SyntaxKind[stmt.kind]}: lines ${line(stmt.pos)}-${line(stmt.end)}`
  );
}
