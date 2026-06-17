import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/app" className="text-sm font-semibold text-zinc-900">
              Houseplant Hospital
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-600">
              <Link href="/app" className="hover:text-zinc-900">
                Dashboard
              </Link>
              <Link href="/app/check-in" className="hover:text-zinc-900">
                Check-in
              </Link>
              <Link href="/app/customers" className="hover:text-zinc-900">
                Customers
              </Link>
              <Link href="/settings" className="hover:text-zinc-900">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span className="hidden sm:inline">{user?.email}</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[100rem] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
