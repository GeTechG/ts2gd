# ts2gd: Compile TypeScript to GDScript

Why use ts2gd?

- Incrementally compiles to GDScript in under a tenth of a second.
- Provides insanely good autocomplete and documentation.
- Use all of TS's extremely powerful type system.

## Install:

`npm install --global ts2gd`

Then just run `ts2gd` in your favorite Godot project folder.

![](output.gif)

## Why?

GDScript is a great language - it's perfectly designed for quick prototyping. But it lacks the type-safety and maturity of a language like TypeScript. By compiling TS into GD, we can get the best of both worlds: a rapid prototyping language that compiles virtually instantaneously, that also comes with excellent typesafety.

We can also get really, really good autocomplete and refactoring support.

## Setup

Add a ts2gd.json file to your Godot project root:

```
{
  "destination": "./compiled",
  "source": "./src"
}
```

Now, run the compiler on tsgd.json:

`ts-node main.ts tsgd.json`

## Details and Differences

### load/preload

Sure, you _could_ do preload("YourScriptFile.tscn)... but why would you? ts2gd automatically creates globals for your scenes that you can
import directly. e.g. if you want to instance, "YourScriptFile.tscn", just type YourScriptFileTscn and allow TS to auto-import it. You can
then instance() it as normal. e.g., this:

`const new_obj = preload("res://MyScene.tscn).instance()`

is equivalent to this:

`const new_obj = MySceneTscn.instance()`

### Enums

Godot decides to put a bunch of enum values into global scope. I think this clutters things up: the global scope has tons of mostly useless enum values in it, and it's impossible to tell what property belongs to which enum. So we move them into `EnumName.PropertyName` instead. This is extra nice because now if you type `EnumName` you get autocomplete of all the types in that Enum.

For instance,

```
Input.is_key_pressed(KEY_W)
```

becomes

```
Input.is_key_pressed(KeyList.KEY_SPACE)
```

For the full list of namespaced enums, you can see the generated @globals.d.ts file.

In the future, this could become a configuration setting on tsgd.json.

### `rpc`

The RPC syntax has been improved.

GDScript:

```
this.rpc("my_rpc_method", "some-argument)
```

TypeScript:

```
this.my_rpc_method.rpc("some-argument")
```

### `signals`

Signals have been improved. All signals now start with `$` and are properties of the class they're defined on.

#### `connect`

This is what connect looks like in ts2gd:

```
this.my_button.$pressed.connect(() => {
  print("Clicked the button!)
})
```

#### `yield`

This is what yield looks like in ts2gd:

```
yield this.get_tree().$idle_frame
```

#### `emit`

This is what emit looks like in ts2gd:

```
class MySignallingClass extends Node2D {
  $my_signal!: Signal // ! to avoid the TS error about this signal being unassigned

  _process() {
    this.$my_signal.emit()
  }
}
```

### Autoloads

In order to make a class autoload, decorate your class with `@autoload`, and create and export an instance of the class. ts2gd will automatically add it as an AutoLoad in your Godot project (assuming you're on version 3.3!)

Here's a full example of an autoload class.

```
@autoload
class MyAutoloadClass extends Node2D {
  public hello = "hi"
}

export const MyAutoload = new MyAutoloadClass()
```

#### Autoload node resolution

`get_node()` on an autoloaded class will autocomplete to nodes found in the main scene (the scene that Godot launches at the start of the game). This is generally accurate... unless you start a different scene in Godot.

### Exports

In order to mark an instance variable as `export`, use `@exports`, e.g.:

```
class ExportExample extends Node2D {
  @exports
  public hello = "exported"
}
```

### remotesync, remote

To mark a method as remotesync or remote, use `@remotesync` and `@remote`, respectively.

### Vector2 / Vector3 operator overloading

TypeScript sadly has no support for operator overloading.

There are two alternatives:

#### Use my forked TypeScript compiler

I forked TS and added support for Vectors, so you can do `Vector2(1, 1) + Vector(2, 2)` like normal.

#### Use replacement methods

I realize that using a forked TS compiler might not be the best option for everyone, so I provide an alternative solution.

```
const v1 = Vector(1, 2)
const v2 = Vector(1, 2);

v1.add(v2); // v1 + v2
v1.sub(v2); // v1 - v2
v1.mul(v2); // v1 * v2
v1.div(v2); // v1 / v2
```

The add/sub/mul/div gets compiled into the corresponding arithmatic.

### Dictionary

The default TS dictionary (e.g. `const dict = { a: 1 }`) only supports string, number and symbol as keys. If you want anything else, you can just use the Dictionary type, and use `.put` instead of square bracket access.

```
const myComplexDict: Dictionary<Node2D, int> = todict({})

myComplexDict.put(myNode, 5)
```

### Latest and greatest Godot definitions

If you'd like ts2gd to generate the latest TS definitions from Godot, clone the Godot repository and point it at the 3.x tag. Then add the following to your ts2gd.json:

```
  "godotSourceRepoPath": "/path/to/your/godot/clone"
```

This shouldn't be necessary unless you want some really recent features from Godot, or you're developing the ts2gd compiler.

# Roadmap

## Road to usability

- [x] load("myscene.tscn) should return a `PackedScene<T>` where T is the type of the root node of the scene
- [x] `connect()`
- [x] When i migrate to only using compiled gdscripts, adjust the imports() appropriately to figure out where the compiled versions are.
- [x] Compile "Yield" to "yield"
- [x] Translate `add()`, `sub()`, etc
- [x] mark int/float in API
- [x] add documentation for class names.
- [x] With int/float, mark down the variables we've determined to be int/float so we can use that information rather than TS telling us that everything is number.
- [x] Autocomplete relative node paths as well as absolute ones
- [x] `extends` must be transpiled before everything else, including enum declarations and other top level things
- [x] Godot expects methods like \_process to _always_ have a float parameter, but TS does not require this. It should be added implicitly.
- [ ] explain tne `enum` thing better
- [ ] @node annotations to say which node a class belongs to
- [x] handle parameters to \_functions that aren't provided in TS by autofilling them in Godot
- [x] `callables`
- [x] Handle passing anonymous functions around - probably with funcref for now.
- [ ] Handle the thing where if u never yield its never a coroutine
- [ ] Either allow the user to point their ts2gd at a godot source download, or more likely, just grab it from online? Idk.
- [ ] Fallthrough cases in switch are currently not supported.
- [ ] generate Godot without warnings (as much as possible)
- [ ] `tool`
- [ ] it would be very nice to be able to pass in anonymous functions in place of callables, and have the compiler sort that out.

## Road to superior development

- [ ] Autoload classes should have an @annotation and then get automatically added to the project
- [x] get_nodes_in_group should parse scene to determine a more accurate return type
- [x] Mark unused variables with \_ to avoid warnings
- [x] parse the bbcode in the XML into markdown that TS can read.
- [x] when scenes are updated, update their corresponding definition files
- [ ] create scripts and attach them to nodes directly through the editor - perhaps with @Node("/blah")
- [x] don't hide object autocomplete names
- [x] strongly type input action names
- [x] handle renames better - delete the old compiled file, etc.
- [ ] refactoring class names doesn't really work right now because i think we need to rename types in tscn files...
- [ ] would be nice to declare multiple classes in the same .ts file and have the compiler sort it out
- [x] add a way to install ts2gd as a global command
- [x] ensure that signal arguments match up
- [ ] add a way to use ts2gd via installer rather than command line
- [ ] Whether to hide away constants into enums or not could be parameterizeable. It is _correct_ to hide them into enums, but it will be confusing for people who haven't read the README, which is probably everyone.
- [ ] Some sort of error if an autoload class is not entirely static.
- [x] yield(this.get_tree(), "idle_frame"); could autocomplete idle_frame? it's possible: just get all the signals on the object.
- [ ] Fancy TS/JS features
  - [x] destructuring
  - [ ] ... spread operator
- [x] Map, filter, etc? even though they aren't part of godot, it would be nice to have them.
- [x] ../ node paths (note: impossible)
- [x] Break our assumption that filename === classname
- [ ] Onready vs nonready - maybe we don't have to mark everything as an onready var? Is there an advantage to so doing?
- [x] ts2gd: Handle adding new files.
- [x] ts2gd: Handle deleting old files.
- [x] ts2gd: Random newlines at beginning of file.
- [x] Is there a better way to do Dictionary, with strongly typed k/v?
- [ ] Sourcemaps / debugging???
- [ ] use LSP to handle operator overloading, sourcemap issues...?!?

# How?!

Compiling GDScript to TypeScript is actually pretty straightforward. Almost every keyword and control structure in GDScript compiles directly to a corresponding keyword or control structure in TypeScript.
