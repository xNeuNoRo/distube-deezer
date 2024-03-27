import { getAlbum, getPlaylist, getTrack } from "./API";
import { CustomPlugin, DisTubeError, Playlist, Song, checkInvalidKey } from "distube";
import type { VoiceBasedChannel } from "discord.js";
import type { PlayOptions, PlaylistInfo, Queue } from "distube";
import bluebird from "bluebird";

const SUPPORTED_TYPES = ["album", "playlist", "track"];

const REGEX = /^https?:\/\/(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)\/?(?:\?.*?)?$/;

type Falsy = undefined | null | false | 0 | "";
const isTruthy = <T>(x: T | Falsy): x is T => Boolean(x);

declare type DeezerPluginOptions = {
  parallel?: boolean;
  emitEventsAfterFetching?: boolean;
  maxPlaylistTrack?: number;
  songsPerRequest?: number;
  requestDelay?: number;
};

export class DeezerPlugin extends CustomPlugin {
  parallel: boolean;
  emitEventsAfterFetching: boolean;
  maxPlaylistTrack: number;
  songsPerRequest: number;
  requestDelay: number;
  constructor(options: DeezerPluginOptions = {}) {
    super();
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new DisTubeError("INVALID_TYPE", ["object", "undefined"], options, "DeezerPluginOptions");
    }
    checkInvalidKey(
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
      throw new DisTubeError("INVALID_TYPE", "boolean", this.parallel, "DeezerPluginOptions.parallel");
    }
    this.emitEventsAfterFetching = options.emitEventsAfterFetching ?? false;
    if (typeof this.emitEventsAfterFetching !== "boolean") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "boolean",
        this.emitEventsAfterFetching,
        "DeezerPluginOptions.emitEventsAfterFetching",
      );
    }
    this.maxPlaylistTrack = options.maxPlaylistTrack ?? 200;
    if (typeof this.maxPlaylistTrack !== "number") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "number",
        this.maxPlaylistTrack,
        "DeezerPluginOptions.maxPlaylistTrack"
        );
    } else if (this.maxPlaylistTrack <= 0) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.maxPlaylistTrack,
        "DeezerPluginOptions.maxPlaylistTrack"
        );
    } else if (this.maxPlaylistTrack >= 10000) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "less than 10000",
        this.maxPlaylistTrack,
        "DeezerPluginOptions.maxPlaylistTrack"
        );
    }
    this.songsPerRequest = options.songsPerRequest ?? 10;
    if (typeof this.songsPerRequest !== "number") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "number",
        this.songsPerRequest,
        "DeezerPluginOptions.songsPerRequest"
      );
    } else if (this.songsPerRequest <= 0) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.songsPerRequest,
        "DeezerPluginOptions.songsPerRequest"
      );
    }
    this.requestDelay = options.requestDelay ?? 1000;
    if (typeof this.requestDelay !== "number") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "number",
        this.requestDelay,
        "DeezerPluginOptions.requestDelay"
      );
    } else if (this.requestDelay <= 100) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "more than 100ms",
        this.requestDelay,
        "DeezerPluginOptions.requestDelay"
      );
    }
  }

  parseURL(url: string): { type?: string; id?: string } {
    const [, type, id] = url.match(REGEX) ?? [];
    return { type, id };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  override async validate(url: string) {
    if (typeof url !== "string" || !url.includes("deezer")) return false;
    const { type, id } = this.parseURL(url);
    if (!type || !id || !SUPPORTED_TYPES.includes(type)) return false;
    return true;
  }

  async play(voiceChannel: VoiceBasedChannel, url: string, options: PlayOptions) {
    const DT = this.distube;
    const { member, textChannel, skip, position, metadata } = Object.assign({ position: 0 }, options);
    const { type, id } = this.parseURL(url);
    if (!type || !id) {
      throw new DisTubeError("DEEZER_PLUGIN_INVALID_URL", `Invalid Deezer url: ${url}`);
    }
    const api = type === "track" ? getTrack(id) : type === "album" ? getAlbum(id) : getPlaylist(id);
    const data = await api.catch(e => {
      throw new DisTubeError("DEEZER_PLUGIN_API_ERROR", e.message);
    });
    if (!data.type || !SUPPORTED_TYPES.includes(data.type)) {
      throw new DisTubeError("DEEZER_PLUGIN_NOT_SUPPORTED", "This deezer link is not supported.");
    }
    if (data.type === "track") {
      const query = `${data.title} ${data.contributors.map((a: any) => a.name).join(" ")}`;
      const result = await this.search(query, metadata);
      if (!result) throw new DisTubeError("DEEZER_PLUGIN_NO_RESULT", `Cannot find "${query}" on YouTube.`);
      result.member = member;
      await DT.play(voiceChannel, result, options);
    } else {
      const name = data.title;
      const thumbnail =
        data.type == "album"
          ? data.cover_xl || data.cover_big || data.cover_medium || data.cover
          : data.picture_xl || data.picture_big || data.picture_medium || data.picture;
      const queries: string[] = data.tracks.data
       .slice(0, this.maxPlaylistTrack)
       .map((t: any) => `${t.title} ${t.artist.name}`);
      const url = data.link;
      let firstSong: Song | undefined;
      const getFirstSong = async () => {
        const firstQuery = queries.shift();
        if (!firstQuery) return;
        const result = await this.search(firstQuery, metadata);
        if (!result) return;
        result.member = member;
        firstSong = result;
      };
      while (!firstSong) {
        await getFirstSong();
      }

      if (!firstSong) {
        throw new DisTubeError("DEEZER_PLUGIN_NO_RESULT", `Cannot find any tracks of "${name}" on YouTube.`);
      }
      const queue = DT.getQueue(voiceChannel);

      const playlistInfo: PlaylistInfo = {
        source: "deezer",
        songs: [firstSong],
        name,
        thumbnail,
        member,
        url,
      };
      const playlist = new Playlist(playlistInfo, { member, metadata });
      let newQueueCreated;
      const fetchTheRest = async (q: Queue, fs: Song) => {
        if (queries.length) {
          const results: (Song | null)[] = [];
          const query_success = new Set();
          if (this.parallel) {
            //results = await Promise.all(queries.map(query => this.search(query, metadata)));
            interface CacheItem {
              url_result?: any;
              initial_index?: any;
            }

            const cache: CacheItem[] = [];
            const batchResults: any[] = [];
            const tmp_songs = new Set();
            const unique_urls = new Set();
            let batchCounter = 0;
            let totalProcessed = 0;
            //let initialTime = new Date();

            // NEW METHOD
            await bluebird.map(queries, async (query: any, index: any) => {
              const search_result = await this.search(query, metadata);
              totalProcessed++;
              if (!search_result) return bluebird.delay(this.requestDelay);
              results.push(search_result);
              batchResults.push(search_result);
              tmp_songs.add(search_result.url);
              query_success.add(search_result.url);
              batchCounter++;

              if (batchCounter === this.songsPerRequest || totalProcessed === queries.length) {
                batchCounter = 0;

                const songsToAdd = batchResults
                 .filter(x => isTruthy(x) && tmp_songs.has(x.url))
                 .filter(song => {
                  if (unique_urls.has(song.url)) {
                    return false;
                  } else {
                    unique_urls.add(song.url);
                    return true;
                  }
                })
                 .map(r => {
                  const s = new Song(r, { member, metadata });
                  s.playlist = playlist;
                  return s;
                });

                const queue_check = DT.getQueue(voiceChannel);
                if (queue_check) await q.addToQueue(songsToAdd, !skip && position > 0 ? position + 1 : position);
                else q = await DT.queues.create(voiceChannel, songsToAdd, textChannel) as Queue, newQueueCreated = q;

                batchResults.splice(0, batchResults.length);
                tmp_songs.clear();
              }

              cache.push({ url_result: search_result.url, initial_index: index });
              return bluebird.delay(this.requestDelay);
            }, { concurrency: this.songsPerRequest });

            results.sort((a: any, b: any) => {
              const indexA = cache.findIndex(item => item.url_result === a.url);
              const indexB = cache.findIndex(item => item.url_result === b.url);
              return cache[indexA].initial_index - cache[indexB].initial_index;
            });
          } else {
            for (let i = 0; i < queries.length; i++) {
              results[i] = await this.search(queries[i], metadata);
            }
          }

          playlist.songs = results.filter(isTruthy).map(s => {
            s.member = member;
            s.playlist = playlist;
            return s;
          });

          const queue_check = DT.getQueue(voiceChannel);
          if (queue_check) {
            q.songs.sort((a: any, b: any) => 
             playlist.songs.findIndex((ps: any) => ps.url === a.url) - 
             playlist.songs.findIndex((ps: any) => ps.url === b.url)
            );

            if (playlist.songs.filter((s: any) => !query_success.has(s.url)).length) {
              q.addToQueue(
                playlist.songs.filter((s: any) => 
                 !query_success.has(s.url)), !skip && position > 0 ? position + 1 : position
                );
            }
          } else {
            q = await DT.queues.create(voiceChannel, playlist.songs, textChannel) as Queue, 
            newQueueCreated = q;
          }
        }
        playlist.songs.unshift(fs);
      };
      if (queue) {
        queue.addToQueue(firstSong, position);
        if (skip) queue.skip();
        else if (!this.emitEventsAfterFetching) DT.emit("addList", queue, playlist);
        await fetchTheRest(queue, firstSong);
        if (!skip && this.emitEventsAfterFetching) DT.emit("addList", queue, playlist);
        if (newQueueCreated) DT.emit("playSong", newQueueCreated, playlist.songs[1]);
      } else {
        let newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        while (newQueue === true) {
          await getFirstSong();
          newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        }
        DT.emit("playSong", newQueue, firstSong);
        if (!this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue) DT.emit("addList", newQueue, playlist);
          //DT.emit("playSong", newQueue, firstSong);
          if (newQueueCreated) DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
        await fetchTheRest(newQueue, firstSong);
        if (this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue) DT.emit("addList", newQueue, playlist);
          //DT.emit("playSong", newQueue, firstSong);
          if (newQueueCreated) DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
      }
    }
  }

  async search(query: string, metadata: any) {
    try {
      return new Song((await this.distube.search(query, { limit: 1 }))[0], { metadata });
    } catch {
      return null;
    }
  }
}

export default DeezerPlugin;
