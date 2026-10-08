import {
  buildPaginationMeta,
  ok,
  created,
  noContent,
  parsePagination,
  requireUser,
} from "@/core/http";
import { createStudyTaskDto, listStudyTasksQueryDto, updateStudyTaskDto } from "./study-task.dto";
import { toStudyTaskResponse } from "./study-task.mapper";
import type { StudyTaskService } from "./study-task.service";

export class StudyTaskController {
  constructor(private readonly studyTaskService: StudyTaskService) {}

  async list(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const query = listStudyTasksQueryDto.parse(Object.fromEntries(url.searchParams));
    const pagination = parsePagination(url.searchParams);

    const { items, total } = await this.studyTaskService.list(
      user.id,
      {
        status: query.status,
        type: query.type,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
      pagination,
    );

    return ok(items.map(toStudyTaskResponse), { meta: buildPaginationMeta(pagination, total) });
  }

  async getById(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const studyTask = await this.studyTaskService.getById(user.id, id);
    return ok(toStudyTaskResponse(studyTask));
  }

  async create(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const body = createStudyTaskDto.parse(await request.json());
    const studyTask = await this.studyTaskService.create(user.id, body);
    return created(toStudyTaskResponse(studyTask));
  }

  async update(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const body = updateStudyTaskDto.parse(await request.json());
    const studyTask = await this.studyTaskService.update(user.id, id, body);
    return ok(toStudyTaskResponse(studyTask));
  }

  async delete(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    await this.studyTaskService.delete(user.id, id);
    return noContent();
  }
}
