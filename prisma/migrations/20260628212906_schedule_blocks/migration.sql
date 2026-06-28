-- Add editable, materialized week layout to Schedule.
ALTER TABLE "Schedule" ADD COLUMN "blocks" JSONB;
