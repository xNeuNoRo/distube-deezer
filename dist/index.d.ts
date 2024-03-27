import { CustomPlugin, PlayOptions, Song } from 'distube';
import { VoiceBasedChannel } from 'discord.js';

declare type DeezerPluginOptions = {
    parallel?: boolean;
    emitEventsAfterFetching?: boolean;
    maxPlaylistTrack?: number;
    songsPerRequest?: number;
    requestDelay?: number;
};
declare class DeezerPlugin extends CustomPlugin {
    parallel: boolean;
    emitEventsAfterFetching: boolean;
    maxPlaylistTrack: number;
    songsPerRequest: number;
    requestDelay: number;
    constructor(options?: DeezerPluginOptions);
    parseURL(url: string): {
        type?: string;
        id?: string;
    };
    validate(url: string): Promise<boolean>;
    play(voiceChannel: VoiceBasedChannel, url: string, options: PlayOptions): Promise<void>;
    search(query: string, metadata: any): Promise<Song<any> | null>;
}

export { DeezerPlugin, DeezerPlugin as default };
