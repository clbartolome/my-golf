-- Para BBDD ya creadas: añade metros como unidad de distancia
ALTER TYPE distance_unit ADD VALUE IF NOT EXISTS 'm';
