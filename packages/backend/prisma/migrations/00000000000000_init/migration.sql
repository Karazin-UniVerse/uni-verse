-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPPORTUNITIES_USER', 'MOODLE_STUDENT', 'INSTRUCTOR', 'ADMIN', 'OPPORTUNITIES_MODERATOR');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'REQUIRES_CHANGES', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OpportunityLifecycleState" AS ENUM ('START', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "OpportunityTag" AS ENUM ('RESEARCH', 'STUDY_PROJECT', 'INTERNSHIP', 'STARTUP', 'CHALLENGE', 'VOLUNTEERING', 'MENTORING', 'IT', 'ENGINEERING', 'NATURAL_SCIENCES', 'BUSINESS', 'HUMANITIES', 'LAW', 'MEDIA_DESIGN', 'MEDICINE', 'NO_EXPERIENCE', 'BASIC_KNOWLEDGE', 'ADVANCED', 'REMOTE', 'KHARKIV', 'UKRAINE', 'ABROAD');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "roles" "Role"[] DEFAULT ARRAY['OPPORTUNITIES_USER']::"Role"[],
    "token" TEXT,
    "moodleId" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhone" (
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "UserPhone_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "instructorId" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerContactInfo" TEXT NOT NULL,
    "partnerInfo" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "lifecycleState" "OpportunityLifecycleState" NOT NULL DEFAULT 'START',
    "acceptsApplications" BOOLEAN NOT NULL DEFAULT false,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'UNPAID',
    "paymentDetails" TEXT,
    "details" TEXT,
    "moderationComment" TEXT,
    "moderationContentHash" TEXT,
    "tags" "OpportunityTag"[] DEFAULT ARRAY[]::"OpportunityTag"[],
    "publishedAt" TIMESTAMP(3),
    "publishedTitle" TEXT,
    "publishedPaymentType" "PaymentType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityFavorite" (
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityFavorite_pkey" PRIMARY KEY ("userId","opportunityId")
);

-- CreateTable
CREATE TABLE "OpportunityApplication" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "briefDescription" TEXT,
    "motivation" TEXT,
    "answers" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "ownerComment" TEXT,
    "withdrawalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,

    CONSTRAINT "OpportunityApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "applicationId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GripSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GripSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GripQuotaBucket" (
    "key" TEXT NOT NULL,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "GripQuotaBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GripLease" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GripLease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPhone_phoneNumber_key" ON "UserPhone"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Opportunity_status_publishedAt_createdAt_id_idx" ON "Opportunity"("status", "publishedAt" DESC, "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "OpportunityFavorite_opportunityId_idx" ON "OpportunityFavorite"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityApplication_applicantId_opportunityId_key" ON "OpportunityApplication"("applicantId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "GripSession_tokenHash_key" ON "GripSession"("tokenHash");

-- CreateIndex
CREATE INDEX "GripSession_expiresAt_idx" ON "GripSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GripSession_githubId_idx" ON "GripSession"("githubId");

-- CreateIndex
CREATE INDEX "GripQuotaBucket_windowEndsAt_idx" ON "GripQuotaBucket"("windowEndsAt");

-- CreateIndex
CREATE INDEX "GripLease_expiresAt_idx" ON "GripLease"("expiresAt");

-- AddForeignKey
ALTER TABLE "UserPhone" ADD CONSTRAINT "UserPhone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityFavorite" ADD CONSTRAINT "OpportunityFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityFavorite" ADD CONSTRAINT "OpportunityFavorite_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OpportunityApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
