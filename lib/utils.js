"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timer = exports.reflect = void 0;
exports.getTileImageSource = getTileImageSource;
const TileManager_1 = require("leaflet.offline/dist/types/src/TileManager");
const reflect = (promise) => {
    return promise.then((v) => {
        return { status: "fulfilled", value: v };
    }, (error) => {
        return { status: "rejected", reason: error };
    });
};
exports.reflect = reflect;
const timer = (duration) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
};
exports.timer = timer;
/**
 * Fetches the tile image source from the cache if it exists, otherwise fetches
 * it from the online url.
 *
 * This method is from leaflet.offline TileManager but it is not exported.
 *
 * @param key The key of the tile
 * @param url The online url of the tile
 * @returns The url of the tile image source and boolean where if ```true```,
 * means the tile was fetched from the URL. If ```false```, tile was fetched
 * from cache.
 */
function getTileImageSource(key, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const shouldUseUrl = !(yield (0, TileManager_1.hasTile)(key));
        if (shouldUseUrl) {
            return [url, shouldUseUrl];
        }
        const blob = yield (0, TileManager_1.getBlobByKey)(key);
        return [URL.createObjectURL(blob), shouldUseUrl];
    });
}
