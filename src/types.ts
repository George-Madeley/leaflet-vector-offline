import { PMTiles } from "pmtiles";
import { GridLayerOptions, LatLngBoundsExpression } from "leaflet";
import * as protomapsLeaflet from "protomaps-leaflet";

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
  paintRules?: protomapsLeaflet.PaintRule[];
  labelRules?: protomapsLeaflet.LabelRule[];
  tasks?: Promise<Status>[];
  maxDataZoom?: number;
  url?: PMTiles | string;
  sources?: Record<string, protomapsLeaflet.SourceOptions>;
  theme?: string;
  backgroundColor?: string;
}
