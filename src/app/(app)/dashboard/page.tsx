"use client";

import { Card, Stack, Text, Title } from "@mantine/core";
import { useSession } from "@/lib/queries/auth";

export default function DashboardPage() {
  const session = useSession();

  return (
    <Stack gap="md">
      <Title order={2}>Painel</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>
          {session.data ? `Bem-vindo(a), ${session.data.name}.` : "Carregando sua sessão..."}
        </Text>
        <Text c="dimmed" size="sm" mt="xs">
          Métricas de progresso (palavras aprendidas, aulas concluídas, minutos estudados) chegam na
          fase de consolidação do roadmap.
        </Text>
      </Card>
    </Stack>
  );
}
