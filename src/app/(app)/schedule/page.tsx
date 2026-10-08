"use client";

import { Fragment, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Input,
  Menu,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { CheckCircle2, MoreVertical, Pencil, SkipForward, Plus, Trash2 } from "lucide-react";
import {
  useDeleteStudyTask,
  useMarkStudyTaskStatus,
  useStudyTasks,
  type StudyTask,
  type StudyTaskFilters,
} from "@/lib/queries/study-tasks";
import { useLessons } from "@/lib/queries/lessons";
import { STUDY_TASK_STATUS_LABELS } from "./schemas";
import { TaskFormModal } from "./task-form-modal";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos os status" },
  ...Object.entries(STUDY_TASK_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "gray",
  DONE: "green",
  SKIPPED: "yellow",
};

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMinutes(task: StudyTask): string {
  if (task.estimatedMinutes == null && task.actualMinutes == null) {
    return "—";
  }
  const estimated = task.estimatedMinutes ?? "—";
  const actual = task.actualMinutes ?? "—";
  return `${estimated} / ${actual} min`;
}

export default function SchedulePage() {
  const [status, setStatus] = useState<string | null>("");
  const [type, setType] = useState("");
  const [debouncedType] = useDebouncedValue(type, 300);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | undefined>(undefined);

  const filters: StudyTaskFilters = {
    status: (status || undefined) as StudyTaskFilters["status"],
    type: debouncedType || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
  };

  const studyTasksQuery = useStudyTasks(filters);
  const deleteStudyTask = useDeleteStudyTask();
  const markStatus = useMarkStudyTaskStatus();
  const lessonsQuery = useLessons();

  const lessons = lessonsQuery.data?.lessons ?? [];

  const openCreateModal = () => {
    setEditingTask(undefined);
    setModalOpened(true);
  };

  const openEditModal = (task: StudyTask) => {
    setEditingTask(task);
    setModalOpened(true);
  };

  const handleDelete = (task: StudyTask) => {
    if (window.confirm(`Excluir a tarefa "${task.title}"? Essa ação não pode ser desfeita.`)) {
      deleteStudyTask.mutate(task.id);
    }
  };

  const lessonTitleFor = (lessonId: string | null): string => {
    if (!lessonId) {
      return "—";
    }
    return lessons.find((lesson) => lesson.id === lessonId)?.title ?? "—";
  };

  const tasks = studyTasksQuery.data?.studyTasks ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Cronograma</Title>
        <Button leftSection={<Plus size={16} />} onClick={openCreateModal}>
          Nova tarefa
        </Button>
      </Group>

      <Group>
        <Select
          aria-label="Filtrar por status"
          data={STATUS_FILTER_OPTIONS}
          value={status}
          onChange={setStatus}
          w={180}
        />
        <TextInput
          placeholder="Tipo"
          value={type}
          onChange={(event) => setType(event.currentTarget.value)}
          aria-label="Filtrar por tipo"
          w={160}
        />
        <Input.Wrapper label="De">
          <Input
            type="date"
            aria-label="Data a partir de"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.currentTarget.value)}
          />
        </Input.Wrapper>
        <Input.Wrapper label="Até">
          <Input
            type="date"
            aria-label="Data até"
            value={dateTo}
            onChange={(event) => setDateTo(event.currentTarget.value)}
          />
        </Input.Wrapper>
      </Group>

      <Card shadow="sm" padding={0} radius="md" withBorder>
        {studyTasksQuery.isLoading ? (
          <Text p="md" c="dimmed">
            Carregando tarefas...
          </Text>
        ) : studyTasksQuery.isError ? (
          <Text p="md" c="red" role="alert">
            Não foi possível carregar as tarefas. Tente novamente.
          </Text>
        ) : tasks.length === 0 ? (
          <Text p="md" c="dimmed">
            Nenhuma tarefa encontrada. Crie a primeira com o botão &quot;Nova tarefa&quot;.
          </Text>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Minutos (est. / real)</Table.Th>
                <Table.Th>Aula</Table.Th>
                <Table.Th aria-label="Ações" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task, index) => {
                const taskDate = new Date(task.date);
                const previousTask = tasks[index - 1];
                const isNewDateGroup =
                  !previousTask ||
                  new Date(previousTask.date).toDateString() !== taskDate.toDateString();

                return (
                  <Fragment key={task.id}>
                    {isNewDateGroup && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text size="sm" fw={600} c="dimmed">
                            {formatDateHeader(taskDate)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                    <Table.Tr>
                      <Table.Td>{task.title}</Table.Td>
                      <Table.Td>{task.type}</Table.Td>
                      <Table.Td>
                        <Badge color={STATUS_COLORS[task.status]} variant="light">
                          {STUDY_TASK_STATUS_LABELS[task.status]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatMinutes(task)}</Table.Td>
                      <Table.Td>{lessonTitleFor(task.lessonId)}</Table.Td>
                      <Table.Td>
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" aria-label={`Ações para ${task.title}`}>
                              <MoreVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            {task.status !== "DONE" && (
                              <Menu.Item
                                leftSection={<CheckCircle2 size={14} />}
                                onClick={() => markStatus.mutate({ id: task.id, status: "DONE" })}
                              >
                                Marcar feito
                              </Menu.Item>
                            )}
                            {task.status !== "SKIPPED" && (
                              <Menu.Item
                                leftSection={<SkipForward size={14} />}
                                onClick={() =>
                                  markStatus.mutate({ id: task.id, status: "SKIPPED" })
                                }
                              >
                                Marcar pulado
                              </Menu.Item>
                            )}
                            <Menu.Item
                              leftSection={<Pencil size={14} />}
                              onClick={() => openEditModal(task)}
                            >
                              Editar
                            </Menu.Item>
                            <Menu.Item
                              color="red"
                              leftSection={<Trash2 size={14} />}
                              onClick={() => handleDelete(task)}
                            >
                              Excluir
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  </Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <TaskFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        task={editingTask}
      />
    </Stack>
  );
}
