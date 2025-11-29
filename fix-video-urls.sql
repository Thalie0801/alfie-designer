-- Script pour identifier et corriger les URLs de vidéos problématiques
-- Ce script identifie les vidéos avec des URLs Cloudinary qui contiennent des transformations complexes

-- 1. Identifier les vidéos avec des URLs Cloudinary contenant des transformations zoompan
SELECT 
  id,
  status,
  output_url,
  thumbnail_url,
  created_at
FROM media_generations
WHERE type = 'video'
  AND (
    output_url LIKE '%e_zoompan%'
    OR thumbnail_url LIKE '%e_zoompan%'
  )
ORDER BY created_at DESC;

-- 2. Pour corriger, on peut soit :
--    a) Supprimer les transformations de l'URL
--    b) Régénérer les thumbnails
--    c) Marquer comme "failed" pour permettre une régénération

-- Exemple de correction : remplacer les URLs avec transformations par des URLs simples
-- ATTENTION : À exécuter avec précaution après avoir vérifié les résultats de la requête ci-dessus

-- UPDATE media_generations
-- SET output_url = REGEXP_REPLACE(output_url, '/w_[^/]+/', '/', 'g'),
--     thumbnail_url = REGEXP_REPLACE(thumbnail_url, '/w_[^/]+/', '/', 'g')
-- WHERE type = 'video'
--   AND (output_url LIKE '%e_zoompan%' OR thumbnail_url LIKE '%e_zoompan%');
