export interface Novel {
  id: string;
  title: string;
  type?: string;
  authorId: string;
  createdAt: any;
  updatedAt: any;
  universe: string;
  notes: string;
  description?: string;
  coverColor?: string;
  coverEmoji?: string;
  coverImageUrl?: string;
  pinCode?: string;
  genre?: string;
  settings?: {
    fontFamily?: string;
    fontSize?: number;
    lineSpacing?: number;
    backgroundType?: 'color' | 'image';
    backgroundColor?: string;
    backgroundImageUrl?: string;
    lineStyle?: string;
    themeId?: string;
    updatedAt?: number;
  };
}

export interface Idea {
  id: string;
  content: string;
  createdAt: any;
}

export interface Plot {
  id: string;
  content: string;
  type?: 'default' | 'character' | 'event' | 'note';
  position?: { x: number; y: number };
  connectedTo?: string[];
  createdAt: any;
}

export interface Character {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  age?: string;
  educationLevel?: string;
  profession?: string;
  hobbies?: string;
  personality?: string;
  physical?: string;
  firstAppearance?: string;
  situation?: string;
  description: string;
  profileImageUrl?: string;
  galleryImageUrls?: string[];
  styleImageUrls?: string[];
  physicalImageUrls?: string[];
  role: 'Main' | 'Secondary' | 'Minor';
  otherFeatures?: string;
  createdAt: any;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  createdAt: any;
}

export interface Part {
  id: string;
  title: string;
  order: number;
  createdAt: any;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  partId?: string;
  type?: 'story' | 'summary' | 'appendix' | 'index' | 'preface' | 'afterword' | 'prologue' | 'interlude' | 'epilogue';
  createdAt: any;
  updatedAt: any;
}

export interface WritingStat {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  breakdown?: {
    manuscrit?: number;
    perso_principaux?: number;
    lieux?: number;
    organigramme?: number;
    notes_idees?: number;
    settings?: number;
  };
  dominantActivity?: ViewType;
}

export type ViewType = 
  | 'projet' 
  | 'manuscrit'
  | 'perso_principaux' 
  | 'perso_secondaires' 
  | 'lieux'
  | 'notes_idees'
  | 'organigramme'
  | 'notes_generales'
  | 'settings'
  | 'stats_details'
  | 'publication'
  | 'oracle'
  | 'structure';
