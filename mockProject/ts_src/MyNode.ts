export default class extends Node2D {
    override _ready() {
        let label = (this as IMyNode).get_node("Hello");
        label.text = "Welcome to TS2GD";
    }
}
