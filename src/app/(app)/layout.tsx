"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, Burger, Group, NavLink, Skeleton, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSession, useLogout } from "@/lib/queries/auth";
import { NAV_LINKS } from "./nav-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.push("/login"),
    });
  };

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>LearnX</Title>
          </Group>

          <Group gap="sm">
            {session.isLoading ? (
              <Skeleton height={20} width={120} />
            ) : (
              <Text size="sm" c="dimmed">
                {session.data?.name}
              </Text>
            )}
            <NavLink label="Sair" onClick={handleLogout} style={{ flex: "0 0 auto" }} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.href}
            component={Link}
            href={link.href}
            label={link.label}
            active={pathname === link.href}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
