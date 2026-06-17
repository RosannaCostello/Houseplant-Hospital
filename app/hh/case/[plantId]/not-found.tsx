export default function PublicPlantCaseNotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">Plant not found</h1>
      <p className="text-sm text-zinc-600">
        This link may be invalid or the plant record is no longer available.
      </p>
    </div>
  );
}
