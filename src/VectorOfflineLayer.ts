// biome-ignore lint: leaflet 1.x
declare const L: any;

import {
  KeyedHtmlCanvasElement,
  Status,
  ThemeName,
  TileResponseFulfilled,
  TileResponseRejected,
  VectorLayerOptions,
} from "./types";
import { getTileImageSource, reflect, timer } from "./utils";
import { Theme, themes } from "./themes";

import { Bounds, Coords, DoneCallback, Point } from "leaflet";
import { getTilePoints, getTileUrl, TileInfo } from "leaflet.offline";
import * as protomapsLeaflet from "protomaps-leaflet";

export class VectorOfflineLayer extends L.TileLayer {
  backgroundColor: string | undefined;
  debug: string | undefined;
  labelers: protomapsLeaflet.Labelers;
  labelRules: protomapsLeaflet.LabelRule[];
  lang: string | undefined;
  lastRequestedZ: number | undefined;
  paintRules: protomapsLeaflet.PaintRule[];
  scratch: CanvasRenderingContext2D;
  sourcePriority: "online" | "offline" | "both";
  tasks: Promise<Status>[] | undefined;
  tileDelay: number;
  tileSize: number;
  views: Map<string, protomapsLeaflet.View>;

  _url!: string;

  constructor(url: string, options: VectorLayerOptions) {
    if (options.noWrap && !options.bounds)
      options.bounds = [
        [-90, -180],
        [90, 180],
      ];
    if (options.attribution == null)
      options.attribution =
        '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';
    options = { ...options, url: url };

    super(url, options);

    // This should be set within `TileLayer.initialize()` but for some reason,
    // it only sets the variable locally. Therefore, we reset this._url here.
    this._url = url;

    this.sourcePriority = options.priority || "both";

    if (options.theme) {
      const themeName: ThemeName = options.theme || "light";
      const theme: Theme = themes[themeName];
      this.paintRules = protomapsLeaflet.paintRules(theme);
      this.labelRules = protomapsLeaflet.labelRules(theme);
      this.backgroundColor = theme.background;
    } else {
      this.paintRules = options.paintRules || [];
      this.labelRules = options.labelRules || [];
      this.backgroundColor = options.backgroundColor;
    }

    this.lastRequestedZ = undefined;
    this.tasks = options.tasks || [];

    this.views = protomapsLeaflet.sourcesToViews(options);

    this.debug = options.debug;
    const scratch: CanvasRenderingContext2D = document
      .createElement("canvas")
      .getContext("2d")!;
    this.scratch = scratch;
    this.labelers = new protomapsLeaflet.Labelers(
      this.scratch,
      this.labelRules,
      16,
      (tiles: Set<string>) => {
        for (const t of tiles) {
          this.rerenderTile(t);
        }
      }
    );
    this.tileSize = 256 * window.devicePixelRatio;
    this.tileDelay = options.tileDelay || 3;
    this.lang = options.lang;
  }

  /**
   * Clear the layout of the labels. This is useful when the map is panned or
   * zoomed, and the labels need to be re-laid out.
   */
  public clearLayout() {
    this.labelers = new protomapsLeaflet.Labelers(
      this.scratch!,
      this.labelRules,
      16,
      (tiles: Set<string>) => {
        for (const t of tiles) {
          this.rerenderTile(t);
        }
      }
    );
  }

  /**
   * Create a tile element for the given coordinates and callback when it's
   * ready.
   *
   * @param coords Coordinates of the tile
   * @param done Callback function
   *
   * @returns HTMLCanvasElement of the vector tile.
   */
  public createTile(
    coords: Coords,
    done: DoneCallback
  ): KeyedHtmlCanvasElement {
    const tile: KeyedHtmlCanvasElement = L.DomUtil.create(
      "canvas",
      "leaflet-tile"
    );

    tile.lang = this.lang || "";

    const offlineKey: string = this._getStorageKey(coords);
    const onlineKey: string = this._tileCoordsToKey(coords);

    getTileImageSource(this._getStorageKey(coords), this._url).then(
      (value: [string, boolean]) => {
        const [url, fromOnline]: [string, boolean] = value;
        let key: string | undefined;

        if (this.options.verbose) {
          console.log(
            `Coords: ${coords},\nOffline key: ${offlineKey},\nOnline key: ${onlineKey},\nfromOnline: ${fromOnline},\nsourcePriority: ${this.sourcePriority}`
          );
        }

        if (
          fromOnline &&
          (this.sourcePriority === "both" || this.sourcePriority === "online")
        ) {
          key = onlineKey;
        } else if (
          !fromOnline &&
          (this.sourcePriority === "both" || this.sourcePriority === "offline")
        ) {
          key = offlineKey;
        }
        if (key) {
          tile.key = key;
          this.renderTile(coords, tile, key, url, () => {
            done(undefined, tile);
          });
        }
      }
    );

    if (this.options.verbose) {
      tile.style.border = "1px solid red";
    }

    return tile;
  }

  /**
   * Get the tile url for the given bounds and zoom level.
   *
   * @param bounds Tile bounds.
   * @param zoom Zoom level.
   *
   * @returns Array of TileInfo objects.
   */
  public getTileUrls(bounds: Bounds, zoom: number): TileInfo[] {
    const tiles: TileInfo[] = [];
    const tilePoints: Point[] = getTilePoints(bounds, this.getTileSize());
    tilePoints.forEach((tilePoint: Point) => {
      const data = {
        ...this.options,
        x: Math.floor(tilePoint.x * 2 ** this.options.zoomOffset),
        y: Math.floor(tilePoint.y * 2 ** this.options.zoomOffset),
        z: zoom + (this.options.zoomOffset || 0),
      };
      tiles.push({
        key: getTileUrl(this._url, {
          ...data,
          s: this.options.subdomains?.[0],
        }),
        url: getTileUrl(this._url, {
          ...data,
          // // @ts-ignore: Undefined
          s: this._getSubdomain(tilePoint),
        }),
        z: zoom,
        x: tilePoint.x,
        y: tilePoint.y,
        urlTemplate: this._url,
        createdAt: Date.now(),
      });
    });
    return tiles;
  }

  /**
   * Render the tile for the given coordinates using vector data.
   *
   * @param coords The coordinates of the tile.
   * @param element The HTMLCanvasElement of the tile.
   * @param key The key of the tile to render. This is dependent on the source
   * of the tile data. I.e., if the tile data is from the offline source or the
   * online source.
   * @param url The URL of the tile data.
   * @param done callback function to be called when the tile is rendered.
   */
  public async renderTile(
    coords: Coords,
    element: KeyedHtmlCanvasElement,
    key: string,
    url: string,
    done = () => {}
  ): Promise<void> {
    if (this.options.verbose) {
      console.log(
        `Rendering Element key: ${element.key},\nkey: ${key},\nlastRequestedZ: ${this.lastRequestedZ},\ncoords.z: ${coords.z}`
      );
    }

    this.views = protomapsLeaflet.sourcesToViews({ ...this.options, url });

    this.lastRequestedZ = coords.z;

    const promises: {
      key: string;
      promise: Promise<protomapsLeaflet.PreparedTile>;
    }[] = [];
    for (const [key, view] of this.views) {
      const promise: Promise<protomapsLeaflet.PreparedTile> =
        view.getDisplayTile(coords);
      promises.push({ key: key, promise: promise });
    }
    const tileResponses: (TileResponseFulfilled | TileResponseRejected)[] =
      await Promise.all(
        promises.map(
          (object: {
            key: string;
            promise: Promise<protomapsLeaflet.PreparedTile>;
          }): Promise<TileResponseFulfilled | TileResponseRejected> => {
            return object.promise.then(
              (v: protomapsLeaflet.PreparedTile) => {
                const response: TileResponseFulfilled = {
                  status: "fulfilled",
                  value: v,
                  key: object.key,
                };
                return response;
              },
              (error: Error) => {
                const response: TileResponseRejected = {
                  status: "rejected",
                  reason: error,
                  key: object.key,
                };
                return response;
              }
            );
          }
        )
      );
    const preparedTilemap = new Map<string, protomapsLeaflet.PreparedTile[]>();
    tileResponses.forEach(
      (tileResponse: TileResponseFulfilled | TileResponseRejected) => {
        if (tileResponse.status === "fulfilled") {
          preparedTilemap.set(tileResponse.key, [tileResponse.value]);
        } else if (tileResponse.status === "rejected") {
          if (tileResponse.reason.name !== "AbortError") {
            console.error(
              `ERROR: (${tileResponse.reason.name}) ${tileResponse.reason}`
            );
          }
        } else {
          console.error(
            'TYPE ERROR: `tileResponse.status` has valued that is not "fulfilled" or "rejected"'
          );
        }
      }
    );

    if (!this._validateKey(element, key, coords)) return;

    await Promise.all(this.tasks!.map(reflect));

    if (!this._validateKey(element, key, coords)) return;

    const layoutTime = this.labelers.add(coords.z, preparedTilemap);

    if (!this._validateKey(element, key, coords)) return;

    const labelData = this.labelers.getIndex(coords.z);

    if (!this._map) return;

    const center = this._map.getCenter().wrap();
    const pixelBounds = this._getTiledPixelBounds(center);
    const tileRange = this._pxBoundsToTileRange(pixelBounds);
    const tileCenter = tileRange.getCenter();
    const priority = coords.distanceTo(tileCenter) * this.tileDelay;

    await timer(priority);

    if (!this._validateKey(element, key, coords)) return;

    const buf = 16;
    const bbox = {
      minX: 256 * coords.x - buf,
      minY: 256 * coords.y - buf,
      maxX: 256 * (coords.x + 1) + buf,
      maxY: 256 * (coords.y + 1) + buf,
    };
    const origin = new L.Point(256 * coords.x, 256 * coords.y);

    element.width = this.tileSize;
    element.height = this.tileSize;
    const ctx = element.getContext("2d");
    if (!ctx) {
      console.error("Failed to get Canvas context");
      return;
    }
    ctx.setTransform(this.tileSize / 256, 0, 0, this.tileSize / 256, 0, 0);
    ctx.clearRect(0, 0, 256, 256);

    if (this.backgroundColor) {
      ctx.save();
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, 256, 256);
      ctx.restore();
    }

    let paintingTime = 0;

    const paintRules = this.paintRules;

    paintingTime = protomapsLeaflet.paint(
      ctx,
      coords.z,
      preparedTilemap,
      this.xray ? null : labelData!,
      paintRules,
      bbox,
      origin,
      false,
      this.debug
    );

    if (this.debug) {
      ctx.save();
      ctx.fillStyle = this.debug;
      ctx.font = "600 12px sans-serif";
      ctx.fillText(`${coords.z} ${coords.x} ${coords.y}`, 4, 14);

      ctx.font = "12px sans-serif";
      let ypos = 28;
      for (const [k, v] of preparedTilemap) {
        const dt = v[0].dataTile;
        ctx.fillText(`${k + (k ? " " : "") + dt.z} ${dt.x} ${dt.y}`, 4, ypos);
        ypos += 14;
      }

      ctx.font = "600 10px sans-serif";
      if (paintingTime > 8) {
        ctx.fillText(`${paintingTime.toFixed()} ms paint`, 4, ypos);
        ypos += 14;
      }

      if (layoutTime > 8) {
        ctx.fillText(`${layoutTime.toFixed()} ms layout`, 4, ypos);
      }
      ctx.strokeStyle = this.debug;

      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 256);
      ctx.stroke();

      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(256, 0);
      ctx.stroke();

      ctx.restore();
    }
    done();
  }

  /**
   * Rerender all the tiles.
   */
  public rerenderTiles(): void {
    for (const unwrappedK in this._tiles) {
      const wrappedCoord = this._wrapCoords(this._keyToTileCoords(unwrappedK));
      const key = this._tileCoordsToKey(wrappedCoord);
      this.renderTile(wrappedCoord, this._tiles[unwrappedK].el, key, this._url);
    }
  }

  /**
   * Rerender the tile with the given key.
   *
   * @param key The key of the tile to rerender.
   */
  public rerenderTile(key: string): void {
    for (const unwrappedK in this._tiles) {
      const wrappedCoord = this._wrapCoords(this._keyToTileCoords(unwrappedK));
      if (key === this._tileCoordsToKey(wrappedCoord)) {
        this.renderTile(
          wrappedCoord,
          this._tiles[unwrappedK].el,
          key,
          this._url
        );
      }
    }
  }

  /**
   * Query the features at the given point.
   *
   * A primitive way to check the features at a certain point. It does not
   * support hover states, cursor changes, or changing the style of the selected
   * feature, so is only appropriate for debuggging or very basic use cases.
   * Those features are outside of the scope of this library: for fully
   * pickable, interactive features, use MapLibre GL JS instead.
   *
   * @param lng longitude of the point to query
   * @param lat latitude of the point to query
   * @param brushSize brush size to query the features
   * @returns Map of source name to the features at the given point.
   */
  public queryTileFeaturesDebug(
    lng: number,
    lat: number,
    brushSize = 16
  ): Map<string, protomapsLeaflet.PickedFeature[]> {
    const featuresBySourceName = new Map<
      string,
      protomapsLeaflet.PickedFeature[]
    >();
    for (const [sourceName, view] of this.views) {
      featuresBySourceName.set(
        sourceName,
        view.queryFeatures(lng, lat, this._map.getZoom(), brushSize)
      );
    }
    return featuresBySourceName;
  }

  /**
   * Remove the tile with the given key.
   *
   * @param key key of the tile to remove.
   */
  public _removeTile(key: string): void {
    const tile = this._tiles[key];
    if (!tile) {
      return;
    }
    tile.el.removed = true;
    tile.el.key = undefined;
    L.DomUtil.removeClass(tile.el, "leaflet-tile-loaded");
    tile.el.width = tile.el.height = 0;
    L.DomUtil.remove(tile.el);
    delete this._tiles[key];
    this.fire("tileunload", {
      tile: tile.el,
      coords: this._keyToTileCoords(key),
    });
  }

  /**
   * Get the subdomain for the given point.
   *
   * @param coords The coordinates of the tile to get the subdomain.
   *
   * @returns The subdomain for the given point.
   */
  private _getStorageKey(coords: Coords): string {
    return getTileUrl(this._url, {
      ...coords,
      ...this.options,
      x: Math.floor(coords.x * 2 ** this.options.zoomOffset),
      y: Math.floor(coords.y * 2 ** this.options.zoomOffset),
      z: coords.z + (this.options.zoomOffset || 0),
      // // @ts-ignore: Possibly undefined
      s: this.options.subdomains["0"],
    });
  }

  private _validateKey(
    element: KeyedHtmlCanvasElement,
    key: string,
    coords: Coords
  ): boolean {
    if (this.options.verbose) {
      console.log(
        `Element key: ${element.key},\nkey: ${key},\nlastRequestedZ: ${this.lastRequestedZ},\ncoords.z: ${coords.z}`
      );
    }

    if (element.key !== key) {
      return false;
    }
    if (this.lastRequestedZ !== coords.z) {
      return false;
    }
    return true;
  }
}

/**
 * Create a new VectorOfflineLayer object.
 *
 * @param url The URL of the vector tile.
 * @param options The options for the vector map.
 *
 * @returns A new VectorOfflineLayer object.
 */
export function vectorOfflineLayer(
  url: string,
  options: VectorLayerOptions
): VectorOfflineLayer {
  return new VectorOfflineLayer(url, options);
}

// // @ts-ignore
if (window.L) {
  // @ts-expect-error type `offline` does not exist on type `tileLayer`.
  window.L.tileLayer.offline = vectorOfflineLayer;
}
