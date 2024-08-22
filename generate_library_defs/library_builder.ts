import fs from "fs";
import path from "path";

import { parseStringPromise } from "xml2js";

import { Paths } from "../project";
import { copyFolderRecursiveSync } from "../ts_utils";

import writeBaseDefinitions from "./generate_bases";
import {
    generateGdscriptLib,
    GodotXMLMethod,
    parseMethod,
} from "./generate_gdscript_lib";
import {
    formatJsDoc,
    godotTypeToTsType,
    sanitizeGodotNameForTs,
} from "./generation_utils";

const GLOBAL_SCOPE_DECLARES =
    "generate_library_defs/custom_defs/global_score_declares.d.ts";

export class LibraryBuilder {
    constructor(private paths: Paths) {
        fs.mkdirSync(this.paths.staticGodotDefsPath, { recursive: true });
        fs.mkdirSync(this.paths.dynamicGodotDefsPath, { recursive: true });
    }

    async buildProject() {
        await this.writeLibraryDefinitions();
        writeBaseDefinitions(this.paths);
    }

    async parseGlobalScope(
        path: string,
    ): Promise<{ result: string; singletons: string[] }> {
        const singletons: string[] = [];
        const content = fs.readFileSync(path, "utf-8");
        const json = await parseStringPromise(content);
        // TODO - need implement
        const methods = json.class.methods[0].method ?? [];
        const properties = (json.class.members ?? [])[0]?.member ?? [];
        const constants = (json.class.constants ?? [])[0]?.constant ?? [];
        const enums: { [key: string]: any } = {};

        for (const c of constants) {
            const doc = c["_"];
            const enumName = c["$"].enum;

            if (enumName) {
                enums[enumName] = [
                    ...(enums[enumName] || []),
                    { ...c["$"], doc: c["_"] },
                ];
            }
        }

        const customDeclare = fs.readFileSync(GLOBAL_SCOPE_DECLARES, "utf-8");

        const propertyDeclarations = properties
            .map((property: any) => {
                const name = sanitizeGodotNameForTs(
                    property["$"].name,
                    "property",
                );
                let commentOut =
                    name === "VisualScriptEditor" ||
                    name === "GodotSharp" ||
                    name === "NavigationMeshGenerator";
                singletons.push(name);

                if (!property["_"]) {
                    return "";
                }

                let declaration = "";
                declaration += formatJsDoc(property["_"].trim()) + "\n";
                if (commentOut) {
                    declaration += "//";
                }
                let _type = godotTypeToTsType(property["$"].type) + "Class;";
                declaration += `declare const ${name}: ${_type}`;
                return declaration;
            })
            .join("\n");

        const enumDeclarations = Object.keys(enums)
            .map((key) => {
                const enumItemsArray = enums[key].map((enumItem: any) => {
                    const docs = `${formatJsDoc(enumItem.doc)}\n`;
                    const enumItemValue = /^-?\d+$/.test(enumItem.value)
                        ? enumItem.value
                        : `"${enumItem.value}"`;
                    return `${docs}\n${enumItem.name} = ${enumItemValue}`;
                });

                const enumItems = enumItemsArray.join(",\n");

                let name = sanitizeGodotNameForTs(key, "argument");
                return `declare enum ${name} {\n${enumItems}\n}`;
            })
            .join("\n");

        const result = `${customDeclare} \n${propertyDeclarations} \n${enumDeclarations}`;

        return { result, singletons };
    }

    async parseFile(path: string, singletons: string[]) {
        const content = fs
            .readFileSync(path, "utf-8")
            .replaceAll("<constructor ", "<_constructor ")
            .replaceAll("</constructor>", "</_constructor>");
        const json = await parseStringPromise(content);

        const methodsXml: GodotXMLMethod[] =
            json.class.methods?.[0].method ?? [];

        const members = (json.class.members ?? [])[0]?.member ?? [];
        let className: string = json.class["$"].name;
        const inherits = json.class["$"].inherits;
        const constants = (json.class.constants ?? [])[0]?.constant ?? [];
        const signals = (json.class.signals ?? [])[0]?.signal ?? [];
        const methods = methodsXml.map((method) => parseMethod(method));
        const constructorsXml: GodotXMLMethod[] =
            json.class.constructors?.[0]._constructor ?? [];
        const constructorInfo = constructorsXml.map((method) =>
            parseMethod(method),
        );

        // This is true for classes that can be constructed without a new keyword, e.g. const myVector = Vector2();
        let isSpecialConstructorClass =
            className === "Vector2" ||
            className === "Vector3" ||
            className === "Vector2i" ||
            className === "Vector3i" ||
            className === "Rect2" ||
            className === "Color";

        let arrayAccessType = null;

        if (className === "PoolByteArray") arrayAccessType = "number";
        if (className === "PoolColorArray") arrayAccessType = "Color";
        if (className === "PoolIntArray") arrayAccessType = "number";
        if (className === "PoolRealArray") arrayAccessType = "number";
        if (className === "PoolStringArray") arrayAccessType = "string";
        if (className === "PoolVector2Array") arrayAccessType = "Vector2";
        if (className === "PoolVector3Array") arrayAccessType = "Vector3";

        if (className === "Signal") {
            className = "Signal<T extends (...args: any[]): any>";
        }

        if (singletons.includes(className)) {
            className += "Class";
        }

        const constructors = (() => {
            if (className.toLowerCase() === "signal<t>") {
                return "";
            }

            let typeAnnotation = `: ${className}`;
            let constructors = "";

            const addConstructors = (info: any[], prefix: string = "new") => {
                return info
                    .map(
                        (inf) =>
                            `  ${prefix}(${inf.argumentList})${typeAnnotation};`,
                    )
                    .join("\n");
            };

            if (constructorInfo.length === 0) {
                constructors += `  new()${typeAnnotation}; \n`;
            } else {
                constructors += `\n${addConstructors(constructorInfo)}\n`;
            }

            if (isSpecialConstructorClass) {
                constructors += `\n${addConstructors(constructorInfo, "")}\n`;
            }

            if (!isSpecialConstructorClass) {
                constructors += `  static "new"()${typeAnnotation} \n`;
            }

            return constructors;
        })();

        const classDeclaration = isSpecialConstructorClass
            ? `declare class ${className}Constructor {`
            : `declare class ${className}${inherits ? ` extends ${inherits} ` : ""} {`;

        const arrayAccess = arrayAccessType
            ? `[n: number]: ${arrayAccessType};`
            : "";

        const memberDeclarations = members
            .map((property: any) => {
                const propertyName = sanitizeGodotNameForTs(
                    property["$"].name,
                    "property",
                );
                if (!property["_"]) return "";
                if (propertyName === "rotate" && className === "PathFollow2D")
                    return "";
                let doc = formatJsDoc(property["_"].trim());
                return `${doc}\n${propertyName}: ${godotTypeToTsType(property["$"].type)};`;
            })
            .join("\n");

        const methodDeclarations = methods
            .map((method) => method.codegen)
            .join("\n\n");

        let isOverloadClass = [
            "Vector2",
            "Vector2i",
            "Vector3",
            "Vector3i",
        ].includes(className);
        const operatorOverloads = isOverloadClass
            ? `
add(other: number | ${className}): ${className};
sub(other: number | ${className}): ${className};
mul(other: number | ${className}): ${className};
div(other: number | ${className}): ${className};`
            : "";

        const constantDeclarations = constants
            .map((c: any) => {
                const value: string = c["$"].value.trim();
                const match = /([A-Z][a-zA-Z0-9]*)\(.*\)/.exec(value);
                const type = godotTypeToTsType(match?.[1] ?? "any");
                return `${formatJsDoc(c["_"] || "")}\nstatic ${c["$"].name}: ${type};\n`;
            })
            .join("\n");

        const signalDeclarations = signals
            .map((signal: any) => {
                return `${formatJsDoc(signal.description[0])}\n$${signal["$"].name}: Signal<(${(
                    signal.argument || []
                )
                    .map(
                        (arg: any) =>
                            `${arg["$"].name}: ${godotTypeToTsType(arg["$"].type)}`,
                    )
                    .join(", ")}) => void>\n`;
            })
            .join("\n");

        const specialConstructorType = isSpecialConstructorClass
            ? `declare type ${className} = ${className}Constructor;
declare var ${className}: typeof ${className}Constructor & { ${constructors} }`
            : "";

        return `
${formatJsDoc(json.class.description[0])}
${classDeclaration}
${arrayAccess}
${formatJsDoc(json.class.description[0])}
${isSpecialConstructorClass ? "" : constructors}
${memberDeclarations}
${methodDeclarations}
connect<T extends SignalsOf<${className}>>(signal: T, method: SignalFunction<${className}[T]>): number;
${operatorOverloads}
${constantDeclarations}
${signalDeclarations}
}
${specialConstructorType}
`;
    }

    async writeLibraryDefinitions() {
        if (
            !fs.existsSync(this.paths.csgClassesPath) ||
            !fs.existsSync(this.paths.normalClassesPath)
        ) {
            console.info(
                "No Godot source installation found, writing from backup...",
            );

            let localGodotDefs = path.join(
                __dirname,
                "..",
                "..",
                "_godot_defs",
            );

            copyFolderRecursiveSync(localGodotDefs, this.paths.rootPath);

            console.info("Done.");

            return;
        }

        // This must come first because it parses out singletons
        // TODO - clean that up.
        const { result: globalScope, singletons } = await this.parseGlobalScope(
            path.join(this.paths.normalClassesPath, "@GlobalScope.xml"),
        );

        fs.writeFileSync(
            path.join(this.paths.staticGodotDefsPath, "@globals.d.ts"),
            globalScope,
        );

        const globalFunctions = await generateGdscriptLib(
            path.join(this.paths.gdscriptPath, "@GDScript.xml"),
        );

        fs.writeFileSync(
            path.join(this.paths.staticGodotDefsPath, "@global_functions.d.ts"),
            globalFunctions,
        );

        const xmlPaths = [
            this.paths.csgClassesPath,
            this.paths.websocketClassesPath,
            this.paths.normalClassesPath,
        ]
            .flatMap((dir) => fs.readdirSync(dir).map((p) => path.join(dir, p)))
            .filter((file) => file.endsWith(".xml"));

        for (let fullPath of xmlPaths) {
            const fileName = path.basename(fullPath);

            if (fileName === "@GlobalScope.xml") {
                continue;
            }

            if (fileName === "Array.xml") {
                continue;
            }

            if (fileName === "bool.xml") {
                continue;
            }

            if (fileName === "Dictionary.xml") {
                continue;
            }

            if (fileName === "int.xml") {
                continue;
            }

            if (fileName === "float.xml") {
                continue;
            }

            if (fileName === "PackedScene.xml") {
                continue;
            }

            if (fileName === "Signal.xml") {
                continue;
            }

            const result = await this.parseFile(fullPath, singletons);

            fs.writeFileSync(
                path.join(
                    this.paths.staticGodotDefsPath,
                    fileName.slice(0, -4) + ".d.ts",
                ),
                result,
            );
        }
    }
}

export default LibraryBuilder;
