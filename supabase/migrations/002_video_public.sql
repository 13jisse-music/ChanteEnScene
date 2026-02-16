-- Ajout du champ video_public pour contrôler la diffusion publique de la vidéo
ALTER TABLE candidates ADD COLUMN video_public BOOLEAN DEFAULT false;
