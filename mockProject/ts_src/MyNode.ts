export default class extends Node2D {
    override _ready() {
        let label = this.get_node("Hello") as Label;
        label.text = "Welcome to TS2GD";
    }
}
