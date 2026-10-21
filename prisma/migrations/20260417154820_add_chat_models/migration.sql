-- CreateEnum
CREATE TYPE "public"."ChatParticipantRole" AS ENUM ('PLAYER', 'COACH', 'TEAM_ADMIN', 'PARENT', 'SCOUTLINE_ADMIN');

-- CreateTable
CREATE TABLE "public"."ChatConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "subject" TEXT,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ChatParticipantRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_lastMessageAt_idx" ON "public"."ChatConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatConversation_updatedAt_idx" ON "public"."ChatConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversationParticipant_userId_joinedAt_idx" ON "public"."ChatConversationParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE INDEX "ChatConversationParticipant_conversationId_joinedAt_idx" ON "public"."ChatConversationParticipant"("conversationId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversationParticipant_conversationId_userId_key" ON "public"."ChatConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "public"."ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderUserId_createdAt_idx" ON "public"."ChatMessage"("senderUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ChatConversationParticipant" ADD CONSTRAINT "ChatConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatConversationParticipant" ADD CONSTRAINT "ChatConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
