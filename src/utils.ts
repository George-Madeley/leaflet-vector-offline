import {
  getBlobByKey,
  hasTile,
} from "leaflet.offline/dist/types/src/TileManager";
import { Status } from "./types";
import { Bounds, Browser, Point, Util } from "leaflet";

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
 * @returns The url of the tile image source and boolean where if `true`, means
 * the tile was fetched from the URL. If `false`, tile was fetched from cache.
 */
export const getTileImageSource = async (key: string, url: string): Promise<[string, boolean]> => {
  const shouldUseUrl: boolean = !(await hasTile(key));
  if (shouldUseUrl) {
    return [url, shouldUseUrl];
  }
  const blob = await getBlobByKey(key);
  return [URL.createObjectURL(blob), shouldUseUrl];
}

/**
 * Calculates and returns an array of points representing tile coordinates
 * within a specified area. This is useful in mapping applications where you
 * need to determine which tiles cover a given area.
 * 
 * @param area An object of type `Bounds` that defines the area of interest. It
 * has min and max properties representing the minimum and maximum bounds of the
 * area.
 * @param tileSize An object of type `Point` that represents the size of each
 * tile.
 * 
 * @returns 
 * 
 * @example
 * If `area` has min as `(0, 0)` and `max` as `(256, 256)`, and `tileSize` is
 * `(256, 256)`, the function will return:
 * 
 * ```[Point(0, 0), Point(1, 0), Point(0, 1), Point(1, 1)]```
 * 
 */
export const getTilePoints = (area: Bounds, tileSize: Point): Point[] => {
  const points: Point[] = [];
  if (!area.min || !area.max) {
    return points;
  }
  const topLeftTile = area.min.divideBy(tileSize.x).floor();
  const bottomRightTile = area.max.divideBy(tileSize.x).floor();

  for (let j = topLeftTile.y; j <= bottomRightTile.y; j += 1) {
    for (let i = topLeftTile.x; i <= bottomRightTile.x; i += 1) {
      points.push(new Point(i, j));
    }
  }
  return points;
}

/**
 * Generates a URL a for a tile image based on a template and some data. It also
 * adjusts the URL for high-resolution (retina) displays if necessary.
 * 
 * @param urlTemplate a string that represents the URL template.
 * @param data an object containing key-value pairs that will be used to replace
 * placeholders in the `urlTemplate`.
 * 
 * @returns formatted URL for the tile
 * 
 * @example
 * If `urlTemplate` is `"https;///example.com/tiles/{z}/{x}/{y}{r}.png"` and
 * data is `{ z: 10, x: 512, y: 384 }`, and `Browser.retina` is `true`, the
 * function will return:
 * 
 * `"https://example.com/tiles/10/512/384@2x.png"`
 * 
 * If `Browser.retina` is `false`, it will return:
 * 
 * `"https://example.com/tiles/10/512/384.png"`
 */
export const getTileUrl = (urlTemplate: string, data: any): string => {
  return Util.template(urlTemplate, {
    ...data,
    r: Browser.retina ? '@2x' : '',
  });
}