import fs from "fs";

import { parseStringPromise } from "xml2js";

import { formatJsDoc, godotTypeToTsType, sanitizeGodotNameForTs } from "./generation_utils";

export type GodotXMLMethod = {
    $: {
        name: string;
        qualifiers?: string;
    };
    return?: [{ $: { type: string } }];
    param: {
        $: {
            index: string /* e.g. "1" */;
            name: string;
            type: string;
            default?: string;
        };
    }[];
    description: [string];
};

export const getCodeForMethod = (
    generateAsGlobals: boolean,
    props: {
        name: string;
        docString: string;
        argumentList: string;
        returnType: string;
        isAbstract: boolean;
    },
) => {
    const { name, argumentList, docString, isAbstract, returnType } = props;

    switch (name) {
        case "connect":
        case "yield":
        case "typeof":
        case "rpc":
        case "rpc_id":
        case "print":
            return "";
        case "is_action_just_pressed":
            return `${docString}
is_action_just_pressed(action: Action): boolean;
      `;
        case "is_action_pressed":
            return `${docString}
is_action_pressed(action: Action): boolean;
      `;
        case "is_action_just_released":
            return `${docString}
is_action_just_released(action: Action): boolean;
      `;
        case "get_node":
            return `${docString}
get_node(path: NodePathType): Node;

${docString}
get_node_unsafe<T extends Node>(path: NodePathType): T;
`;
        case "change_scene":
            return `${docString}\n change_scene(path: SceneName): int`;
        case "get_nodes_in_group":
            return `${docString} \nget_nodes_in_group< T extends keyof Groups>(group: T): Groups[T][]`;
        case "has_group":
            return `${docString} \nhas_group< T extends keyof Groups>(name: T): boolean`;
        case "make_input_local":
            return "make_input_local< T extends InputEvent>(event: T): T";
        case "emit_signal":
            return `${docString} \nemit_signal< U extends (...args: Args) => any, T extends Signal<U>, Args extends any[]>(signal: T, ...args: Args): void;`;
        default:
            if (generateAsGlobals) {
                return `${docString} \ndeclare const ${name}: (${argumentList}) => ${returnType}`;
            } else {
                return `${docString} \n${isAbstract ? "protected " : ""}${name}(${argumentList}): ${returnType};`;
            }
    }
};

const argsToString = (
    args: {
        $: {
            index: string;
            name: string;
            type: string;
            default?: string;
        };
    }[],
) => {
    let result: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const argName = sanitizeGodotNameForTs(arg["$"].name, "argument");
        let argType = godotTypeToTsType(arg["$"].type);
        const isOptional = args.slice(i).every((arg) => !!arg["$"].default);

        if (argType === "StringName") {
            if (argName === "group") {
                argType = "keyof Groups";
            }

            if (argName === "action") {
                argType = "Action";
            }
        }

        result.push(`${argName}${isOptional ? "?" : ""}: ${argType}`);
    }

    return result;
};

export const parseMethod = (
    method: GodotXMLMethod,
    props?: {
        generateAsGlobals?: boolean;
    },
) => {
    const generateAsGlobal = props?.generateAsGlobals ?? false;
    const name = method.$.name;
    const param = method.param;
    const isVarArgs = method.$.qualifiers === "vararg";
    const docString = formatJsDoc(method.description[0].trim());
    let returnType = godotTypeToTsType(method.return?.[0]["$"].type ?? "Variant");
    let paramsList = "";

    if (param || isVarArgs) {
        if (isVarArgs) {
            paramsList = "...param: any[]";
        } else {
            paramsList = argsToString(param).join(", ");
        }
    }

    // Special case for TileSet#tile_get_shapes
    if (name === "tile_get_shapes") {
        returnType = `{
  autotile_coord: Vector2,
  one_way: boolean,
  one_way_margin: int,
  shape: CollisionShape2D,
  shape_transform: Transform2D,
}[]`;
    }

    if (name === "assert") {
        returnType = `asserts condition`;
    }

    if (name === "get_overlapping_bodies") {
        returnType = "PhysicsBody2D[]";
    }

    if (name === "get_datetime") {
        returnType = `{
      year: number;
      month: number;
      day: number;
      weekday: number;
      dst: boolean;
      hour: number;
      minute: number;
      second: number;
    }`;
    }

    if (name === "get_children") {
        returnType = `Node[]`;
    }

    const isAbstract = name.startsWith("_");

    const result = {
        name,
        argumentList: paramsList,
        docString,
        returnType,
        isAbstract,
    };

    return {
        ...result,
        codegen: getCodeForMethod(generateAsGlobal, result),
    };
};

export const generateGdscriptLib = async (path: string) => {
    const content = fs.readFileSync(path, "utf-8");
    const json = await parseStringPromise(content);

    let result = "";

    const globalMethods: GodotXMLMethod[] = json.class.methods[0].method;
    const constants = (json.class.constants ?? [])[0]?.constant ?? [];
    const parsedMethods = globalMethods.map((m) => parseMethod(m, { generateAsGlobals: true }));

    for (const parsedMethod of parsedMethods) {
        if (parsedMethod.name === "load") {
            continue;
        }

        if (parsedMethod.name === "preload") {
            continue;
        }

        result += parsedMethod.codegen + "\n";
    }

    return result;
};

// generateGdscriptLib(
//   "/Users/johnfn/code/tsgd/godot/modules/gdscript/doc_classes/@GDScript.xml"
// )
