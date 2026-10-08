import {
  buildPaginationMeta,
  ok,
  created,
  noContent,
  parsePagination,
  requireUser,
} from "@/core/http";
import { createWordDto, listWordsQueryDto, updateWordDto } from "./word.dto";
import { toWordResponse } from "./word.mapper";
import type { WordService } from "./word.service";

export class WordController {
  constructor(private readonly wordService: WordService) {}

  async list(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const query = listWordsQueryDto.parse(Object.fromEntries(url.searchParams));
    const pagination = parsePagination(url.searchParams);

    const { items, total } = await this.wordService.list(
      user.id,
      {
        lessonId: query.lessonId,
        tag: query.tag,
        q: query.q,
        learnedAfter: query.learnedAfter,
        learnedBefore: query.learnedBefore,
      },
      pagination,
    );

    return ok(items.map(toWordResponse), { meta: buildPaginationMeta(pagination, total) });
  }

  async getById(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const word = await this.wordService.getById(user.id, id);
    return ok(toWordResponse(word));
  }

  async create(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const body = createWordDto.parse(await request.json());
    const word = await this.wordService.create(user.id, body);
    return created(toWordResponse(word));
  }

  async update(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    const body = updateWordDto.parse(await request.json());
    const word = await this.wordService.update(user.id, id, body);
    return ok(toWordResponse(word));
  }

  async delete(request: Request, id: string): Promise<Response> {
    const user = await requireUser(request);
    await this.wordService.delete(user.id, id);
    return noContent();
  }
}
