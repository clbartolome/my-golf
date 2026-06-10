-- Separa lie (result) de línea del tiro (miss_line)

CREATE TYPE shot_miss_line AS ENUM ('on_target', 'short', 'long', 'left', 'right');

ALTER TABLE shots ADD COLUMN IF NOT EXISTS miss_line shot_miss_line;

-- Migrar datos legacy: miss_* y rough_* → lie + línea
UPDATE shots SET miss_line = 'short', result = CASE
    WHEN club ILIKE '%putter%' OR club ILIKE '%putt%' THEN 'green'::shot_result
    ELSE 'rough'::shot_result
END WHERE result = 'miss_short';

UPDATE shots SET miss_line = 'long', result = CASE
    WHEN club ILIKE '%putter%' OR club ILIKE '%putt%' THEN 'green'::shot_result
    ELSE 'rough'::shot_result
END WHERE result = 'miss_long';

UPDATE shots SET miss_line = 'left', result = CASE
    WHEN club ILIKE '%putter%' OR club ILIKE '%putt%' THEN 'green'::shot_result
    ELSE 'rough'::shot_result
END WHERE result = 'miss_left';

UPDATE shots SET miss_line = 'right', result = CASE
    WHEN club ILIKE '%putter%' OR club ILIKE '%putt%' THEN 'green'::shot_result
    ELSE 'rough'::shot_result
END WHERE result = 'miss_right';

UPDATE shots SET miss_line = 'left', result = 'rough' WHERE result = 'rough_left';
UPDATE shots SET miss_line = 'right', result = 'rough' WHERE result = 'rough_right';

UPDATE shots SET miss_line = 'on_target'
WHERE miss_line IS NULL
  AND result IN ('fairway', 'green', 'fringe', 'holed', 'rough', 'bunker', 'recovery');
