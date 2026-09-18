import {
  buildPaginationMeta,
  ok,
  created,
  noContent,
  parsePagination,
  requireUser,
} from "@/core/http";
import { createLessonDto, listLessonsQueryDto, updateLessonDto } from "./lesson.dto";
import { toLessonResponse } from "./lesson.mapper";
import type { LessonService } from "./lesson.service";

export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  async list(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const query = listLessonsQueryDto.parse(Object.fromEntries(url.searchParams));
    const pagination = parsePagination(url.searchParams);

    const { items, total } = await this.lessonService.list(
      user.id,
      { status: query.status, type: query.type, tag: query.tag, q: query.q },
      pagination,
    );

    return ok(items.map(toLessonResponse), { meta: buildPaginationMeta(pagination, total) });
  }

  async getById(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const lesson = await this.lessonService.getById(user.id, id);
    return ok(toLessonResponse(lesson));
  }

  async create(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const body = createLessonDto.parse(await request.json());
    const lesson = await this.lessonService.create(user.id, body);
    return created(toLessonResponse(lesson));
  }

  async update(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const body = updateLessonDto.parse(await request.json());
    const lesson = await this.lessonService.update(user.id, id, body);
    return ok(toLessonResponse(lesson));
  }

  async delete(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    await this.lessonService.delete(user.id, id);
    return noContent();
  }

  async markWatched(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const lesson = await this.lessonService.markWatched(user.id, id);
    return ok(toLessonResponse(lesson));
  }
}
