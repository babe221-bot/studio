-- ============================================================
-- Sprint 2: Create tables + seed data
-- Run this once in the Supabase SQL Editor:
--   Dashboard → SQL Editor → Paste → Run
-- All statements are idempotent (safe to re-run).
-- ============================================================


-- ── 1. materials ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  density    NUMERIC     NOT NULL,
  cost_sqm   NUMERIC     NOT NULL,
  texture    TEXT        NOT NULL DEFAULT '',
  color      TEXT        NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO materials (id, name, density, cost_sqm, texture, color) VALUES
  (1,  'Plano',      2.7,  220, 'https://placehold.co/1024x1024/EAE6D9/9D998D.png', '#EAE6D9'),
  (2,  'Kirmenjak',  2.65, 180, 'https://placehold.co/1024x1024/E1DCC5/A9A594.png', '#E1DCC5'),
  (3,  'Visočan',    2.6,  190, 'https://placehold.co/1024x1024/DAD6CD/A4A097.png', '#DAD6CD'),
  (4,  'Sivac',      2.67, 210, 'https://placehold.co/1024x1024/C7C7C7/8F8F8F.png', '#C7C7C7'),
  (5,  'Kanfanar',   2.63, 160, 'https://placehold.co/1024x1024/DED9C4/A49E82.png', '#DED9C4'),
  (6,  'Avorio',     2.68, 280, 'https://placehold.co/1024x1024/FDF5E6/B0A492.png', '#FDF5E6'),
  (7,  'Pulenat',    2.64, 200, 'https://placehold.co/1024x1024/DCDCDC/A9A9A9.png', '#DCDCDC'),
  (8,  'Lahor',      2.58, 140, 'https://placehold.co/1024x1024/FAF0E6/C3B091.png', '#FAF0E6'),
  (9,  'Mironja',    2.8,  250, 'https://placehold.co/1024x1024/D2B48C/8C7853.png', '#D2B48C'),
  (10, 'Botticino',  2.7,  350, 'https://placehold.co/1024x1024/E6DCC9/B9A793.png', '#E6DCC9'),
  (11, 'Carrara C',  2.71, 450, 'https://placehold.co/1024x1024/F5F5F5/CCCCCC.png', '#F5F5F5')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence so future INSERTs auto-increment correctly
SELECT setval('materials_id_seq', (SELECT MAX(id) FROM materials));


-- ── 2. surface_finishes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS surface_finishes (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  cost_sqm   NUMERIC     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO surface_finishes (id, name, cost_sqm) VALUES
  (0,  'Bez obrade',                0),
  (1,  'Poliranje (Polished)',      15),
  (2,  'Brušenje (Honed)',          12),
  (3,  'Četkanje (Brushed)',        18),
  (4,  'Paljenje (Flamed)',         20),
  (5,  'Pjeskarenje (Sandblasted)', 22),
  (6,  'Bućardanje (Bush-hammered)',25),
  (7,  'Štokovanje (Tooled)',       23),
  (8,  'Antico (Antiqued)',         28),
  (9,  'Martelina (Martellina)',    20),
  (10, 'Pilano (Sawn)',              5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('surface_finishes_id_seq', (SELECT MAX(id) FROM surface_finishes));


-- ── 3. edge_profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edge_profiles (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  cost_m     NUMERIC     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO edge_profiles (id, name, cost_m) VALUES
  (1,  'Ravni rez (Pilan)',                    2),
  (10, 'Smuš C0.5 (0.5mm 45°)',               5),
  (11, 'Smuš C1 (1mm 45°)',                   7),
  (12, 'Smuš C2 (2mm 45°)',                   8),
  (13, 'Smuš C5 (5mm 45°)',                  10),
  (14, 'Smuš C7 (7mm 45°)',                  11),
  (15, 'Smuš C8 (8mm 45°)',                  12),
  (16, 'Smuš C10 (10mm 45°)',               13),
  (20, 'Polu-zaobljena R1cm',               12),
  (21, 'Polu-zaobljena R1.5cm',             15),
  (22, 'Polu-zaobljena R2cm',               18),
  (30, 'Puno-zaobljena R1.5cm (Half Bullnose)', 20),
  (31, 'Puno-zaobljena R2cm (Half Bullnose)',   25),
  (40, 'T-profil',                              35),
  (41, 'Dupli T-profil',                        45)
ON CONFLICT (id) DO NOTHING;

SELECT setval('edge_profiles_id_seq', (SELECT MAX(id) FROM edge_profiles));
