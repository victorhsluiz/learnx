"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  Input,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { NO_LESSON_VALUE, wordFormSchema, type WordFormValues } from "./schemas";
import { useCreateWord, useUpdateWord, type Word } from "@/lib/queries/vocabulary";
import { useLessons } from "@/lib/queries/lessons";
import { ApiError } from "@/lib/api-client";

function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function todayAsDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

interface WordFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided, the modal edits this word instead of creating a new one. */
  word?: Word;
}

export function WordFormModal({ opened, onClose, word }: WordFormModalProps) {
  const isEditing = Boolean(word);
  const createWord = useCreateWord();
  const updateWord = useUpdateWord();
  const mutation = isEditing ? updateWord : createWord;
  const lessonsQuery = useLessons();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WordFormValues>({
    resolver: zodResolver(wordFormSchema),
    defaultValues: {
      hanzi: "",
      pinyin: "",
      translation: "",
      lessonId: NO_LESSON_VALUE,
      learnedAt: todayAsDateInputValue(),
      tagsInput: "",
      partOfSpeech: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (opened) {
      reset({
        hanzi: word?.hanzi ?? "",
        pinyin: word?.pinyin ?? "",
        translation: word?.translation ?? "",
        lessonId: word?.lessonId ?? NO_LESSON_VALUE,
        learnedAt: word?.learnedAt.slice(0, 10) ?? todayAsDateInputValue(),
        tagsInput: word?.tags.join(", ") ?? "",
        partOfSpeech: word?.partOfSpeech ?? "",
        notes: word?.notes ?? "",
      });
    }
  }, [opened, word, reset]);

  const lessonOptions = [
    { value: NO_LESSON_VALUE, label: "Sem aula" },
    ...(lessonsQuery.data?.lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })) ??
      []),
  ];

  const onSubmit = (values: WordFormValues) => {
    const input = {
      hanzi: values.hanzi,
      pinyin: values.pinyin,
      translation: values.translation,
      lessonId: values.lessonId === NO_LESSON_VALUE ? null : values.lessonId,
      learnedAt: new Date(values.learnedAt).toISOString(),
      tags: parseTags(values.tagsInput),
      partOfSpeech: values.partOfSpeech.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };

    if (isEditing && word) {
      updateWord.mutate({ id: word.id, input }, { onSuccess: onClose });
    } else {
      createWord.mutate(input, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Editar palavra" : "Nova palavra"}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          {mutation.isError && (
            <Alert color="red" role="alert">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "Não foi possível salvar a palavra. Tente novamente."}
            </Alert>
          )}

          <TextInput
            label="Hanzi"
            data-autofocus
            error={errors.hanzi?.message}
            {...register("hanzi")}
          />

          <TextInput label="Pinyin" error={errors.pinyin?.message} {...register("pinyin")} />

          <TextInput
            label="Tradução"
            error={errors.translation?.message}
            {...register("translation")}
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

          <Input.Wrapper label="Aprendida em" error={errors.learnedAt?.message}>
            <Input type="date" {...register("learnedAt")} />
          </Input.Wrapper>

          <TextInput
            label="Tags"
            description="Separadas por vírgula"
            placeholder="hsk1, tons"
            {...register("tagsInput")}
          />

          <TextInput
            label="Classe gramatical"
            placeholder="substantivo, verbo..."
            {...register("partOfSpeech")}
          />

          <Textarea label="Notas" minRows={2} autosize {...register("notes")} />

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
