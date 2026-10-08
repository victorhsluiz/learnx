"use client";

import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useSession } from "@/lib/queries/auth";
import { useDashboardSummary } from "@/lib/queries/dashboard";

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text fw={700} size="xl">
        {value}
      </Text>
    </Card>
  );
}

export default function DashboardPage() {
  const session = useSession();
  const summaryQuery = useDashboardSummary();
  const summary = summaryQuery.data;

  return (
    <Stack gap="md">
      <Title order={2}>Painel</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>
          {session.data ? `Bem-vindo(a), ${session.data.name}.` : "Carregando sua sessão..."}
        </Text>
      </Card>

      {summaryQuery.isLoading ? (
        <Text c="dimmed">Carregando resumo...</Text>
      ) : summaryQuery.isError ? (
        <Text c="red" role="alert">
          Não foi possível carregar o resumo. Tente novamente.
        </Text>
      ) : summary ? (
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={3}>Palavras</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <StatCard label="Palavras aprendidas" value={summary.words.total} />
              <StatCard label="Últimos 7 dias" value={summary.words.last7Days} />
            </SimpleGrid>
          </Stack>

          <Stack gap="xs">
            <Title order={3}>Aulas</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <StatCard label="Aulas concluídas" value={summary.lessons.completed} />
              <StatCard label="Aulas pendentes" value={summary.lessons.pending} />
            </SimpleGrid>
          </Stack>

          <Stack gap="xs">
            <Title order={3}>Cronograma</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <StatCard label="Tarefas para hoje" value={summary.scheduleTasks.dueToday} />
              <StatCard label="Tarefas na semana" value={summary.scheduleTasks.dueThisWeek} />
            </SimpleGrid>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
