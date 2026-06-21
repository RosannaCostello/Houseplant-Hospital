export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-none border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Houseplant Hospital</h1>
        <p className="mt-1 text-sm text-zinc-600">Internal staff app</p>

        <div className="mt-6">
          <a className="inline-flex rounded-none bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white" href="/app">
            Open app
          </a>
        </div>
      </div>
    </div>
  );
}
