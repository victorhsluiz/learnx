"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Card, Stack, Text, TextInput, Title } from "@mantine/core";
import { loginFormSchema, type LoginFormValues } from "../schemas";
import { useLogin } from "@/lib/queries/auth";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<Card shadow="sm" padding="lg" radius="md" withBorder w={360} />}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * useSearchParams() opts the component into client-side rendering during
 * static generation, which Next.js requires wrapping in <Suspense> for —
 * otherwise the build fails on this page. Splitting the form out keeps
 * the fallback trivial (a same-sized empty card) instead of duplicating
 * markup.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => {
        const redirectTo = searchParams.get("from") ?? "/dashboard";
        router.push(redirectTo);
      },
    });
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder w={360}>
      <Stack gap="md">
        <div>
          <Title order={2}>Entrar</Title>
          <Text c="dimmed" size="sm">
            Continue seus estudos de mandarim
          </Text>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack gap="sm">
            {login.isError && (
              <Alert color="red" role="alert">
                {login.error instanceof ApiError
                  ? login.error.message
                  : "Não foi possível entrar. Tente novamente."}
              </Alert>
            )}

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
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" fullWidth loading={login.isPending}>
              Entrar
            </Button>
          </Stack>
        </form>

        <Text size="sm" ta="center">
          Ainda não tem conta?{" "}
          <Anchor component={Link} href="/register" size="sm">
            Criar conta
          </Anchor>
        </Text>
      </Stack>
    </Card>
  );
}
