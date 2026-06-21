import Link from "next/link";

type AppHeaderProps = {
  userEmail?: string | null;
};

export function AppHeader({ userEmail }: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-hilda-gold/30 bg-hilda-deep">
      <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/app"
          className="font-serif text-base font-normal tracking-tight text-hilda-gold"
        >
          Houseplant Hospital
        </Link>
        <div className="flex items-center gap-4">
          {userEmail ? (
            <span className="hidden max-w-[14rem] truncate text-sm text-hilda-gold/55 sm:inline">
              {userEmail}
            </span>
          ) : null}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="border border-hilda-gold/45 bg-transparent px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-hilda-gold transition-colors hover:border-hilda-gold hover:bg-hilda-gold/10"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
