-- Migration: Add source column to recommendations table
-- This migration adds a source field to track where recommendations came from

-- Add source column if it doesn't exist
ALTER TABLE recommendations ADD COLUMN source TEXT;

-- No index needed as source is not frequently queried
