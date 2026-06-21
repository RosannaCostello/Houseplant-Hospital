import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  isAdmin?: boolean;
};

export function AppShell({ children, userEmail, isAdmin = false }: AppShellProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <AppHeader userEmail={userEmail} />
      <main className="mx-auto flex h-full min-h-0 w-full max-w-[100rem] flex-1 flex-col overflow-x-hidden px-4 pt-3 sm:px-6 sm:pt-4">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
