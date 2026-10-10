import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), username: text('username').notNull().unique(), name: text('name').notNull(),
  password: text('password').notNull(), role: text('role').notNull(), created: integer('created').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(), userId: text('user_id').notNull().references(() => users.id), expires: integer('expires').notNull(),
});
export const levels = sqliteTable('levels', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), sequence: integer('sequence').notNull(),
  draft: text('draft').notNull(), published: integer('published').notNull().default(0), updated: integer('updated').notNull(),
}, t => [uniqueIndex('levels_kind_sequence').on(t.kind, t.sequence)]);
export const versions = sqliteTable('versions', {
  id: text('id').primaryKey(), levelId: text('level_id').notNull().references(() => levels.id),
  number: integer('number').notNull(), data: text('data').notNull(), created: integer('created').notNull(),
}, t => [uniqueIndex('versions_level_number').on(t.levelId, t.number)]);
export const attempts = sqliteTable('attempts', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  levelId: text('level_id').notNull().references(() => levels.id), versionId: text('version_id').notNull().references(() => versions.id),
  started: integer('started').notNull(), deadline: integer('deadline'), ended: integer('ended'),
  status: text('status').notNull().default('active'), entries: text('entries').notNull().default('{}'),
  hints: text('hints').notNull().default('[]'), revision: integer('revision').notNull().default(0),
});
export const completions = sqliteTable('completions', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  levelId: text('level_id').notNull().references(() => levels.id), created: integer('created').notNull(),
}, t => [uniqueIndex('completions_user_level').on(t.userId, t.levelId)]);
export const loginLimits = sqliteTable('login_limits', {
  key: text('key').primaryKey(), failures: integer('failures').notNull(), until: integer('until').notNull(),
});
