-- Migration for v2.1.0: Add card_type column to cards table
-- Date: 2026-01-06

BEGIN TRANSACTION;

-- Add card_type column with default value 'access'
ALTER TABLE cards ADD COLUMN card_type VARCHAR(20) NOT NULL DEFAULT 'access';

-- Verify migration
SELECT COUNT(*) as total_cards FROM cards;
SELECT COUNT(*) as access_cards FROM cards WHERE card_type = 'access';

COMMIT;

-- Migration completed successfully
