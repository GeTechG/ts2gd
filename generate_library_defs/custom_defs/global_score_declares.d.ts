// @ts-expect-error ...
declare const load: <T extends AssetPath>(path: T) => AssetType[T];
// @ts-expect-error ...
declare const preload: <T extends AssetPath>(path: T) => AssetType[T];
declare function remotesync(target: any, key: string, descriptor: any): any;
declare function remote(target: any, key: string, descriptor: any): any;
