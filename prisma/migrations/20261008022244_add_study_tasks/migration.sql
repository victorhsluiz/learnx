-- CreateEnum
CREATE TYPE "StudyTaskStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "study_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "StudyTaskStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_tasks_userId_idx" ON "study_tasks"("userId");

-- CreateIndex
CREATE INDEX "study_tasks_userId_date_idx" ON "study_tasks"("userId", "date");

-- CreateIndex
CREATE INDEX "study_tasks_userId_lessonId_idx" ON "study_tasks"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
