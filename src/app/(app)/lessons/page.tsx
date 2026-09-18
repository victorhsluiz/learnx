"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { CheckCircle2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useDeleteLesson,
  useLessons,
  useMarkLessonWatched,
  type Lesson,
  type LessonFilters,
} from "@/lib/queries/lessons";
import { LESSON_STATUS_LABELS, LESSON_TYPE_LABELS } from "./schemas";
import { LessonFormModal } from "./lesson-form-modal";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos os status" },
  ...Object.entries(LESSON_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  ...Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "gray",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
};

export default function LessonsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<string | null>("");
  const [type, setType] = useState<string | null>("");
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);

  const filters: LessonFilters = {
    q: debouncedSearch || undefined,
    status: (status || undefined) as LessonFilters["status"],
    type: (type || undefined) as LessonFilters["type"],
  };

  const lessonsQuery = useLessons(filters);
  const deleteLesson = useDeleteLesson();
  const markWatched = useMarkLessonWatched();

  const openCreateModal = () => {
    setEditingLesson(undefined);
    setModalOpened(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setModalOpened(true);
  };

  const handleDelete = (lesson: Lesson) => {
    if (window.confirm(`Excluir a aula "${lesson.title}"? Essa ação não pode ser desfeita.`)) {
      deleteLesson.mutate(lesson.id);
    }
  };

  const lessons = lessonsQuery.data?.lessons ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Aulas</Title>
        <Button leftSection={<Plus size={16} />} onClick={openCreateModal}>
          Nova aula
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Buscar por título"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Buscar aulas por título"
          w={240}
        />
        <Select
          aria-label="Filtrar por status"
          data={STATUS_FILTER_OPTIONS}
          value={status}
          onChange={setStatus}
          w={180}
        />
        <Select
          aria-label="Filtrar por tipo"
          data={TYPE_FILTER_OPTIONS}
          value={type}
          onChange={setType}
          w={180}
        />
      </Group>

      <Card shadow="sm" padding={0} radius="md" withBorder>
        {lessonsQuery.isLoading ? (
          <Text p="md" c="dimmed">
            Carregando aulas...
          </Text>
        ) : lessonsQuery.isError ? (
          <Text p="md" c="red" role="alert">
            Não foi possível carregar as aulas. Tente novamente.
          </Text>
        ) : lessons.length === 0 ? (
          <Text p="md" c="dimmed">
            Nenhuma aula encontrada. Crie a primeira com o botão &quot;Nova aula&quot;.
          </Text>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th aria-label="Ações" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lessons.map((lesson) => (
                <Table.Tr key={lesson.id}>
                  <Table.Td>{lesson.title}</Table.Td>
                  <Table.Td>{LESSON_TYPE_LABELS[lesson.type]}</Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[lesson.status]} variant="light">
                      {LESSON_STATUS_LABELS[lesson.status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {lesson.tags.map((tag) => (
                        <Badge key={tag} variant="outline" size="xs">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" aria-label={`Ações para ${lesson.title}`}>
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {lesson.status !== "COMPLETED" && (
                          <Menu.Item
                            leftSection={<CheckCircle2 size={14} />}
                            onClick={() => markWatched.mutate(lesson.id)}
                          >
                            Marcar como assistida
                          </Menu.Item>
                        )}
                        <Menu.Item
                          leftSection={<Pencil size={14} />}
                          onClick={() => openEditModal(lesson)}
                        >
                          Editar
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<Trash2 size={14} />}
                          onClick={() => handleDelete(lesson)}
                        >
                          Excluir
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <LessonFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        lesson={editingLesson}
      />
    </Stack>
  );
}
