import Link from "next/link";

export default function PlantNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-hilda-heading">Plant not found</h1>
      <p className="text-sm text-hilda-text">This plant may have been removed or the link is invalid.</p>
      <Link href="/app" className="inline-flex text-sm font-medium text-hilda-heading hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
