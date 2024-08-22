import ts, { SyntaxKind } from "typescript";
import { ParseNodeType } from "./parse_node";
import { parseSourceFile } from "./new_parse_node/parse_source_file";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ParseState = {};

export function parseNode(genericNode: ts.Node, props: ParseState): string {
    switch (genericNode.kind) {
        case SyntaxKind.SourceFile:
            return parseSourceFile(genericNode as ts.SourceFile, props);
        default:
            return "";
    }
}
