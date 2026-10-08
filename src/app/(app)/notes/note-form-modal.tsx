"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import ReactMarkdown from "react-markdown";
import { NO_LESSON_VALUE, noteFormSchema, type NoteFormValues } from "./schemas";
import { useCreateNote, useUpdateNote, type Note } from "@/lib/queries/notes";
import { useLessons } from "@/lib/queries/lessons";
import { ApiError } from "@/lib/api-client";

function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

interface NoteFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided, the modal edits this note instead of creating a new one. */
  note?: Note;
}

export function NoteFormModal({ opened, onClose, note }: NoteFormModalProps) {
  const isEditing = Boolean(note);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const mutation = isEditing ? updateNote : createNote;
  const lessonsQuery = useLessons();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: "",
      contentMarkdown: "",
      lessonId: NO_LESSON_VALUE,
      tagsInput: "",
    },
  });

  useEffect(() => {
    if (opened) {
      reset({
        title: note?.title ?? "",
        contentMarkdown: note?.contentMarkdown ?? "",
        lessonId: note?.lessonId ?? NO_LESSON_VALUE,
        tagsInput: note?.tags.join(", ") ?? "",
      });
    }
  }, [opened, note, reset]);

  const contentMarkdown = useWatch({ control, name: "contentMarkdown" });

  const lessonOptions = [
    { value: NO_LESSON_VALUE, label: "Sem aula" },
    ...(lessonsQuery.data?.lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })) ??
      []),
  ];

  const onSubmit = (values: NoteFormValues) => {
    const input = {
      title: values.title,
      contentMarkdown: values.contentMarkdown,
      lessonId: values.lessonId === NO_LESSON_VALUE ? null : values.lessonId,
      tags: parseTags(values.tagsInput),
    };

    if (isEditing && note) {
      updateNote.mutate({ id: note.id, input }, { onSuccess: onClose });
    } else {
      createNote.mutate(input, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Editar anotação" : "Nova anotação"}
      centered
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          {mutation.isError && (
            <Alert color="red" role="alert">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "Não foi possível salvar a anotação. Tente novamente."}
            </Alert>
          )}

          <TextInput
            label="Título"
            data-autofocus
            error={errors.title?.message}
            {...register("title")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Textarea
              label="Conteúdo (Markdown)"
              minRows={8}
              autosize
              error={errors.contentMarkdown?.message}
              {...register("contentMarkdown")}
            />
            <Stack gap={4}>
              <Text size="sm">Pré-visualização</Text>
              <Paper withBorder p="sm" className="min-h-[8rem]">
                <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
              </Paper>
            </Stack>
          </div>

          <Controller
            control={control}
            name="lessonId"
            render={({ field }) => (
              <Select
                label="Aula"
                data={lessonOptions}
                value={field.value}
                onChange={(value) => field.onChange(value ?? NO_LESSON_VALUE)}
                error={errors.lessonId?.message}
                allowDeselect={false}
              />
            )}
          />

          <TextInput
            label="Tags"
            description="Separadas por vírgula"
            placeholder="hsk1, tons"
            {...register("tagsInput")}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
