import {
  getBlobByKey,
  hasTile,
} from "leaflet.offline/dist/types/src/TileManager";
import { Status } from "./types";

export const reflect = (promise: Promise<Status>) => {
  return promise.then(
    (v) => {
      return { status: "fulfilled", value: v };
    },
    (error) => {
      return { status: "rejected", reason: error };
    }
  );
};

export const timer = (duration: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
};

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
export async function getTileImageSource(key: string, url: string): Promise<[string, boolean]> {
  const shouldUseUrl: boolean = !(await hasTile(key));
  if (shouldUseUrl) {
    return [url, shouldUseUrl];
  }
  const blob = await getBlobByKey(key);
  return [URL.createObjectURL(blob), shouldUseUrl];
}
