import { Badge, Button, Card, Stack, Text, Title } from "@mantine/core";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-md">
        <Stack gap="sm">
          <Badge color="blue" variant="light" className="self-start">
            LearnX
          </Badge>
          <Title order={2}>Gerenciador de estudos de mandarim</Title>
          <Text c="dimmed" size="sm">
            Vocabulário, aulas, anotações e cronograma de estudo em um só lugar.
          </Text>
          <Button variant="filled" fullWidth>
            Começar
          </Button>
        </Stack>
      </Card>
    </div>
  );
}
