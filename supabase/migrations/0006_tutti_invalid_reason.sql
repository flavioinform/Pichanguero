-- Lets the round-results view explain *why* an answer was invalidated
-- (empty, wrong starting letter, or not found in the data) instead of just
-- showing a bare "✗ 0".
alter table tutti_answers add column if not exists invalid_reason text;
