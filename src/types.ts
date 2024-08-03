import { PMTiles } from "pmtiles";
import { LatLngBoundsExpression, TileLayerOptions } from "leaflet";
import * as protomapsLeaflet from "protomaps-leaflet";

export interface Status {
  status: string;
  value?: unknown;
  reason: Error;
}

export interface StatusFulfilled {
  status: "fulfilled";
  value: unknown;
}

export interface StatusRejected {
  status: "rejected";
  reason: Error;
}

export interface TileResponseFulfilled {
  status: "fulfilled";
  value: protomapsLeaflet.PreparedTile;
  key: string;
}

export interface TileResponseRejected {
  status: "rejected";
  reason: Error;
  key: string;
}

export type TileResponse = TileResponseFulfilled | TileResponseRejected;

export type DoneCallback = (error?: Error, tile?: HTMLElement) => void;

export type KeyedHtmlCanvasElement = HTMLCanvasElement & { key: string };

export interface VectorLayerOptions extends TileLayerOptions {
  bounds?: LatLngBoundsExpression;
  attribution?: string;
  debug?: string;
  lang?: string;
  tileDelay?: number;
  language?: string[];
  noWrap?: boolean;
  paintRules?: protomapsLeaflet.PaintRule[];
  labelRules?: protomapsLeaflet.LabelRule[];
  tasks?: Promise<Status>[];
  maxDataZoom?: number;
  url?: PMTiles | string;
  sources?: Record<string, protomapsLeaflet.SourceOptions>;
  theme?: string;
  backgroundColor?: string;
  priority?: "online" | "offline" | "both";
}
