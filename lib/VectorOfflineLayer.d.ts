declare const L: any;
import { Bounds, Coords, DoneCallback } from "leaflet";
import { KeyedHtmlCanvasElement, LeafletLayerOptions } from "./types";
import { PickedFeature } from "protomaps-leaflet";
import { TileInfo } from "leaflet.offline/dist/types/src/TileManager";
export declare class VectorOfflineLayer extends L.GridLayer {
    _url: string;
    constructor(options?: LeafletLayerOptions);
    clearLayout(): void;
    createTile(coords: Coords, done: DoneCallback): HTMLCanvasElement;
    getTileUrls(bounds: Bounds, zoom: number): TileInfo[];
    renderTile(coords: Coords, element: KeyedHtmlCanvasElement, key: string, url: string, done?: () => void): Promise<void>;
    rerenderTiles(): void;
    rerenderTile(key: string): void;
    queryTileFeaturesDebug(lng: number, lat: number, brushSize?: number): Map<string, PickedFeature[]>;
    _removeTile(key: string): void;
    private _getStorageKey;
}
export declare function vectorOfflineLayer(options: LeafletLayerOptions): VectorOfflineLayer;
export {};
