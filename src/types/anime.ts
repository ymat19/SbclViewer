export interface Song {
  type: string;
  trackName: string;
  lyrics?: string;
  composer?: string;
  arranger?: string;
  artist?: string;
}

export interface Anime {
  id: string;
  name: string;
  quarter: string;
  url: string;
  imageUrl?: string;
  songs: Song[];
}

export type AnimeStatus = 'watched' | 'unwatched';
export type ViewTab = 'unwatched' | 'unselected' | 'watched';
