-- Add missing program column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "program" TEXT;
