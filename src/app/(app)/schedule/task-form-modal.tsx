"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Group, Input, Modal, Select, Stack, TextInput } from "@mantine/core";
import {
  NO_LESSON_VALUE,
  STUDY_TASK_STATUS_LABELS,
  studyTaskFormSchema,
  type StudyTaskFormValues,
} from "./schemas";
import { useCreateStudyTask, useUpdateStudyTask, type StudyTask } from "@/lib/queries/study-tasks";
import { useLessons } from "@/lib/queries/lessons";
import { ApiError } from "@/lib/api-client";

const STATUS_OPTIONS = Object.entries(STUDY_TASK_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function todayAsDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TaskFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided, the modal edits this task instead of creating a new one. */
  task?: StudyTask;
}

export function TaskFormModal({ opened, onClose, task }: TaskFormModalProps) {
  const isEditing = Boolean(task);
  const createStudyTask = useCreateStudyTask();
  const updateStudyTask = useUpdateStudyTask();
  const mutation = isEditing ? updateStudyTask : createStudyTask;
  const lessonsQuery = useLessons();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudyTaskFormValues>({
    resolver: zodResolver(studyTaskFormSchema),
    defaultValues: {
      title: "",
      type: "",
      date: todayAsDateInputValue(),
      status: "PENDING",
      lessonId: NO_LESSON_VALUE,
      estimatedMinutes: "",
      actualMinutes: "",
    },
  });

  useEffect(() => {
    if (opened) {
      reset({
        title: task?.title ?? "",
        type: task?.type ?? "",
        date: task?.date.slice(0, 10) ?? todayAsDateInputValue(),
        status: task?.status ?? "PENDING",
        lessonId: task?.lessonId ?? NO_LESSON_VALUE,
        estimatedMinutes: task?.estimatedMinutes?.toString() ?? "",
        actualMinutes: task?.actualMinutes?.toString() ?? "",
      });
    }
  }, [opened, task, reset]);

  const lessonOptions = [
    { value: NO_LESSON_VALUE, label: "Sem aula" },
    ...(lessonsQuery.data?.lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })) ??
      []),
  ];

  const onSubmit = (values: StudyTaskFormValues) => {
    const input = {
      title: values.title,
      type: values.type,
      date: new Date(values.date).toISOString(),
      status: values.status,
      lessonId: values.lessonId === NO_LESSON_VALUE ? null : values.lessonId,
      estimatedMinutes: values.estimatedMinutes.trim()
        ? Number(values.estimatedMinutes)
        : undefined,
      actualMinutes: values.actualMinutes.trim() ? Number(values.actualMinutes) : undefined,
    };

    if (isEditing && task) {
      updateStudyTask.mutate({ id: task.id, input }, { onSuccess: onClose });
    } else {
      createStudyTask.mutate(input, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Editar tarefa" : "Nova tarefa"}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          {mutation.isError && (
            <Alert color="red" role="alert">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "Não foi possível salvar a tarefa. Tente novamente."}
            </Alert>
          )}

          <TextInput
            label="Título"
            data-autofocus
            error={errors.title?.message}
            {...register("title")}
          />

          <TextInput
            label="Tipo"
            placeholder="estudo, revisão, prática..."
            error={errors.type?.message}
            {...register("type")}
          />

          <Input.Wrapper label="Data" error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </Input.Wrapper>

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
            label="Minutos estimados"
            type="number"
            error={errors.estimatedMinutes?.message}
            {...register("estimatedMinutes")}
          />

          <TextInput
            label="Minutos reais"
            type="number"
            error={errors.actualMinutes?.message}
            {...register("actualMinutes")}
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
