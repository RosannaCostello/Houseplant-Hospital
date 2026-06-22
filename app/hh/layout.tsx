export default function HhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-hilda-bg">
      <header className="border-b border-hilda-border/15 bg-hilda-surface">
        <div className="mx-auto max-w-lg px-4 py-4 text-center">
          <p className="text-sm font-semibold text-hilda-heading">Hilda Houseplant Hospital</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
