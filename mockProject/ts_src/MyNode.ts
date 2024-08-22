export default class extends Node2D {
    private _a = 1;

    set a(v: int) {
        this._a = v;
    }

    override _ready() {
        let label = this.get_node("Hello") as Label;
        label.text = "Welcome to TS2GD";
    }
}
