# Bolt's Journal

## 2026-02-02 - [Initial Setup]
**Learning:** Initializing Bolt's performance journal.
**Action:** Use this file to document critical performance learnings.

## 2026-02-02 - [Angular Template Performance]
**Learning:** Found O(N*M) filtering logic inside template loops (calling method with filter()).
**Action:** Use computed signals to pre-group data into Maps for O(1) lookup in templates.

## 2026-02-03 - [Zoneless & Scroll Events]
**Learning:** Even with Zoneless Change Detection, Angular wraps event bindings like `(scroll)` to trigger scheduler ticks. For high-frequency events that don't update signals (like syncing scroll positions), this is unnecessary overhead.
**Action:** Use manual `addEventListener` with `passive: true` in `ngAfterViewInit` for scroll synchronization, bypassing Angular's event wrapping.

## 2026-02-04 - [Prisma Foreign Key Indexes]
**Learning:** Prisma (and most relational DBs) does not automatically index foreign keys, leading to O(N) lookups for simple relations.
**Action:** Explicitly add `@@index([foreignKeyId])` in `schema.prisma` for all relation fields used in filters or joins.

## 2026-02-05 - [Prisma SQLite Case-Insensitivity]
**Learning:** Prisma's `mode: 'insensitive'` is not supported for SQLite. Previous code fetched ALL records (O(N)) to filter by email in JS.
**Action:** Use `prisma.$queryRaw` with `LOWER(col) = LOWER(?)` and `LIMIT 1` for auth lookups. Ensure `@@index` exists on the column. Note that `$queryRaw` returns integers (0/1) for SQLite booleans, requiring manual casting.
