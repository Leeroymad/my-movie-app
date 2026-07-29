import { pgTable, text, integer, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";

export interface VariantRow {
  quality: string;
  url: string;
  sizeBytes: number;
  kind: "source" | "sim" | "transcoded" | "upscaled";
}

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default("Member"),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  resetCode: text("reset_code"),
  resetExpires: timestamp("reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  kind: text("kind").notNull().default("system"), // welcome | processing | alert | system
  status: text("status").notNull().default("unread"), // unread | read
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: text("id").primaryKey(),
  movieId: text("movie_id").notNull(),
  userId: text("user_id"),
  status: text("status").notNull().default("queued"), // queued | analyzing | transcoding | upscaling | packaging | done | failed
  stage: text("stage").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  sourceQuality: text("source_quality").notNull().default("SD"),
  targets: jsonb("targets").$type<string[]>().notNull().default([]),
  log: jsonb("log").$type<string[]>().notNull().default([]),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publishedMovies = pgTable("published_movies", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  synopsis: text("synopsis").notNull().default(""),
  genre: text("genre").notNull().default("Indie"),
  cast: jsonb("cast").$type<string[]>().notNull().default([]),
  year: integer("year").notNull().default(2026),
  runtime: text("runtime").notNull().default(""),
  poster: text("poster").notNull(),
  uploadedBy: text("uploaded_by").notNull().default("Anonymous"),
  userId: text("user_id"),
  status: text("status").notNull().default("published"), // processing | published | flagged | unpublished
  videoFile: text("video_file").notNull(),
  ext: text("ext").notNull().default("mp4"),
  srcWidth: integer("src_width").notNull().default(0),
  srcHeight: integer("src_height").notNull().default(0),
  durationSec: numeric("duration_sec").notNull().default("0"),
  codec: text("codec").notNull().default("video/mp4"),
  srcSizeBytes: numeric("src_size_bytes").notNull().default("0"),
  detectedQuality: text("detected_quality").notNull().default("SD"),
  variants: jsonb("variants").$type<VariantRow[]>().notNull().default([]),
  rating: numeric("rating").notNull().default("7.5"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
