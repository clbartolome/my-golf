-- My Golf — esquema inicial
-- PostgreSQL 16+
--
-- Modelo: solo datos que introduces tú (sin catálogo de campos).
-- Unidad: metros (m) en todo el recorrido del hoyo.

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------

CREATE TYPE round_status AS ENUM ('in_progress', 'completed');

CREATE TYPE distance_unit AS ENUM ('m', 'yds', 'ft');

CREATE TYPE shot_type AS ENUM ('normal', 'penalty');

CREATE TYPE penalty_reason AS ENUM ('ob', 'water', 'lost', 'unplayable');

-- Resultado / lie tras el golpe.
CREATE TYPE shot_result AS ENUM (
    'fairway',
    'rough',
    'rough_left',
    'rough_right',
    'bunker',
    'green',
    'fringe',
    'miss_short',
    'miss_long',
    'miss_left',
    'miss_right',
    'water',
    'ob',
    'lost',
    'unplayable',
    'recovery',
    'holed'
);

-- Línea del tiro respecto a la línea de juego (independiente del lie).
CREATE TYPE shot_miss_line AS ENUM ('on_target', 'short', 'long', 'left', 'right');

-- ---------------------------------------------------------------------------
-- Rondas
-- ---------------------------------------------------------------------------

CREATE TABLE rounds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name     TEXT NOT NULL,              -- texto libre; agrupa stats por "campo"
    tees            TEXT,                       -- ej. 'yellow', 'white' (chips en UI)
    wind            TEXT,                       -- ej. 'calm', 'light', 'strong'
    planned_holes   SMALLINT NOT NULL CHECK (planned_holes IN (9, 18)),
    played_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          round_status NOT NULL DEFAULT 'in_progress',
    notes           TEXT,
    course_rating   NUMERIC(4, 1),              -- valoración oficial; si null → suma de par
    slope_rating    SMALLINT DEFAULT 113,     -- slope del tee (WHS); default estándar
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE rounds IS 'Una salida al campo. Sin catálogo externo de campos.';
COMMENT ON COLUMN rounds.course_name IS 'Nombre del campo tal como lo introduces; solo para filtrar estadísticas.';

-- ---------------------------------------------------------------------------
-- Hoyos jugados (par y distancia inicial los introduces al empezar cada hoyo)
-- ---------------------------------------------------------------------------

CREATE TABLE holes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id            UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    hole_number         SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    par                 SMALLINT NOT NULL CHECK (par BETWEEN 3 AND 6),
    starting_distance   NUMERIC(6, 1) NOT NULL CHECK (starting_distance > 0),
    starting_unit       distance_unit NOT NULL DEFAULT 'm',
    completed           BOOLEAN NOT NULL DEFAULT false,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (round_id, hole_number)
);

COMMENT ON TABLE holes IS 'Hoyo dentro de una ronda. Par y distancia desde tee los introduces al iniciar.';
COMMENT ON COLUMN holes.starting_distance IS 'Distancia al hoyo desde el tee al empezar; distancia_antes del golpe 1.';

-- ---------------------------------------------------------------------------
-- Golpes (normales y penalizaciones)
-- ---------------------------------------------------------------------------

CREATE TABLE shots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hole_id             UUID NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
    stroke_number       SMALLINT NOT NULL CHECK (stroke_number >= 1),
    shot_type           shot_type NOT NULL DEFAULT 'normal',

    -- Solo golpes normales
    club                TEXT,
    distance_before     NUMERIC(6, 1) CHECK (distance_before IS NULL OR distance_before >= 0),
    distance_after      NUMERIC(6, 1) CHECK (distance_after IS NULL OR distance_after >= 0),
    distance_unit       distance_unit,
    result              shot_result,
    miss_line           shot_miss_line,

    -- Solo shot_type = 'penalty'
    penalty_reason      penalty_reason,

    -- Si true, no entra en stats de distancia por palo (OB, agua sin distancia útil, etc.)
    exclude_from_stats  BOOLEAN NOT NULL DEFAULT false,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (hole_id, stroke_number),

    CONSTRAINT shots_penalty_fields CHECK (
        (shot_type = 'penalty' AND penalty_reason IS NOT NULL
         AND club IS NULL AND distance_before IS NULL AND distance_after IS NULL
         AND distance_unit IS NULL AND result IS NULL)
        OR
        (shot_type = 'normal' AND penalty_reason IS NULL
         AND club IS NOT NULL AND distance_unit IS NOT NULL AND result IS NOT NULL)
    ),

    CONSTRAINT shots_normal_distances CHECK (
        shot_type = 'penalty'
        OR (distance_before IS NOT NULL)
        -- distance_after puede ser NULL en OB/perdida antes de resolver penalización
    )
);

COMMENT ON TABLE shots IS 'Secuencia de golpes y penalizaciones de un hoyo.';
COMMENT ON COLUMN shots.distance_before IS 'Explícita siempre en golpes normales. Tras rejuego = misma que el golpe fallido; tras drop = la que introduces.';
COMMENT ON COLUMN shots.stroke_number IS 'Orden en el hoyo; incluye filas de penalización (+1 al score).';

-- ---------------------------------------------------------------------------
-- Bolsa de palos (un solo jugador)
-- ---------------------------------------------------------------------------

CREATE TABLE bag_clubs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    sort_order  SMALLINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_rounds_played_at ON rounds (played_at DESC);
CREATE INDEX idx_rounds_course_name ON rounds (course_name);
CREATE INDEX idx_rounds_status ON rounds (status);

CREATE INDEX idx_holes_round_id ON holes (round_id);

CREATE INDEX idx_shots_hole_id ON shots (hole_id);
CREATE INDEX idx_shots_club ON shots (club) WHERE shot_type = 'normal' AND NOT exclude_from_stats;

-- ---------------------------------------------------------------------------
-- updated_at automático en rounds
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rounds_updated_at
    BEFORE UPDATE ON rounds
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Vistas útiles para estadísticas (derivadas; no hay que rellenarlas a mano)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_hole_scores AS
SELECT
    h.id AS hole_id,
    h.round_id,
    h.hole_number,
    h.par,
    h.completed,
    COUNT(s.id)::SMALLINT AS strokes,
    (COUNT(s.id)::SMALLINT - h.par) AS score_vs_par
FROM holes h
LEFT JOIN shots s ON s.hole_id = h.id
WHERE h.completed
GROUP BY h.id;

COMMENT ON VIEW v_hole_scores IS 'Score bruto por hoyo = todos los golpes + penalizaciones.';

CREATE OR REPLACE VIEW v_shot_distances AS
SELECT
    s.id AS shot_id,
    s.hole_id,
    h.round_id,
    s.stroke_number,
    s.club,
    s.distance_before,
    s.distance_after,
    s.distance_unit,
    s.result,
    s.miss_line,
    CASE
        WHEN s.shot_type = 'normal'
             AND s.distance_before IS NOT NULL
             AND s.distance_after IS NOT NULL
             AND NOT s.exclude_from_stats
        THEN s.distance_before - s.distance_after
    END AS shot_distance
FROM shots s
JOIN holes h ON h.id = s.hole_id
WHERE s.shot_type = 'normal';

COMMENT ON VIEW v_shot_distances IS 'Distancia del golpe = antes − después (solo golpes con ambas distancias).';
