import Link from "next/link";

export default function VisitNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-hilda-heading">Visit not found</h1>
      <p className="text-sm text-hilda-text">This visit may have been removed or the link is invalid.</p>
      <Link href="/app" className="inline-flex text-sm font-medium text-hilda-heading hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
