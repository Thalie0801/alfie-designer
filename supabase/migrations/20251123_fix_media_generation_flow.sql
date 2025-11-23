-- Migration: Réparer le flux de génération d'images
-- Cette migration ajoute un trigger pour synchroniser automatiquement
-- les jobs complétés avec la table media_generations

-- 1. Créer une fonction trigger pour synchroniser job_queue -> media_generations
CREATE OR REPLACE FUNCTION sync_job_completion_to_media_generations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id uuid;
  v_prompt text;
  v_output_url text;
  v_type text;
  v_outputs jsonb;
  v_output_item jsonb;
BEGIN
  -- Ne traiter que les jobs qui viennent de passer à 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Extraire les informations du payload
    v_brand_id := (NEW.payload->'intent'->>'brandId')::uuid;
    v_prompt := NEW.payload->'intent'->>'topic';
    v_outputs := NEW.result->'outputs';
    
    -- Déterminer le type de média
    CASE NEW.type
      WHEN 'render_images' THEN
        v_type := 'image';
      WHEN 'render_carousels' THEN
        v_type := 'image'; -- Les carousels sont aussi des images
      WHEN 'generate_video' THEN
        v_type := 'video';
      ELSE
        v_type := 'image';
    END CASE;
    
    -- Vérifier que nous avons les données nécessaires
    IF v_brand_id IS NULL OR v_outputs IS NULL THEN
      RAISE WARNING 'Job % completed but missing brand_id or outputs', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Insérer chaque output dans media_generations (si pas déjà présent)
    FOR v_output_item IN SELECT * FROM jsonb_array_elements_text(v_outputs)
    LOOP
      v_output_url := v_output_item::text;
      
      -- Vérifier si cette URL existe déjà pour ce job
      IF NOT EXISTS (
        SELECT 1 FROM media_generations 
        WHERE job_id = NEW.id::text 
        AND output_url = v_output_url
      ) THEN
        -- Insérer dans media_generations
        INSERT INTO media_generations (
          user_id,
          brand_id,
          type,
          status,
          prompt,
          output_url,
          job_id,
          metadata
        ) VALUES (
          NEW.user_id,
          v_brand_id,
          v_type,
          'completed',
          v_prompt,
          v_output_url,
          NEW.id::text,
          jsonb_build_object(
            'job_type', NEW.type,
            'synced_from_trigger', true,
            'created_at', now()
          )
        );
        
        RAISE NOTICE 'Created media_generation for job % output %', NEW.id, v_output_url;
      END IF;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Créer le trigger sur job_queue
DROP TRIGGER IF EXISTS trigger_sync_job_to_media ON job_queue;
CREATE TRIGGER trigger_sync_job_to_media
  AFTER UPDATE ON job_queue
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION sync_job_completion_to_media_generations();

-- 3. Ajouter un commentaire explicatif
COMMENT ON FUNCTION sync_job_completion_to_media_generations() IS 
  'Trigger function qui synchronise automatiquement les jobs complétés vers media_generations. '
  'Cela garantit que toutes les images générées apparaissent dans la bibliothèque du Studio, '
  'même si le worker échoue à insérer manuellement.';

-- 4. Créer un index pour optimiser les requêtes de vérification de doublons
CREATE INDEX IF NOT EXISTS idx_media_generations_job_output 
  ON media_generations(job_id, output_url);

COMMENT ON INDEX idx_media_generations_job_output IS 
  'Index pour éviter les doublons lors de la synchronisation job_queue -> media_generations';
