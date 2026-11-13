BEGIN;

CREATE TYPE "RescheduleScope" AS ENUM ('ONCE', 'SERIES');
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "TimetableRescheduleRequest" (
  "id" TEXT PRIMARY KEY,
  "requesterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "eventId" TEXT NOT NULL REFERENCES "TimetableEvent"("id") ON DELETE RESTRICT,
  "newDate" TIMESTAMP(3) NOT NULL,
  "newPair" INTEGER NOT NULL CHECK ("newPair" BETWEEN 1 AND 7),
  "scope" "RescheduleScope" NOT NULL,
  "reason" VARCHAR(1000) NOT NULL CHECK (length(btrim("reason")) > 0),
  "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewerId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "decisionExplanation" VARCHAR(1000),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TimetableRescheduleOccurrence" (
  "id" TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL REFERENCES "TimetableRescheduleRequest"("id") ON DELETE RESTRICT,
  "eventId" TEXT NOT NULL REFERENCES "TimetableEvent"("id") ON DELETE RESTRICT,
  "oldDate" TIMESTAMP(3) NOT NULL,
  "oldPair" INTEGER NOT NULL CHECK ("oldPair" BETWEEN 1 AND 7),
  "newDate" TIMESTAMP(3) NOT NULL,
  "newPair" INTEGER NOT NULL CHECK ("newPair" BETWEEN 1 AND 7),
  "sourceContext" JSONB NOT NULL
);

CREATE TABLE "TimetableRescheduleAudit" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "requestId" TEXT REFERENCES "TimetableRescheduleRequest"("id") ON DELETE RESTRICT,
  "eventId" TEXT NOT NULL REFERENCES "TimetableEvent"("id") ON DELETE RESTRICT,
  "reason" VARCHAR(1000) NOT NULL CHECK (length(btrim("reason")) > 0),
  "oldDate" TIMESTAMP(3) NOT NULL,
  "oldPair" INTEGER NOT NULL CHECK ("oldPair" BETWEEN 1 AND 7),
  "newDate" TIMESTAMP(3) NOT NULL,
  "newPair" INTEGER NOT NULL CHECK ("newPair" BETWEEN 1 AND 7),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "TimetableRescheduleRequest_requesterId_createdAt_id_idx" ON "TimetableRescheduleRequest"("requesterId", "createdAt", "id");
CREATE INDEX "TimetableRescheduleRequest_status_createdAt_id_idx" ON "TimetableRescheduleRequest"("status", "createdAt", "id");
CREATE INDEX "TimetableRescheduleRequest_reviewerId_idx" ON "TimetableRescheduleRequest"("reviewerId");
CREATE INDEX "TimetableRescheduleRequest_eventId_idx" ON "TimetableRescheduleRequest"("eventId");
CREATE UNIQUE INDEX "TimetableRescheduleOccurrence_requestId_eventId_key" ON "TimetableRescheduleOccurrence"("requestId", "eventId");
CREATE INDEX "TimetableRescheduleOccurrence_eventId_idx" ON "TimetableRescheduleOccurrence"("eventId");
CREATE UNIQUE INDEX "TimetableRescheduleAudit_requestId_eventId_key" ON "TimetableRescheduleAudit"("requestId", "eventId");
CREATE INDEX "TimetableRescheduleAudit_actorId_idx" ON "TimetableRescheduleAudit"("actorId");
CREATE INDEX "TimetableRescheduleAudit_eventId_createdAt_idx" ON "TimetableRescheduleAudit"("eventId", "createdAt");

COMMIT;
