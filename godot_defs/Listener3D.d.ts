
/**
 * Once added to the scene tree and enabled using [method make_current], this node will override the location sounds are heard from. This can be used to listen from a location different from the [Camera3D].
 *
 * **Note:** There is no 2D equivalent for this node yet.
 *
*/
declare class Listener3D extends Node3D {

  
/**
 * Once added to the scene tree and enabled using [method make_current], this node will override the location sounds are heard from. This can be used to listen from a location different from the [Camera3D].
 *
 * **Note:** There is no 2D equivalent for this node yet.
 *
*/
  "new"(): this;
  static "new"(): this;




/** Disables the listener to use the current camera's listener instead. */
clear_current(): void;

/** Returns the listener's global orthonormalized [Transform]. */
get_listener_transform(): Transform;

/**
 * Returns `true` if the listener was made current using [method make_current], `false` otherwise.
 *
 * **Note:** There may be more than one Listener3D marked as "current" in the scene tree, but only the one that was made current last will be used.
 *
*/
is_current(): boolean;

/** Enables the listener. This will override the current camera's listener. */
make_current(): void;

  connect<T extends SignalsOf<Listener3D>, U extends Node>(signal: T, node: U, method: keyof U): number;





  
}


 
