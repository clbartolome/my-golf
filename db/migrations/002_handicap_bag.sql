-- Bolsa de palos + valoración de campo para handicap WHS

ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS course_rating NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS slope_rating SMALLINT DEFAULT 113;

CREATE TABLE IF NOT EXISTS bag_clubs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    sort_order  SMALLINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bolsa por defecto (solo si vacía)
INSERT INTO bag_clubs (name, sort_order)
SELECT name, ord FROM (VALUES
    ('Driver', 1), ('3M', 2), ('5M', 3), ('4H', 4), ('5H', 5),
    ('4I', 6), ('5I', 7), ('6I', 8), ('7I', 9), ('8I', 10),
    ('9I', 11), ('PW', 12), ('GW', 13), ('SW', 14), ('LW', 15), ('Putter', 16)
) AS t(name, ord)
WHERE NOT EXISTS (SELECT 1 FROM bag_clubs LIMIT 1);
