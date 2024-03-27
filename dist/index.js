"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DeezerPlugin: () => DeezerPlugin,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/API.ts
var import_undici = require("undici");
var api = new import_undici.Pool("https://api.deezer.com");
var get = /* @__PURE__ */ __name(async (path) => {
  const { body } = await api.request({
    path,
    method: "GET"
  });
  const data = await body.json();
  if (data.error)
    throw new Error(data.error?.message);
  return data;
}, "get");
var getTrack = /* @__PURE__ */ __name(async (id) => get(`/track/${id}`), "getTrack");
var getAlbum = /* @__PURE__ */ __name(async (id) => get(`/album/${id}`), "getAlbum");
var getPlaylist = /* @__PURE__ */ __name(async (id) => get(`/playlist/${id}`), "getPlaylist");

// src/index.ts
var import_distube = require("distube");
var import_bluebird = __toESM(require("bluebird"));
var SUPPORTED_TYPES = ["album", "playlist", "track"];
var REGEX = /^https?:\/\/(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)\/?(?:\?.*?)?$/;
var isTruthy = /* @__PURE__ */ __name((x) => Boolean(x), "isTruthy");
var _DeezerPlugin = class _DeezerPlugin extends import_distube.CustomPlugin {
  constructor(options = {}) {
    super();
    __publicField(this, "parallel");
    __publicField(this, "emitEventsAfterFetching");
    __publicField(this, "maxPlaylistTrack");
    __publicField(this, "songsPerRequest");
    __publicField(this, "requestDelay");
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new import_distube.DisTubeError("INVALID_TYPE", ["object", "undefined"], options, "DeezerPluginOptions");
    }
    (0, import_distube.checkInvalidKey)(
      options,
      [
        "parallel",
        "emitEventsAfterFetching",
        "maxPlaylistTrack",
        "songsPerRequest",
        "requestDelay"
      ],
      "DeezerPluginOptions"
    );
    this.parallel = options.parallel ?? true;
    if (typeof this.parallel !== "boolean") {
      throw new import_distube.DisTubeError("INVALID_TYPE", "boolean", this.parallel, "DeezerPluginOptions.parallel");
    }
    this.emitEventsAfterFetching = options.emitEventsAfterFetching ?? false;
    if (typeof this.emitEventsAfterFetching !== "boolean") {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "boolean",
        this.emitEventsAfterFetching,
        "DeezerPluginOptions.emitEventsAfterFetching"
      );
    }
    this.maxPlaylistTrack = options.maxPlaylistTrack ?? 200;
    if (typeof this.maxPlaylistTrack !== "number") {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "number",
        this.maxPlaylistTrack,
        "DeezerPluginOptions.maxPlaylistTrack"
      );
    } else if (this.maxPlaylistTrack <= 0) {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.maxPlaylistTrack,
        "DeezerPluginOptions.maxPlaylistTrack"
      );
    } else if (this.maxPlaylistTrack >= 1e4) {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "less than 10000",
        this.maxPlaylistTrack,
        "DeezerPluginOptions.maxPlaylistTrack"
      );
    }
    this.songsPerRequest = options.songsPerRequest ?? 10;
    if (typeof this.songsPerRequest !== "number") {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "number",
        this.songsPerRequest,
        "DeezerPluginOptions.songsPerRequest"
      );
    } else if (this.songsPerRequest <= 0) {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.songsPerRequest,
        "DeezerPluginOptions.songsPerRequest"
      );
    }
    this.requestDelay = options.requestDelay ?? 1e3;
    if (typeof this.requestDelay !== "number") {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "number",
        this.requestDelay,
        "DeezerPluginOptions.requestDelay"
      );
    } else if (this.requestDelay <= 100) {
      throw new import_distube.DisTubeError(
        "INVALID_TYPE",
        "more than 100ms",
        this.requestDelay,
        "DeezerPluginOptions.requestDelay"
      );
    }
  }
  parseURL(url) {
    const [, type, id] = url.match(REGEX) ?? [];
    return { type, id };
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(url) {
    if (typeof url !== "string" || !url.includes("deezer"))
      return false;
    const { type, id } = this.parseURL(url);
    if (!type || !id || !SUPPORTED_TYPES.includes(type))
      return false;
    return true;
  }
  async play(voiceChannel, url, options) {
    const DT = this.distube;
    const { member, textChannel, skip, position, metadata } = Object.assign({ position: 0 }, options);
    const { type, id } = this.parseURL(url);
    if (!type || !id) {
      throw new import_distube.DisTubeError("DEEZER_PLUGIN_INVALID_URL", `Invalid Deezer url: ${url}`);
    }
    const api2 = type === "track" ? getTrack(id) : type === "album" ? getAlbum(id) : getPlaylist(id);
    const data = await api2.catch((e) => {
      throw new import_distube.DisTubeError("DEEZER_PLUGIN_API_ERROR", e.message);
    });
    if (!data.type || !SUPPORTED_TYPES.includes(data.type)) {
      throw new import_distube.DisTubeError("DEEZER_PLUGIN_NOT_SUPPORTED", "This deezer link is not supported.");
    }
    if (data.type === "track") {
      const query = `${data.title} ${data.contributors.map((a) => a.name).join(" ")}`;
      const result = await this.search(query, metadata);
      if (!result)
        throw new import_distube.DisTubeError("DEEZER_PLUGIN_NO_RESULT", `Cannot find "${query}" on YouTube.`);
      result.member = member;
      await DT.play(voiceChannel, result, options);
    } else {
      const name = data.title;
      const thumbnail = data.type == "album" ? data.cover_xl || data.cover_big || data.cover_medium || data.cover : data.picture_xl || data.picture_big || data.picture_medium || data.picture;
      const queries = data.tracks.data.slice(0, this.maxPlaylistTrack).map((t) => `${t.title} ${t.artist.name}`);
      const url2 = data.link;
      let firstSong;
      const getFirstSong = /* @__PURE__ */ __name(async () => {
        const firstQuery = queries.shift();
        if (!firstQuery)
          return;
        const result = await this.search(firstQuery, metadata);
        if (!result)
          return;
        result.member = member;
        firstSong = result;
      }, "getFirstSong");
      while (!firstSong) {
        await getFirstSong();
      }
      if (!firstSong) {
        throw new import_distube.DisTubeError("DEEZER_PLUGIN_NO_RESULT", `Cannot find any tracks of "${name}" on YouTube.`);
      }
      const queue = DT.getQueue(voiceChannel);
      const playlistInfo = {
        source: "deezer",
        songs: [firstSong],
        name,
        thumbnail,
        member,
        url: url2
      };
      const playlist = new import_distube.Playlist(playlistInfo, { member, metadata });
      let newQueueCreated;
      const fetchTheRest = /* @__PURE__ */ __name(async (q, fs) => {
        if (queries.length) {
          const results = [];
          const query_success = /* @__PURE__ */ new Set();
          if (this.parallel) {
            const cache = [];
            const batchResults = [];
            const tmp_songs = /* @__PURE__ */ new Set();
            const unique_urls = /* @__PURE__ */ new Set();
            let batchCounter = 0;
            let totalProcessed = 0;
            await import_bluebird.default.map(queries, async (query, index) => {
              const search_result = await this.search(query, metadata);
              totalProcessed++;
              if (!search_result)
                return import_bluebird.default.delay(this.requestDelay);
              results.push(search_result);
              batchResults.push(search_result);
              tmp_songs.add(search_result.url);
              query_success.add(search_result.url);
              batchCounter++;
              if (batchCounter === this.songsPerRequest || totalProcessed === queries.length) {
                batchCounter = 0;
                const songsToAdd = batchResults.filter((x) => isTruthy(x) && tmp_songs.has(x.url)).filter((song) => {
                  if (unique_urls.has(song.url)) {
                    return false;
                  } else {
                    unique_urls.add(song.url);
                    return true;
                  }
                }).map((r) => {
                  const s = new import_distube.Song(r, { member, metadata });
                  s.playlist = playlist;
                  return s;
                });
                const queue_check2 = DT.getQueue(voiceChannel);
                if (queue_check2)
                  await q.addToQueue(songsToAdd, !skip && position > 0 ? position + 1 : position);
                else
                  q = await DT.queues.create(voiceChannel, songsToAdd, textChannel), newQueueCreated = q;
                batchResults.splice(0, batchResults.length);
                tmp_songs.clear();
              }
              cache.push({ url_result: search_result.url, initial_index: index });
              return import_bluebird.default.delay(this.requestDelay);
            }, { concurrency: this.songsPerRequest });
            results.sort((a, b) => {
              const indexA = cache.findIndex((item) => item.url_result === a.url);
              const indexB = cache.findIndex((item) => item.url_result === b.url);
              return cache[indexA].initial_index - cache[indexB].initial_index;
            });
          } else {
            for (let i = 0; i < queries.length; i++) {
              results[i] = await this.search(queries[i], metadata);
            }
          }
          playlist.songs = results.filter(isTruthy).map((s) => {
            s.member = member;
            s.playlist = playlist;
            return s;
          });
          const queue_check = DT.getQueue(voiceChannel);
          if (queue_check) {
            q.songs.sort(
              (a, b) => playlist.songs.findIndex((ps) => ps.url === a.url) - playlist.songs.findIndex((ps) => ps.url === b.url)
            );
            if (playlist.songs.filter((s) => !query_success.has(s.url)).length) {
              q.addToQueue(
                playlist.songs.filter((s) => !query_success.has(s.url)),
                !skip && position > 0 ? position + 1 : position
              );
            }
          } else {
            q = await DT.queues.create(voiceChannel, playlist.songs, textChannel), newQueueCreated = q;
          }
        }
        playlist.songs.unshift(fs);
      }, "fetchTheRest");
      if (queue) {
        queue.addToQueue(firstSong, position);
        if (skip)
          queue.skip();
        else if (!this.emitEventsAfterFetching)
          DT.emit("addList", queue, playlist);
        await fetchTheRest(queue, firstSong);
        if (!skip && this.emitEventsAfterFetching)
          DT.emit("addList", queue, playlist);
        if (newQueueCreated)
          DT.emit("playSong", newQueueCreated, playlist.songs[1]);
      } else {
        let newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        while (newQueue === true) {
          await getFirstSong();
          newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        }
        DT.emit("playSong", newQueue, firstSong);
        if (!this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue)
            DT.emit("addList", newQueue, playlist);
          if (newQueueCreated)
            DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
        await fetchTheRest(newQueue, firstSong);
        if (this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue)
            DT.emit("addList", newQueue, playlist);
          if (newQueueCreated)
            DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
      }
    }
  }
  async search(query, metadata) {
    try {
      return new import_distube.Song((await this.distube.search(query, { limit: 1 }))[0], { metadata });
    } catch {
      return null;
    }
  }
};
__name(_DeezerPlugin, "DeezerPlugin");
var DeezerPlugin = _DeezerPlugin;
var src_default = DeezerPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DeezerPlugin
});
//# sourceMappingURL=index.js.map