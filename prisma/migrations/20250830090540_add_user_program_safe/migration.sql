-- Safe, idempotent migration: add column if it isn't there yet
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "program" TEXT;
