export default function HhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-hilda-bg">
      <header className="border-b border-hilda-border/15 bg-hilda-surface">
        <div className="mx-auto max-w-2xl px-4 py-5 text-center">
          <p className="font-serif text-lg font-normal text-hilda-heading">
            Hilda Houseplant Hospital
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
