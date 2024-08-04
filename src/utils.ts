import { getBlobByKey, hasTile } from "leaflet.offline";
import { Status, StatusFulfilled, StatusRejected } from "./types.ts";

export const reflect = (
  promise: Promise<Status>
): Promise<StatusFulfilled | StatusRejected> => {
  return promise.then(
    (status: Status) => {
      return { status: "fulfilled", value: status.value };
    },
    (error: Error) => {
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
 * @returns The url of the tile image source and boolean where if `true`, means
 * the tile was fetched from the URL. If `false`, tile was fetched from cache.
 */
export const getTileImageSource = async (
  key: string,
  url: string
): Promise<[string, boolean]> => {
  const shouldUseUrl = !(await hasTile(key));
  if (shouldUseUrl) {
    return [url, shouldUseUrl];
  }
  const blob = await getBlobByKey(key);
  return [URL.createObjectURL(blob), shouldUseUrl];
};
