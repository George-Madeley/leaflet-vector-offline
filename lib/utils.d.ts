import { Status } from "./types";
export declare const reflect: (promise: Promise<Status>) => Promise<{
    status: string;
    value: Status;
} | {
    status: string;
    reason: any;
}>;
export declare const timer: (duration: number) => Promise<void>;
/**
 * Fetches the tile image source from the cache if it exists, otherwise fetches
 * it from the online url.
 *
 * This method is from leaflet.offline TileManager but it is not exported.
 *
 * @param key The key of the tile
 * @param url The online url of the tile
 * @returns The url of the tile image source and boolean where if ```true```,
 * means the tile was fetched from the URL. If ```false```, tile was fetched
 * from cache.
 */
export declare function getTileImageSource(key: string, url: string): Promise<[string, boolean]>;
