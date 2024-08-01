import { GridLayerOptions, LatLngBoundsExpression } from "leaflet";
import { PMTiles } from "pmtiles";
import { LabelRule, PaintRule, SourceOptions } from "protomaps-leaflet";

export interface Status {
  status: string;
  value?: unknown;
  reason: Error;
}

export type DoneCallback = (error?: Error, tile?: HTMLElement) => void;

export type KeyedHtmlCanvasElement = HTMLCanvasElement & { key: string };

export interface LeafletLayerOptions extends GridLayerOptions {
  bounds?: LatLngBoundsExpression;
  attribution?: string;
  debug?: string;
  lang?: string;
  tileDelay?: number;
  language?: string[];
  noWrap?: boolean;
  paintRules?: PaintRule[];
  labelRules?: LabelRule[];
  tasks?: Promise<Status>[];
  maxDataZoom?: number;
  url?: PMTiles | string;
  sources?: Record<string, SourceOptions>;
  theme?: string;
  backgroundColor?: string;
}
