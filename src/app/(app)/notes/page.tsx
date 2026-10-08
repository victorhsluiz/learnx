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
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useDeleteNote, useNotes, type Note, type NoteFilters } from "@/lib/queries/notes";
import { useLessons } from "@/lib/queries/lessons";
import { NoteFormModal } from "./note-form-modal";

function excerpt(contentMarkdown: string): string {
  return contentMarkdown.length > 80 ? `${contentMarkdown.slice(0, 80)}…` : contentMarkdown;
}

export default function NotesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [lessonFilter, setLessonFilter] = useState<string | null>("");
  const [modalOpened, setModalOpened] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  const filters: NoteFilters = {
    q: debouncedSearch || undefined,
    lessonId: lessonFilter || undefined,
  };

  const notesQuery = useNotes(filters);
  const deleteNote = useDeleteNote();
  const lessonsQuery = useLessons();

  const lessons = lessonsQuery.data?.lessons ?? [];
  const lessonFilterOptions = [
    { value: "", label: "Todas as aulas" },
    ...lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })),
  ];

  const openCreateModal = () => {
    setEditingNote(undefined);
    setModalOpened(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setModalOpened(true);
  };

  const handleDelete = (note: Note) => {
    if (window.confirm(`Excluir a anotação "${note.title}"? Essa ação não pode ser desfeita.`)) {
      deleteNote.mutate(note.id);
    }
  };

  const notes = notesQuery.data?.notes ?? [];

  const lessonTitleFor = (lessonId: string | null): string => {
    if (!lessonId) {
      return "—";
    }
    return lessons.find((lesson) => lesson.id === lessonId)?.title ?? "—";
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Anotações</Title>
        <Button leftSection={<Plus size={16} />} onClick={openCreateModal}>
          Nova anotação
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Buscar por título ou conteúdo"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Buscar anotações por título ou conteúdo"
          w={280}
        />
        <Select
          aria-label="Filtrar por aula"
          data={lessonFilterOptions}
          value={lessonFilter}
          onChange={setLessonFilter}
          w={200}
        />
      </Group>

      <Card shadow="sm" padding={0} radius="md" withBorder>
        {notesQuery.isLoading ? (
          <Text p="md" c="dimmed">
            Carregando anotações...
          </Text>
        ) : notesQuery.isError ? (
          <Text p="md" c="red" role="alert">
            Não foi possível carregar as anotações. Tente novamente.
          </Text>
        ) : notes.length === 0 ? (
          <Text p="md" c="dimmed">
            Nenhuma anotação encontrada. Crie a primeira com o botão &quot;Nova anotação&quot;.
          </Text>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Conteúdo</Table.Th>
                <Table.Th>Aula</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Criada em</Table.Th>
                <Table.Th aria-label="Ações" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {notes.map((note) => (
                <Table.Tr key={note.id}>
                  <Table.Td>{note.title}</Table.Td>
                  <Table.Td>{excerpt(note.contentMarkdown)}</Table.Td>
                  <Table.Td>{lessonTitleFor(note.lessonId)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="outline" size="xs">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>{new Date(note.createdAt).toLocaleDateString("pt-BR")}</Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" aria-label={`Ações para ${note.title}`}>
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<Pencil size={14} />}
                          onClick={() => openEditModal(note)}
                        >
                          Editar
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<Trash2 size={14} />}
                          onClick={() => handleDelete(note)}
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

      <NoteFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        note={editingNote}
      />
    </Stack>
  );
}
