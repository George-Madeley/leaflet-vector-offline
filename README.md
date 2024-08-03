# Leaflet Vector Offline

Vector tile rendering for [Leaflet](https://github.com/Leaflet/Leaflet) with
support for offline use.

[![npm](https://img.shields.io/npm/v/leaflet-vector-offline)](https://www.npmjs.com/package/leaflet-vector-offline)

## About

Based on [propmaps-leaflet](https://github.com/protomaps/protomaps-leaflet) and
[leaflet.offline](https://github.com/allartk/leaflet.offline), this packge gives
the ability to render vector tiles on a Leaflet.js map from online and offline
sources.

## Features

- Render vector tile maps with [Leaflet](https://github.com/Leaflet/Leaflet)
integration.
- Supports reading Z/X/Y tile URLs or [PMTiles format](https://github.com/protomaps/PMTiles).
- Ability to download all tiles within view port at selected zoom levels and
store them in the cache.
- Ability to choose to use on online, cache, or both tile sources.

## Dependencies

- **[leaflet](https://github.com/Leaflet/Leaflet):** ^1.9.4,
- **[protomaps-leaflet](https://github.com/protomaps/protomaps-leaflet):** ^4.0.0,
- **[pmtiles](https://github.com/protomaps/PMTiles):** ^3.0.7,
- **[leaflet.offline](https://github.com/allartk/leaflet.offline):** ^3.1.0

## How to use

To install Leaflet Vector Offline with npm, use the following command:

```cmd
npm install leaflet-vector-offline
```

or with yarn:

```cmd
yarn add leaflet-vector-offline
```

To use Leaflet Vector Offline, use the following code:

```typescript
const map: Map = L.map("map");
const url: string = "https://<YourUrlGoesHere>/{z}/{x}/{y}.mvt";
const attribution: string: "";
const vectorLayer: VectorOfflineLayer = vectorOfflineLayer(url, {
  attribution,
  subdomains: "abc",
  minZoom: minZoom,
  maxZoom: maxZoom,
  theme: "light",
});
vectorLayer.addTo(map);
```

## See

- [leaflet.offline](https://github.com/allartk/leaflet.offline),
- [protomaps-leaflet](https://github.com/protomaps/protomaps-leaflet)
