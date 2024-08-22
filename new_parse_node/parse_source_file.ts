import ts from "typescript";
import { parseNode, ParseState } from "../new_parse_node";

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    if (ts.canHaveModifiers(node)) {
        return ts.getModifiers(node)?.some((mod) => mod.kind === kind) ?? false;
    }
    return false;
}

export function parseSourceFile(node: ts.SourceFile, props: ParseState): string {
    let fileClassDeclaration: ts.ClassDeclaration | undefined;
    let statementsContents: string[] = [];
    for (let statement of node.statements) {
        let hasDefaultModifier = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
        let hasExportModifier = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
        if (statement.kind === ts.SyntaxKind.ClassDeclaration && hasDefaultModifier && hasExportModifier) {
            fileClassDeclaration = statement as ts.ClassDeclaration;
            continue;
        }
        let content = parseNode(statement, props);
        statementsContents.push(content);
    }

    return "";
}
