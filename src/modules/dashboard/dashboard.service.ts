import type { WordRepository } from "@/modules/vocabulary/word.repository.interface";
import type { LessonRepository } from "@/modules/lessons/lesson.repository.interface";
import type { StudyTaskRepository } from "@/modules/schedule/study-task.repository.interface";

export interface DashboardSummary {
  words: { total: number; last7Days: number };
  lessons: { completed: number; pending: number };
  scheduleTasks: { dueToday: number; dueThisWeek: number };
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Start of the calendar day (00:00:00.000) for the given date, in local time. */
function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** End of the calendar day (23:59:59.999) for the given date, in local time. */
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Start of the current week (Monday 00:00:00.000), in local time. */
function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Shift so Monday is
  // the first day of the week (ISO-style week), without any date library.
  const dayOfWeek = start.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/** End of the current week (Sunday 23:59:59.999), in local time. */
function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

/**
 * Composes a lightweight read-only summary across the three existing
 * modules, strictly through their repository interfaces (never a raw
 * Prisma client belonging to another module). No new entity/table backs
 * this — it's pure aggregation over data owned by vocabulary, lessons,
 * and schedule.
 */
export class DashboardService {
  constructor(
    private readonly wordRepository: WordRepository,
    private readonly lessonRepository: LessonRepository,
    private readonly studyTaskRepository: StudyTaskRepository,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * MILLISECONDS_PER_DAY);

    const [
      wordsTotal,
      wordsLast7Days,
      lessonsCompleted,
      lessonsPending,
      tasksDueToday,
      tasksDueThisWeek,
    ] = await Promise.all([
      this.wordRepository.countTotal(userId),
      this.wordRepository.countSince(userId, sevenDaysAgo),
      this.lessonRepository.countByStatus(userId, "COMPLETED"),
      this.lessonRepository.countByStatus(userId, "PENDING"),
      this.studyTaskRepository.countByStatusAndDateRange(
        userId,
        "PENDING",
        startOfDay(now),
        endOfDay(now),
      ),
      this.studyTaskRepository.countByStatusAndDateRange(
        userId,
        "PENDING",
        startOfWeek(now),
        endOfWeek(now),
      ),
    ]);

    return {
      words: { total: wordsTotal, last7Days: wordsLast7Days },
      lessons: { completed: lessonsCompleted, pending: lessonsPending },
      scheduleTasks: { dueToday: tasksDueToday, dueThisWeek: tasksDueThisWeek },
    };
  }
}
