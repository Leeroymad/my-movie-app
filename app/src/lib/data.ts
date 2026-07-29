export interface Variant {
  quality: string;
  url: string;
  sizeBytes: number;
  kind: "source" | "sim" | "transcoded" | "upscaled";
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  rating: number;
  runtime: string;
  synopsis: string;
  cast: string[];
  genre: string;
  poster: string;
  video: string;
  sizeMB: number;
  sourceKind?: "builtin" | "community";
  uploadedBy?: string;
  userId?: string | null;
  status?: "processing" | "published" | "flagged" | "unpublished";
  detected?: { quality: string; width: number; height: number; codec: string; durationSec: number };
  variants?: Variant[];
}

export const MB = 1048576;

const base: Omit<Movie, "sourceKind" | "detected" | "variants">[] = [
  {
    id: "m1",
    title: "Midnight Chronicles",
    year: 2024,
    rating: 9.2,
    runtime: "2h 14m",
    synopsis: "In a dystopian future, a lone archivist discovers a forgotten truth that could reshape humanity.",
    cast: ["Elena Voss", "Marcus Reed", "Yuki Tanaka"],
    genre: "Sci-Fi",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    sizeMB: 1840,
  },
  {
    id: "m2",
    title: "Steel Horizon",
    year: 2023,
    rating: 8.7,
    runtime: "1h 55m",
    synopsis: "A former pilot must navigate a solar storm to deliver life-saving cargo across Mars.",
    cast: ["Liam O'Neill", "Sarah Chen", "Diego Morales"],
    genre: "Action",
    poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    sizeMB: 1420,
  },
  {
    id: "m3",
    title: "The Silent Lake",
    year: 2022,
    rating: 8.3,
    runtime: "2h 02m",
    synopsis: "A detective investigates a series of disappearances around an eerie mountain lake.",
    cast: ["Anna Whitmore", "Tom Harper", "Jin Park"],
    genre: "Mystery",
    poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    sizeMB: 1680,
  },
  {
    id: "m4",
    title: "Crimson Dawn",
    year: 2024,
    rating: 9.0,
    runtime: "2h 20m",
    synopsis: "An epic saga of love and war spanning generations across a war-torn kingdom.",
    cast: ["Clara Bell", "Hugo Reed", "Rosa Diaz"],
    genre: "Drama",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    sizeMB: 2100,
  },
  {
    id: "m5",
    title: "Neon Rush",
    year: 2023,
    rating: 8.9,
    runtime: "1h 48m",
    synopsis: "In a neon-lit cybercity, a street racer challenges an underground empire.",
    cast: ["Kai Zhang", "Nina Brooks", "Derek Stone"],
    genre: "Action",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    sizeMB: 1950,
  },
  {
    id: "m6",
    title: "Echoes of Tomorrow",
    year: 2022,
    rating: 8.1,
    runtime: "2h 05m",
    synopsis: "A musician discovers a way to hear the future through sound waves.",
    cast: ["Samira Jones", "Peter Lane", "Nina Cruz"],
    genre: "Sci-Fi",
    poster: "https://images.unsplash.com/photo-1517604669402-7e4dba169fd2?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    sizeMB: 1320,
  },
  {
    id: "m7",
    title: "Shadow Veil",
    year: 2021,
    rating: 7.8,
    runtime: "1h 42m",
    synopsis: "A thief must steal back an artifact before the veil between worlds collapses.",
    cast: ["Max Reed", "Sophie Lane", "Tom Grey"],
    genre: "Fantasy",
    poster: "https://images.unsplash.com/photo-1460881680858-30dbd14df36c?w=600&q=80",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    sizeMB: 1180,
  },
];

const BUILTIN_SOURCES: Record<string, { quality: string; width: number; height: number; codec: string }> = {
  m1: { quality: "4K", width: 3840, height: 2160, codec: "H.265 / HEVC" },
  m2: { quality: "1080p", width: 1920, height: 1080, codec: "H.264 / AVC" },
  m3: { quality: "1080p", width: 1920, height: 1080, codec: "H.264 / AVC" },
  m4: { quality: "4K", width: 3840, height: 2160, codec: "H.265 / HEVC" },
  m5: { quality: "1080p", width: 1920, height: 1080, codec: "H.264 / AVC" },
  m6: { quality: "720p", width: 1280, height: 720, codec: "H.264 / AVC" },
  m7: { quality: "720p", width: 1280, height: 720, codec: "H.264 / AVC" },
};

/** Build the quality ladder for a title: everything at/below the source quality. */
export function buildVariants(videoUrl: string, sourceQuality: string, sourceBytes: number): Variant[] {
  const ladder: { quality: string; factor: number }[] = [
    { quality: "480p", factor: 0.42 },
    { quality: "720p", factor: 0.66 },
    { quality: "1080p", factor: 1 },
    { quality: "1440p", factor: 1.5 },
    { quality: "4K", factor: 2.4 },
  ];
  const sourceRank: Record<string, number> = { "SD": 240, "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160 };
  const src = sourceRank[sourceQuality] ?? 1080;
  return ladder
    .filter(l => sourceRank[l.quality] <= src)
    .map(l => ({
      quality: l.quality,
      url: videoUrl,
      sizeBytes: Math.round(l.quality === sourceQuality ? sourceBytes : sourceBytes * l.factor),
      kind: l.quality === sourceQuality ? ("source" as const) : ("sim" as const),
    }));
}

export const movies: Movie[] = base.map(m => {
  const src = BUILTIN_SOURCES[m.id] ?? { quality: "1080p", width: 1920, height: 1080, codec: "H.264 / AVC" };
  return {
    ...m,
    sourceKind: "builtin" as const,
    detected: { ...src, durationSec: 0 },
    variants: buildVariants(m.video, src.quality, m.sizeMB * MB),
  };
});
