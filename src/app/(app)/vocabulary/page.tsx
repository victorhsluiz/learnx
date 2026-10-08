"use client";

import { useState } from "react";
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
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useDeleteWord, useWords, type Word, type WordFilters } from "@/lib/queries/vocabulary";
import { useLessons } from "@/lib/queries/lessons";
import { WordFormModal } from "./word-form-modal";

export default function VocabularyPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [tag, setTag] = useState("");
  const [debouncedTag] = useDebouncedValue(tag, 300);
  const [lessonFilter, setLessonFilter] = useState<string | null>("");
  const [learnedAfter, setLearnedAfter] = useState("");
  const [learnedBefore, setLearnedBefore] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);

  const filters: WordFilters = {
    q: debouncedSearch || undefined,
    tag: debouncedTag || undefined,
    lessonId: lessonFilter || undefined,
    learnedAfter: learnedAfter ? new Date(learnedAfter).toISOString() : undefined,
    learnedBefore: learnedBefore ? new Date(learnedBefore).toISOString() : undefined,
  };

  const wordsQuery = useWords(filters);
  const deleteWord = useDeleteWord();
  const lessonsQuery = useLessons();

  const lessons = lessonsQuery.data?.lessons ?? [];
  const lessonFilterOptions = [
    { value: "", label: "Todas as aulas" },
    ...lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })),
  ];

  const openCreateModal = () => {
    setEditingWord(undefined);
    setModalOpened(true);
  };

  const openEditModal = (word: Word) => {
    setEditingWord(word);
    setModalOpened(true);
  };

  const handleDelete = (word: Word) => {
    if (window.confirm(`Excluir a palavra "${word.hanzi}"? Essa ação não pode ser desfeita.`)) {
      deleteWord.mutate(word.id);
    }
  };

  const words = wordsQuery.data?.words ?? [];

  const lessonTitleFor = (lessonId: string | null): string => {
    if (!lessonId) {
      return "—";
    }
    return lessons.find((lesson) => lesson.id === lessonId)?.title ?? "—";
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Vocabulário</Title>
        <Button leftSection={<Plus size={16} />} onClick={openCreateModal}>
          Nova palavra
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Buscar por hanzi, pinyin ou tradução"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Buscar palavras por hanzi, pinyin ou tradução"
          w={280}
        />
        <TextInput
          placeholder="Tag"
          value={tag}
          onChange={(event) => setTag(event.currentTarget.value)}
          aria-label="Filtrar por tag"
          w={160}
        />
        <Select
          aria-label="Filtrar por aula"
          data={lessonFilterOptions}
          value={lessonFilter}
          onChange={setLessonFilter}
          w={200}
        />
        <Input.Wrapper label="De">
          <Input
            type="date"
            aria-label="Aprendida a partir de"
            value={learnedAfter}
            onChange={(event) => setLearnedAfter(event.currentTarget.value)}
          />
        </Input.Wrapper>
        <Input.Wrapper label="Até">
          <Input
            type="date"
            aria-label="Aprendida até"
            value={learnedBefore}
            onChange={(event) => setLearnedBefore(event.currentTarget.value)}
          />
        </Input.Wrapper>
      </Group>

      <Card shadow="sm" padding={0} radius="md" withBorder>
        {wordsQuery.isLoading ? (
          <Text p="md" c="dimmed">
            Carregando palavras...
          </Text>
        ) : wordsQuery.isError ? (
          <Text p="md" c="red" role="alert">
            Não foi possível carregar as palavras. Tente novamente.
          </Text>
        ) : words.length === 0 ? (
          <Text p="md" c="dimmed">
            Nenhuma palavra encontrada. Crie a primeira com o botão &quot;Nova palavra&quot;.
          </Text>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Hanzi</Table.Th>
                <Table.Th>Pinyin</Table.Th>
                <Table.Th>Tradução</Table.Th>
                <Table.Th>Aula</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Aprendida em</Table.Th>
                <Table.Th aria-label="Ações" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {words.map((word) => (
                <Table.Tr key={word.id}>
                  <Table.Td>{word.hanzi}</Table.Td>
                  <Table.Td>{word.pinyin}</Table.Td>
                  <Table.Td>{word.translation}</Table.Td>
                  <Table.Td>{lessonTitleFor(word.lessonId)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {word.tags.map((tag) => (
                        <Badge key={tag} variant="outline" size="xs">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>{new Date(word.learnedAt).toLocaleDateString("pt-BR")}</Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" aria-label={`Ações para ${word.hanzi}`}>
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<Pencil size={14} />}
                          onClick={() => openEditModal(word)}
                        >
                          Editar
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<Trash2 size={14} />}
                          onClick={() => handleDelete(word)}
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

      <WordFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        word={editingWord}
      />
    </Stack>
  );
}
