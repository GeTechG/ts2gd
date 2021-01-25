
/**
 * Parent class for various CSG primitives. It contains code and functionality that is common between them. It cannot be used directly. Instead use one of the various classes that inherit from it.
 *
*/
declare class CSGPrimitive3D extends CSGShape3D {

  
/**
 * Parent class for various CSG primitives. It contains code and functionality that is common between them. It cannot be used directly. Instead use one of the various classes that inherit from it.
 *
*/
  "new"(): this;
  static "new"(): this;



/** Invert the faces of the mesh. */
invert_faces: boolean;



  connect<T extends SignalsOf<CSGPrimitive3D>, U extends Node>(signal: T, node: U, method: keyof U): number;





  
}


 
