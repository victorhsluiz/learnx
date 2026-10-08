import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "../src/core/security/password.js";

/**
 * Seeds a single demo user plus a realistic related dataset (lessons,
 * notes, vocabulary words, study tasks) so the app has something to look
 * at right after `prisma migrate dev`. Safe to run multiple times: the
 * user is upserted by email, and the child rows are only inserted the
 * first time (guarded by an existence check per user) so re-running the
 * script against a non-empty database doesn't create duplicates.
 *
 * Demo login: demo@learnx.dev / learnx-demo123
 * (plaintext password, hashed below with the app's own hashPassword
 * helper — only ever used in development/test databases).
 */
const DEMO_USER = {
  email: "demo@learnx.dev",
  name: "Demo User",
  plainPassword: "learnx-demo123",
};

const days = (offset: number) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashPassword(DEMO_USER.plainPassword);

    const user = await prisma.user.upsert({
      where: { email: DEMO_USER.email },
      update: {},
      create: {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        passwordHash,
      },
    });

    console.log(`Seeded demo user: ${user.email} (${user.id})`);

    const existingLessonCount = await prisma.lesson.count({ where: { userId: user.id } });

    if (existingLessonCount > 0) {
      console.log("Demo data already present for this user, skipping related rows.");
      return;
    }

    const lessons = await prisma.lesson.createManyAndReturn({
      data: [
        {
          userId: user.id,
          title: "HSK1 - Saudações básicas",
          type: "RECORDED",
          status: "COMPLETED",
          sourceUrl: "https://example.com/courses/hsk1/aula-01",
          watchedAt: days(-10),
          durationMinutes: 25,
          tags: ["hsk1", "saudações"],
          position: 1,
        },
        {
          userId: user.id,
          title: "Pronúncia de tons: 1º e 2º tom",
          type: "RECORDED",
          status: "COMPLETED",
          sourceUrl: "https://example.com/courses/hsk1/aula-02",
          watchedAt: days(-8),
          durationMinutes: 18,
          tags: ["pronúncia", "tons"],
          position: 2,
        },
        {
          userId: user.id,
          title: "Pronúncia de tons: 3º e 4º tom",
          type: "RECORDED",
          status: "IN_PROGRESS",
          sourceUrl: "https://example.com/courses/hsk1/aula-03",
          durationMinutes: 20,
          tags: ["pronúncia", "tons"],
          position: 3,
        },
        {
          userId: user.id,
          title: "Números e idade",
          type: "RECORDED",
          status: "COMPLETED",
          sourceUrl: "https://example.com/courses/hsk1/aula-04",
          watchedAt: days(-5),
          durationMinutes: 22,
          tags: ["hsk1", "números"],
          position: 4,
        },
        {
          userId: user.id,
          title: "Conversação em grupo: apresentações",
          type: "LIVE",
          status: "COMPLETED",
          scheduledAt: days(-3),
          watchedAt: days(-3),
          durationMinutes: 45,
          tags: ["conversação"],
          position: 5,
        },
        {
          userId: user.id,
          title: "Família e relações",
          type: "RECORDED",
          status: "PENDING",
          sourceUrl: "https://example.com/courses/hsk1/aula-05",
          scheduledAt: days(2),
          durationMinutes: 24,
          tags: ["hsk1", "família"],
          position: 6,
        },
        {
          userId: user.id,
          title: "Comida e bebida: vocabulário essencial",
          type: "RECORDED",
          status: "PENDING",
          sourceUrl: "https://example.com/courses/hsk1/aula-06",
          scheduledAt: days(4),
          durationMinutes: 28,
          tags: ["hsk1", "comida"],
          position: 7,
        },
        {
          userId: user.id,
          title: "Conversação em grupo: no restaurante",
          type: "LIVE",
          status: "PENDING",
          scheduledAt: days(6),
          durationMinutes: 50,
          tags: ["conversação"],
          position: 8,
        },
      ],
    });

    console.log(`Seeded ${lessons.length} lessons.`);

    const findLesson = (title: string) => {
      const lesson = lessons.find((item) => item.title === title);
      if (!lesson) {
        throw new Error(`Seed inconsistency: lesson "${title}" not found.`);
      }
      return lesson;
    };

    const notes = await prisma.note.createManyAndReturn({
      data: [
        {
          userId: user.id,
          lessonId: findLesson("HSK1 - Saudações básicas").id,
          title: "Saudações básicas",
          contentMarkdown:
            "# Saudações\n\n- 你好 (nǐ hǎo) — olá\n- 早上好 (zǎoshang hǎo) — bom dia\n- 晚安 (wǎn'ān) — boa noite\n- 再见 (zàijiàn) — tchau\n\nUsar 你好 funciona em qualquer hora do dia, é o mais neutro.",
          tags: ["hsk1", "saudações"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Pronúncia de tons: 1º e 2º tom").id,
          title: "Tons 1 e 2",
          contentMarkdown:
            "## Tom 1 (ˉ)\nTom alto e constante, como cantar uma nota fixa.\n\n## Tom 2 (ˊ)\nTom ascendente, sobe do médio para o alto.\n\nExemplo: 妈 (mā, tom 1) vs 麻 (má, tom 2).",
          tags: ["pronúncia", "tons"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Números e idade").id,
          title: "Contar de 1 a 10",
          contentMarkdown:
            "一 (yī), 二 (èr), 三 (sān), 四 (sì), 五 (wǔ), 六 (liù), 七 (qī), 八 (bā), 九 (jiǔ), 十 (shí)\n\nPerguntar idade: 你多大了？(nǐ duō dà le?)",
          tags: ["hsk1", "números"],
        },
        {
          userId: user.id,
          lessonId: null,
          title: "Dicas de estudo diário",
          contentMarkdown:
            "- Revisar vocabulário por 10 minutos ao acordar\n- Praticar tons em voz alta, não só mentalmente\n- Anotar frases novas no caderno de notas, não só no app",
          tags: ["hábitos"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Conversação em grupo: apresentações").id,
          title: "Frases para se apresentar",
          contentMarkdown:
            "我叫[nome] (wǒ jiào...) — eu me chamo...\n我是巴西人 (wǒ shì bāxī rén) — eu sou brasileiro(a)\n很高兴认识你 (hěn gāoxìng rènshi nǐ) — prazer em te conhecer",
          tags: ["conversação"],
        },
        {
          userId: user.id,
          lessonId: null,
          title: "Erros comuns de pronúncia",
          contentMarkdown:
            "- Confundir 四 (sì, 4) com 十 (shí, 10)\n- Não marcar o tom 3 (baixo-descendente-ascendente) com força suficiente\n- Esquecer que 不 (bù) muda de tom antes de outra sílaba de 4º tom",
          tags: ["pronúncia"],
        },
      ],
    });

    console.log(`Seeded ${notes.length} notes.`);

    const words = await prisma.word.createManyAndReturn({
      data: [
        {
          userId: user.id,
          lessonId: findLesson("HSK1 - Saudações básicas").id,
          hanzi: "你好",
          pinyin: "nǐ hǎo",
          translation: "olá",
          learnedAt: days(-10),
          tags: ["hsk1", "saudações"],
        },
        {
          userId: user.id,
          lessonId: findLesson("HSK1 - Saudações básicas").id,
          hanzi: "谢谢",
          pinyin: "xièxiè",
          translation: "obrigado(a)",
          learnedAt: days(-10),
          tags: ["hsk1", "saudações"],
        },
        {
          userId: user.id,
          lessonId: findLesson("HSK1 - Saudações básicas").id,
          hanzi: "再见",
          pinyin: "zàijiàn",
          translation: "tchau",
          learnedAt: days(-9),
          tags: ["hsk1", "saudações"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "对不起",
          pinyin: "duìbuqǐ",
          translation: "desculpe",
          learnedAt: days(-9),
          tags: ["hsk1"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "学习",
          pinyin: "xuéxí",
          translation: "estudar",
          learnedAt: days(-8),
          partOfSpeech: "verbo",
          tags: ["hsk1", "gramática"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "老师",
          pinyin: "lǎoshī",
          translation: "professor(a)",
          learnedAt: days(-8),
          partOfSpeech: "substantivo",
          tags: ["hsk1"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "朋友",
          pinyin: "péngyou",
          translation: "amigo(a)",
          learnedAt: days(-7),
          partOfSpeech: "substantivo",
          tags: ["hsk1"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Números e idade").id,
          hanzi: "一",
          pinyin: "yī",
          translation: "um",
          learnedAt: days(-6),
          partOfSpeech: "numeral",
          tags: ["hsk1", "números"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Números e idade").id,
          hanzi: "二",
          pinyin: "èr",
          translation: "dois",
          learnedAt: days(-6),
          partOfSpeech: "numeral",
          tags: ["hsk1", "números"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Números e idade").id,
          hanzi: "三",
          pinyin: "sān",
          translation: "três",
          learnedAt: days(-6),
          partOfSpeech: "numeral",
          tags: ["hsk1", "números"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Números e idade").id,
          hanzi: "多大",
          pinyin: "duō dà",
          translation: "quantos anos (idade)",
          learnedAt: days(-5),
          tags: ["hsk1", "números"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "家庭",
          pinyin: "jiātíng",
          translation: "família",
          learnedAt: days(-5),
          partOfSpeech: "substantivo",
          tags: ["família"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "妈妈",
          pinyin: "māma",
          translation: "mãe",
          learnedAt: days(-4),
          partOfSpeech: "substantivo",
          tags: ["família"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "爸爸",
          pinyin: "bàba",
          translation: "pai",
          learnedAt: days(-4),
          partOfSpeech: "substantivo",
          tags: ["família"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "哥哥",
          pinyin: "gēge",
          translation: "irmão mais velho",
          learnedAt: days(-3),
          partOfSpeech: "substantivo",
          tags: ["família"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "姐姐",
          pinyin: "jiějie",
          translation: "irmã mais velha",
          learnedAt: days(-3),
          partOfSpeech: "substantivo",
          tags: ["família"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "米饭",
          pinyin: "mǐfàn",
          translation: "arroz",
          learnedAt: days(-2),
          partOfSpeech: "substantivo",
          tags: ["comida"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "水",
          pinyin: "shuǐ",
          translation: "água",
          learnedAt: days(-2),
          partOfSpeech: "substantivo",
          tags: ["comida"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "好吃",
          pinyin: "hǎochī",
          translation: "gostoso (comida)",
          learnedAt: days(-1),
          partOfSpeech: "adjetivo",
          tags: ["comida"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "喝",
          pinyin: "hē",
          translation: "beber",
          learnedAt: days(-1),
          partOfSpeech: "verbo",
          tags: ["comida"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Conversação em grupo: apresentações").id,
          hanzi: "认识",
          pinyin: "rènshi",
          translation: "conhecer (uma pessoa)",
          learnedAt: days(-1),
          partOfSpeech: "verbo",
          tags: ["conversação"],
        },
        {
          userId: user.id,
          lessonId: findLesson("Conversação em grupo: apresentações").id,
          hanzi: "高兴",
          pinyin: "gāoxìng",
          translation: "feliz, contente",
          learnedAt: days(0),
          partOfSpeech: "adjetivo",
          tags: ["conversação"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "巴西",
          pinyin: "bāxī",
          translation: "Brasil",
          learnedAt: days(0),
          partOfSpeech: "substantivo",
          tags: ["conversação"],
        },
        {
          userId: user.id,
          lessonId: null,
          hanzi: "名字",
          pinyin: "míngzi",
          translation: "nome",
          learnedAt: days(0),
          partOfSpeech: "substantivo",
          tags: ["conversação"],
        },
      ],
    });

    console.log(`Seeded ${words.length} words.`);

    const studyTasks = await prisma.studyTask.createManyAndReturn({
      data: [
        {
          userId: user.id,
          lessonId: findLesson("HSK1 - Saudações básicas").id,
          title: "Revisar vocabulário de saudações",
          type: "revisão",
          date: days(-9),
          status: "DONE",
          estimatedMinutes: 15,
          actualMinutes: 12,
        },
        {
          userId: user.id,
          lessonId: findLesson("Pronúncia de tons: 1º e 2º tom").id,
          title: "Praticar tons 1 e 2 em voz alta",
          type: "prática",
          date: days(-7),
          status: "DONE",
          estimatedMinutes: 20,
          actualMinutes: 25,
        },
        {
          userId: user.id,
          lessonId: null,
          title: "Flashcards de números",
          type: "estudo",
          date: days(-4),
          status: "DONE",
          estimatedMinutes: 10,
          actualMinutes: 10,
        },
        {
          userId: user.id,
          lessonId: findLesson("Pronúncia de tons: 3º e 4º tom").id,
          title: "Assistir aula de tons 3 e 4",
          type: "aula",
          date: days(-2),
          status: "SKIPPED",
          estimatedMinutes: 20,
        },
        {
          userId: user.id,
          lessonId: null,
          title: "Revisar notas de conversação",
          type: "revisão",
          date: days(0),
          status: "PENDING",
          estimatedMinutes: 15,
        },
        {
          userId: user.id,
          lessonId: null,
          title: "Praticar frases de apresentação com parceiro de estudo",
          type: "prática",
          date: days(0),
          status: "PENDING",
          estimatedMinutes: 20,
        },
        {
          userId: user.id,
          lessonId: findLesson("Família e relações").id,
          title: "Assistir aula de família e relações",
          type: "aula",
          date: days(2),
          status: "PENDING",
          estimatedMinutes: 24,
        },
        {
          userId: user.id,
          lessonId: findLesson("Comida e bebida: vocabulário essencial").id,
          title: "Flashcards de vocabulário de comida",
          type: "estudo",
          date: days(5),
          status: "PENDING",
          estimatedMinutes: 15,
        },
      ],
    });

    console.log(`Seeded ${studyTasks.length} study tasks.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
