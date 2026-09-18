"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Card, Stack, Text, TextInput, Title } from "@mantine/core";
import { registerFormSchema, type RegisterFormValues } from "../schemas";
import { useRegister } from "@/lib/queries/auth";
import { ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
  });

  const onSubmit = (values: RegisterFormValues) => {
    registerUser.mutate(values, {
      onSuccess: () => router.push("/dashboard"),
    });
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder w={360}>
      <Stack gap="md">
        <div>
          <Title order={2}>Criar conta</Title>
          <Text c="dimmed" size="sm">
            Comece a registrar seu progresso
          </Text>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack gap="sm">
            {registerUser.isError && (
              <Alert color="red" role="alert">
                {registerUser.error instanceof ApiError
                  ? registerUser.error.message
                  : "Não foi possível criar a conta. Tente novamente."}
              </Alert>
            )}

            <TextInput
              label="Nome"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextInput
              label="Senha"
              type="password"
              autoComplete="new-password"
              description="Pelo menos 8 caracteres"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" fullWidth loading={registerUser.isPending}>
              Criar conta
            </Button>
          </Stack>
        </form>

        <Text size="sm" ta="center">
          Já tem conta?{" "}
          <Anchor component={Link} href="/login" size="sm">
            Entrar
          </Anchor>
        </Text>
      </Stack>
    </Card>
  );
}
