"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Group, Modal, Select, Stack, TextInput } from "@mantine/core";
import {
  LESSON_STATUS_LABELS,
  LESSON_TYPE_LABELS,
  lessonFormSchema,
  type LessonFormValues,
} from "./schemas";
import { useCreateLesson, useUpdateLesson, type Lesson } from "@/lib/queries/lessons";
import { ApiError } from "@/lib/api-client";

const TYPE_OPTIONS = Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(LESSON_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

interface LessonFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided, the modal edits this lesson instead of creating a new one. */
  lesson?: Lesson;
}

export function LessonFormModal({ opened, onClose, lesson }: LessonFormModalProps) {
  const isEditing = Boolean(lesson);
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const mutation = isEditing ? updateLesson : createLesson;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      type: "RECORDED",
      status: "PENDING",
      sourceUrl: "",
      tagsInput: "",
    },
  });

  useEffect(() => {
    if (opened) {
      reset({
        title: lesson?.title ?? "",
        type: lesson?.type ?? "RECORDED",
        status: lesson?.status ?? "PENDING",
        sourceUrl: lesson?.sourceUrl ?? "",
        tagsInput: lesson?.tags.join(", ") ?? "",
      });
    }
  }, [opened, lesson, reset]);

  const onSubmit = (values: LessonFormValues) => {
    const input = {
      title: values.title,
      type: values.type,
      status: values.status,
      sourceUrl: values.sourceUrl,
      tags: parseTags(values.tagsInput),
    };

    if (isEditing && lesson) {
      updateLesson.mutate({ id: lesson.id, input }, { onSuccess: onClose });
    } else {
      createLesson.mutate(input, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Editar aula" : "Nova aula"}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          {mutation.isError && (
            <Alert color="red" role="alert">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "Não foi possível salvar a aula. Tente novamente."}
            </Alert>
          )}

          <TextInput
            label="Título"
            data-autofocus
            error={errors.title?.message}
            {...register("title")}
          />

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                label="Tipo"
                data={TYPE_OPTIONS}
                value={field.value}
                onChange={(value) => field.onChange(value ?? "RECORDED")}
                error={errors.type?.message}
                allowDeselect={false}
              />
            )}
          />

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                label="Status"
                data={STATUS_OPTIONS}
                value={field.value}
                onChange={(value) => field.onChange(value ?? "PENDING")}
                error={errors.status?.message}
                allowDeselect={false}
              />
            )}
          />

          <TextInput
            label="Link (opcional)"
            placeholder="https://..."
            error={errors.sourceUrl?.message}
            {...register("sourceUrl")}
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
