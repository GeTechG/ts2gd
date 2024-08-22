import fs from "fs";
import path from "path";

import { Paths } from "../project";

export default function writeBaseDefinitions(paths: Paths) {
    let arrayFileContent = fs.readFileSync(
        "generate_library_defs/custom_defs/array_def.d.ts",
        "utf-8",
    );
    let dictionaryFileContent = fs.readFileSync(
        "generate_library_defs/custom_defs/dictionary_def.d.ts",
        "utf-8",
    );
    let packedFileContent = fs.readFileSync(
        "generate_library_defs/custom_defs/packed_scene_def.d.ts",
        "utf-8",
    );
    let baseFileContent = fs
        .readFileSync(
            "generate_library_defs/custom_defs/base_def.d.ts",
            "utf-8",
        )
        .replace("${ArrayDefinition}", arrayFileContent)
        .replace("${DictionaryDefinition}", dictionaryFileContent)
        .replace("${PackedSceneDef}", packedFileContent);
    fs.writeFileSync(
        path.join(paths.staticGodotDefsPath, "@base.d.ts"),
        baseFileContent,
    );
}

export function baseContentForTests() {
    let baseFileContent = fs.readFileSync(
        "generate_library_defs/custom_defs/base_def.d.ts",
        "utf-8",
    );
    return `
${fs.readFileSync(
    path.join(process.cwd(), "_godot_defs", "static", "Vector2.d.ts"),
)}
${fs.readFileSync(
    path.join(process.cwd(), "_godot_defs", "static", "Vector3.d.ts"),
)}
${baseFileContent}
`;
}
