-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('RECORDED', 'LIVE');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'PENDING',
    "sourceUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "watchedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lessons_userId_idx" ON "lessons"("userId");

-- CreateIndex
CREATE INDEX "lessons_userId_status_idx" ON "lessons"("userId", "status");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
