export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-hilda-bg px-6">
      <div className="w-full max-w-md rounded-none border border-hilda-border/15 bg-hilda-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-hilda-heading">Houseplant Hospital</h1>
        <p className="mt-1 text-sm text-hilda-text">Internal staff app</p>

        <div className="mt-6">
          <a className="inline-flex rounded-none bg-hilda-heading px-4 py-2.5 text-sm font-medium text-hilda-inverse" href="/app">
            Open app
          </a>
        </div>
      </div>
    </div>
  );
}
