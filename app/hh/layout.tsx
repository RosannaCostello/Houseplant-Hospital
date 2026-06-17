export default function HhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-lg px-4 py-4 text-center">
          <p className="text-sm font-semibold text-zinc-900">Hilda Houseplant Hospital</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
