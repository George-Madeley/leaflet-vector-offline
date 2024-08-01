// biome-ignore lint: leaflet 1.x
declare const L: any;

import { KeyedHtmlCanvasElement, LeafletLayerOptions } from "./types";
import { getTileImageSource, reflect, timer } from "./utils";
import { themes } from "./themes";

import { Bounds, Coords, DoneCallback, Point } from "leaflet";
import { getTilePoints, getTileUrl, TileInfo } from "leaflet.offline";
import * as protomapsLeaflet from "protomaps-leaflet";

export class VectorOfflineLayer extends L.GridLayer {
  _url!: string;

  constructor(options: LeafletLayerOptions = {}) {
    if (options.noWrap && !options.bounds)
      options.bounds = [
        [-90, -180],
        [90, 180],
      ];
    if (options.attribution == null)
      options.attribution =
        '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';
    super(options);

    this._options = options;

    if (options.theme) {
      const theme = themes[options.theme];
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
    const scratch = document.createElement("canvas").getContext("2d");
    this.scratch = scratch;
    this.onTilesInvalidated = (tiles: Set<string>) => {
      for (const t of tiles) {
        this.rerenderTile(t);
      }
    };
    this.labelers = new protomapsLeaflet.Labelers(
      this.scratch,
      this.labelRules,
      16,
      this.onTilesInvalidated
    );
    this.tileSize = 256 * window.devicePixelRatio;
    this.tileDelay = options.tileDelay || 3;
    this.lang = options.lang;
  }

  public clearLayout() {
    this.labelers = new protomapsLeaflet.Labelers(
      this.scratch,
      this.labelRules,
      16,
      this.onTilesInvalidated
    );
  }

  public createTile(coords: Coords, done: DoneCallback): HTMLCanvasElement {
    const tile = L.DomUtil.create("canvas", "leaflet-tile");

    tile.lang = this.isLoading;

    const storageKey: string = this._getStorageKey(coords);
    const onlineKey: string = this._tileCoordsToKey(coords);

    // This method takes the tile key and the online url of the tile and returns
    // the url of the tile image source from the cache if it exists, otherwise
    // it fetches it from the online url. This url is then set as the src of the
    // tile element. i.e., <img src={url} />. But as we are using canvas instead
    // of img, we cannot use this.
    // TODO: Find a way to use this method with canvas.
    getTileImageSource(
      this._getStorageKey(coords),
      this.getTileUrl(coords)
    ).then((value: [string, boolean]) => {
      const [url, fromOnline]: [string, boolean] = value;
      let key: string;
      if (fromOnline) {
        key = onlineKey;
      } else {
        key = storageKey;
      }
      tile.key = key;
      this.renderTile(coords, tile, key, url, () => {
        done(undefined, tile);
      });
    });

    return tile;
    //   const element = L.DomUtil.create("canvas", "leaflet-tile");
    //   element.lang = this.lang;

    //   const key = this._tileCoordsToKey(coords);
    //   element.key = key;

    //   this.renderTile(coords, element, key, () => {
    //     showTile(undefined, element);
    //   });

    //   return element;
  }

  public getTileUrls(bounds: Bounds, zoom: number): TileInfo[] {
    const tiles: TileInfo[] = [];
    const tilePoints: Point[] = getTilePoints(bounds, this.getTileSize());
    tilePoints.forEach((tilePoint: Point) => {
      const data = {
        ...this.options,
        x: tilePoint.x,
        y: tilePoint.y,
        z: zoom + (this.options.zoomOffset || 0),
      };
      tiles.push({
        key: getTileUrl(this._url, {
          ...data,
          s: this.options.subdomains?.[0],
        }),
        url: getTileUrl(this._url, {
          ...data,
          // @ts-ignore: Undefined
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

  public async renderTile(
    coords: Coords,
    element: KeyedHtmlCanvasElement,
    key: string,
    url: string,
    done = () => {}
  ) {
    this.views = protomapsLeaflet.sourcesToViews({ ...this._options, url });

    this.lastRequestedZ = coords.z;

    const promises = [];
    for (const [k, v] of this.views) {
      const promise = v.getDisplayTile(coords);
      promises.push({ key: k, promise: promise });
    }
    const tileResponses = await Promise.all(
      promises.map((o) => {
        return o.promise.then(
          (v: protomapsLeaflet.PreparedTile[]) => {
            return { status: "fulfilled", value: v, key: o.key };
          },
          (error: Error) => {
            return { status: "rejected", reason: error, key: o.key };
          }
        );
      })
    );

    const preparedTilemap = new Map<string, protomapsLeaflet.PreparedTile[]>();
    for (const tileResponse of tileResponses) {
      if (tileResponse.status === "fulfilled") {
        preparedTilemap.set(tileResponse.key, [tileResponse.value]);
      } else {
        if (tileResponse.reason.name === "AbortError") {
          // do nothing
        } else {
          console.error(tileResponse.reason);
        }
      }
    }

    if (element.key !== key) return;
    if (this.lastRequestedZ !== coords.z) return;

    await Promise.all(this.tasks.map(reflect));

    if (element.key !== key) return;
    if (this.lastRequestedZ !== coords.z) return;

    const layoutTime = this.labelers.add(coords.z, preparedTilemap);

    if (element.key !== key) return;
    if (this.lastRequestedZ !== coords.z) return;

    const labelData = this.labelers.getIndex(coords.z);

    if (!this._map) return; // the layer has been removed from the map

    const center = this._map.getCenter().wrap();
    const pixelBounds = this._getTiledPixelBounds(center);
    const tileRange = this._pxBoundsToTileRange(pixelBounds);
    const tileCenter = tileRange.getCenter();
    const priority = coords.distanceTo(tileCenter) * this.tileDelay;

    await timer(priority);

    if (element.key !== key) return;
    if (this.lastRequestedZ !== coords.z) return;

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
      this.xray ? null : labelData,
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

  public rerenderTiles() {
    for (const unwrappedK in this._tiles) {
      const wrappedCoord = this._wrapCoords(this._keyToTileCoords(unwrappedK));
      const key = this._tileCoordsToKey(wrappedCoord);
      this.renderTile(wrappedCoord, this._tiles[unwrappedK].el, key, this._url);
    }
  }

  public rerenderTile(key: string) {
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

  // a primitive way to check the features at a certain point.
  // it does not support hover states, cursor changes, or changing the style of the selected feature,
  // so is only appropriate for debuggging or very basic use cases.
  // those features are outside of the scope of this library:
  // for fully pickable, interactive features, use MapLibre GL JS instead.
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

  public _removeTile(key: string) {
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

  private _getStorageKey(coords: Coords) {
    return getTileUrl(this._url, {
      ...coords,
      ...this.options,
      // @ts-ignore: Possibly undefined
      s: this.options.subdomains["0"],
    });
  }
}

export function vectorOfflineLayer(options: LeafletLayerOptions) {
  return new VectorOfflineLayer(options);
}

/**  @ts-ignore */
if (window.L) {
  /**  @ts-ignore */
  window.L.tileLayer.offline = vectorOfflineLayer;
}
