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

export type ThemeName = "light" | "dark" | "white" | "grayscale" | "black";

export type TileSourcePriority = "online" | "offline" | "both";

export interface VectorLayerOptions extends TileLayerOptions {
  attribution?: string;
  backgroundColor?: string;
  bounds?: LatLngBoundsExpression;
  debug?: string;
  labelRules?: protomapsLeaflet.LabelRule[];
  lang?: string;
  language?: string[];
  maxDataZoom?: number;
  noWrap?: boolean;
  paintRules?: protomapsLeaflet.PaintRule[];
  priority?: TileSourcePriority;
  sources?: Record<string, protomapsLeaflet.SourceOptions>;
  tasks?: Promise<Status>[];
  theme?: ThemeName;
  tileDelay?: number;
  url?: PMTiles | string;
  verbose?: boolean;
}
