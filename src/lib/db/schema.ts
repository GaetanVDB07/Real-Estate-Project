import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  agencyName: text("agency_name"),
  brandColor: text("brand_color").default("#1e40af"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const listings = sqliteTable("listings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  status: text("status", {
    enum: ["draft", "processing", "ready", "published"],
  })
    .notNull()
    .default("draft"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const processingJobs = sqliteTable("processing_jobs", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: [
      "queued",
      "extracting_frames",
      "running_colmap",
      "training_splat",
      "exporting",
      "post_processing",
      "ready",
      "failed",
    ],
  })
    .notNull()
    .default("queued"),
  progress: integer("progress").notNull().default(0),
  errorMessage: text("error_message"),
  videoPath: text("video_path"),
  framesPath: text("frames_path"),
  splatPath: text("splat_path"),
  settingsPath: text("settings_path"),
  posterPath: text("poster_path"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type ProcessingJob = typeof processingJobs.$inferSelect;

export type JobStatus = ProcessingJob["status"];
