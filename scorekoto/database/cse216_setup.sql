-- =====================================================================
-- CSE216 Database Systems - Project Schema Extensions
-- Project: Scorekoto Football Analytics Platform
-- Components: Audit Table, Triggers, PL/pgSQL Functions, Stored Procedures
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SHADOW / AUDIT LOG TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  log_id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_id VARCHAR(50) NOT NULL,
  changed_data JSONB,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. TRIGGERS (Checkpoint 4)
-- ---------------------------------------------------------------------

-- Trigger 1: Shadow Table / Audit Logging Trigger
-- Logs sensitive administrative modifications (INSERT, UPDATE, DELETE)
-- on core entities (match, player, team).
CREATE OR REPLACE FUNCTION fn_audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_id VARCHAR(50);
  v_data JSONB;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF TG_TABLE_NAME = 'match' THEN
      v_id := OLD.match_id::TEXT;
    ELSIF TG_TABLE_NAME = 'player' THEN
      v_id := OLD.player_id::TEXT;
    ELSIF TG_TABLE_NAME = 'team' THEN
      v_id := OLD.team_id::TEXT;
    ELSE
      v_id := 'UNKNOWN';
    END IF;
    v_data := to_jsonb(OLD);
    
    INSERT INTO audit_log(table_name, operation, record_id, changed_data, changed_at)
    VALUES (TG_TABLE_NAME, TG_OP, v_id, v_data, CURRENT_TIMESTAMP);
    RETURN OLD;
  ELSE
    IF TG_TABLE_NAME = 'match' THEN
      v_id := NEW.match_id::TEXT;
    ELSIF TG_TABLE_NAME = 'player' THEN
      v_id := NEW.player_id::TEXT;
    ELSIF TG_TABLE_NAME = 'team' THEN
      v_id := NEW.team_id::TEXT;
    ELSE
      v_id := 'UNKNOWN';
    END IF;
    v_data := to_jsonb(NEW);
    
    INSERT INTO audit_log(table_name, operation, record_id, changed_data, changed_at)
    VALUES (TG_TABLE_NAME, TG_OP, v_id, v_data, CURRENT_TIMESTAMP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_match ON match;
CREATE TRIGGER trg_audit_match
  AFTER INSERT OR UPDATE OR DELETE ON match
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_player ON player;
CREATE TRIGGER trg_audit_player
  AFTER INSERT OR UPDATE OR DELETE ON player
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_team ON team;
CREATE TRIGGER trg_audit_team
  AFTER INSERT OR UPDATE OR DELETE ON team
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

-- Trigger 2: Data Validation Trigger Before DML
-- Ensures match scores are non-negative when a match is completed.
CREATE OR REPLACE FUNCTION fn_validate_match_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('FT', 'AET', 'PEN') THEN
    IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
      RAISE EXCEPTION 'Completed match must have non-null scores.';
    END IF;
    IF NEW.home_score < 0 OR NEW.away_score < 0 THEN
      RAISE EXCEPTION 'Match scores cannot be negative (Home: %, Away: %).', NEW.home_score, NEW.away_score;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_match_score ON match;
CREATE TRIGGER trg_validate_match_score
  BEFORE INSERT OR UPDATE ON match
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_match_score();


-- ---------------------------------------------------------------------
-- 3. PL/pgSQL FUNCTIONS (Checkpoint 5)
-- ---------------------------------------------------------------------

-- Function 1: Computes the overall win percentage of a team across seasons
CREATE OR REPLACE FUNCTION fn_calculate_team_win_rate(p_team_id INT)
RETURNS NUMERIC AS $$
DECLARE
  v_win_rate NUMERIC;
BEGIN
  SELECT 
    COALESCE(
      ROUND((SUM(wins)::NUMERIC * 100.0) / NULLIF(SUM(matches_played), 0), 2),
      0.00
    )
  INTO v_win_rate
  FROM team_season_stats
  WHERE team_id = p_team_id;

  RETURN COALESCE(v_win_rate, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function 2: Computes a player's career summary statistics
CREATE OR REPLACE FUNCTION fn_get_player_career_summary(p_player_id INT)
RETURNS TABLE (
  total_appearances BIGINT,
  total_goals BIGINT,
  total_assists BIGINT,
  total_yellow_cards BIGINT,
  total_red_cards BIGINT,
  goal_involvement_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(appearances), 0)::BIGINT AS total_appearances,
    COALESCE(SUM(goals), 0)::BIGINT AS total_goals,
    COALESCE(SUM(assists), 0)::BIGINT AS total_assists,
    COALESCE(SUM(yellow_cards), 0)::BIGINT AS total_yellow_cards,
    COALESCE(SUM(red_cards), 0)::BIGINT AS total_red_cards,
    COALESCE(
      ROUND((SUM(goals + assists)::NUMERIC / NULLIF(SUM(appearances), 0)), 2),
      0.00
    ) AS goal_involvement_rate
  FROM player_season_stats
  WHERE player_id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Generates the recent match form string (e.g., 'W-D-W-L-W') for a team
CREATE OR REPLACE FUNCTION fn_get_team_recent_form(p_team_id INT, p_limit INT DEFAULT 5)
RETURNS VARCHAR AS $$
DECLARE
  v_form VARCHAR(30) := '';
  r RECORD;
BEGIN
  FOR r IN (
    SELECT 
      CASE
        WHEN (home_team_id = p_team_id AND home_score > away_score) OR 
             (away_team_id = p_team_id AND away_score > home_score) THEN 'W'
        WHEN home_score = away_score THEN 'D'
        ELSE 'L'
      END AS result
    FROM match
    WHERE (home_team_id = p_team_id OR away_team_id = p_team_id)
      AND status IN ('FT', 'AET', 'PEN')
      AND home_score IS NOT NULL 
      AND away_score IS NOT NULL
    ORDER BY match_date DESC
    LIMIT p_limit
  ) LOOP
    IF v_form = '' THEN
      v_form := r.result;
    ELSE
      v_form := v_form || '-' || r.result;
    END IF;
  END LOOP;

  IF v_form = '' THEN
    v_form := 'N/A';
  END IF;

  RETURN v_form;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 4. STORED PROCEDURES (Checkpoint 6)
-- ---------------------------------------------------------------------

-- Procedure 1: Multi-step cascade deletion of a match
-- Deletes dependent match_comment, match_event, match_lineup, match_detail_data, and match
CREATE OR REPLACE PROCEDURE sp_delete_match_cascade(p_match_id INT)
AS $$
BEGIN
  -- Verify match exists
  IF NOT EXISTS (SELECT 1 FROM match WHERE match_id = p_match_id) THEN
    RAISE EXCEPTION 'Match with ID % does not exist.', p_match_id;
  END IF;

  -- 1. Delete associated comments
  DELETE FROM match_comment WHERE match_id = p_match_id;

  -- 2. Delete associated events
  DELETE FROM match_event WHERE match_id = p_match_id;

  -- 3. Delete associated lineups
  DELETE FROM match_lineup WHERE match_id = p_match_id;

  -- 4. Delete cached match detail data
  DELETE FROM match_detail_data WHERE match_id = p_match_id;

  -- 5. Delete the match itself
  DELETE FROM match WHERE match_id = p_match_id;

  RAISE NOTICE 'Match % and all associated child records successfully deleted.', p_match_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure 2: Transfer player between teams
-- Updates player's team, adjusts market value, appends transfer history JSONB,
-- and updates squad memberships
CREATE OR REPLACE PROCEDURE sp_transfer_player(
  p_player_id INT,
  p_new_team_id INT,
  p_new_market_value NUMERIC
)
AS $$
DECLARE
  v_old_team_id INT;
  v_old_team_name VARCHAR(100);
  v_new_team_name VARCHAR(100);
  v_transfer_record JSONB;
BEGIN
  -- 1. Validate player exists
  SELECT team_id INTO v_old_team_id FROM player WHERE player_id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player with ID % not found.', p_player_id;
  END IF;

  -- 2. Validate new team exists
  SELECT name INTO v_new_team_name FROM team WHERE team_id = p_new_team_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target team with ID % not found.', p_new_team_id;
  END IF;

  -- Fetch old team name if player was assigned
  IF v_old_team_id IS NOT NULL THEN
    SELECT name INTO v_old_team_name FROM team WHERE team_id = v_old_team_id;
  ELSE
    v_old_team_name := 'Free Agent';
  END IF;

  -- 3. Create transfer history entry
  v_transfer_record := jsonb_build_object(
    'from_team_id', v_old_team_id,
    'from_team', COALESCE(v_old_team_name, 'Unknown'),
    'to_team_id', p_new_team_id,
    'to_team', v_new_team_name,
    'market_value_euros', p_new_market_value,
    'transfer_date', CURRENT_TIMESTAMP
  );

  -- 4. Update player record
  UPDATE player
  SET 
    team_id = p_new_team_id,
    market_value_euros = COALESCE(p_new_market_value, market_value_euros),
    transfer_history = COALESCE(transfer_history, '[]'::jsonb) || v_transfer_record
  WHERE player_id = p_player_id;

  -- 5. Update team squad roster tables if present
  IF v_old_team_id IS NOT NULL THEN
    DELETE FROM team_squad_member 
    WHERE player_id = p_player_id AND team_id = v_old_team_id;
  END IF;

  INSERT INTO team_squad_member (team_id, player_id, source, is_current, synced_at)
  VALUES (p_new_team_id, p_player_id, 'manual_transfer', TRUE, CURRENT_TIMESTAMP)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Player % transferred from % to % successfully.', p_player_id, v_old_team_name, v_new_team_name;
END;
$$ LANGUAGE plpgsql;

-- Ensure sequences are aligned with maximum IDs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'match_comment_comment_id_seq') THEN
    PERFORM setval('match_comment_comment_id_seq', COALESCE((SELECT MAX(comment_id) FROM match_comment), 0) + 1, false);
  END IF;
END $$;

