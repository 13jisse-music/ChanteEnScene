-- ROLLBACK de la migration du 4 juin 2026 (trigger auto_activate_priorities).
-- Restaure la definition d'origine (telle qu'avant le fix). NB : cette version d'origine
-- contient l'appel net.http_post a la mauvaise signature (headers en text) qui FAIT ECHOUER
-- le dernier vote d'un jure quand il a tout note. Ne restaurer qu'en cas de besoin.
CREATE OR REPLACE FUNCTION public.auto_activate_priorities()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_session_id uuid;
  v_total_approved integer;
  v_votes_done integer;
  v_first_name text;
  v_last_name text;
  v_msg text;
BEGIN
  SELECT session_id, first_name, last_name
  INTO v_session_id, v_first_name, v_last_name
  FROM jurors WHERE id = NEW.juror_id;

  SELECT COUNT(*) INTO v_total_approved
  FROM candidates
  WHERE session_id = v_session_id
    AND status IN ('approved','semifinalist','finalist');

  SELECT COUNT(*) INTO v_votes_done
  FROM jury_scores
  WHERE juror_id = NEW.juror_id;

  IF v_votes_done >= v_total_approved THEN
    UPDATE jurors
    SET show_priorities = true,
        priorities_activated_at = now()
    WHERE id = NEW.juror_id
      AND show_priorities = false
    RETURNING first_name, last_name INTO v_first_name, v_last_name;

    IF FOUND THEN
      v_msg := '🔔 <b>' || v_first_name || ' ' || v_last_name || '</b> vient de terminer tous ses votes !' ||
               chr(10) || chr(10) ||
               'Son interface a basculé automatiquement sur les priorités.' ||
               chr(10) || 'Il peut maintenant classer ses 10 favoris par catégorie.';

      PERFORM net.http_post(
        url := 'https://api.telegram.org/bot8775745718:AAHGt9_a7scEvfGgZgnCAs5u_qTyF9leAe0/sendMessage',
        headers := '{"Content-Type":"application/json"}',
        body := json_build_object(
          'chat_id', '8386182992',
          'text', v_msg,
          'parse_mode', 'HTML'
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
