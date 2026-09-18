import {
  buildPaginationMeta,
  ok,
  created,
  noContent,
  parsePagination,
  requireUser,
} from "@/core/http";
import { createNoteDto, listNotesQueryDto, updateNoteDto } from "./note.dto";
import { toNoteResponse } from "./note.mapper";
import type { NoteService } from "./note.service";

export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  async list(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const query = listNotesQueryDto.parse(Object.fromEntries(url.searchParams));
    const pagination = parsePagination(url.searchParams);

    const { items, total } = await this.noteService.list(
      user.id,
      { lessonId: query.lessonId, tag: query.tag, q: query.q },
      pagination,
    );

    return ok(items.map(toNoteResponse), { meta: buildPaginationMeta(pagination, total) });
  }

  async getById(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const note = await this.noteService.getById(user.id, id);
    return ok(toNoteResponse(note));
  }

  async create(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const body = createNoteDto.parse(await request.json());
    const note = await this.noteService.create(user.id, body);
    return created(toNoteResponse(note));
  }

  async update(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const body = updateNoteDto.parse(await request.json());
    const note = await this.noteService.update(user.id, id, body);
    return ok(toNoteResponse(note));
  }

  async delete(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    await this.noteService.delete(user.id, id);
    return noContent();
  }
}
