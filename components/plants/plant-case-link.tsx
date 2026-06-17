import Link from "next/link";

type PlantCaseLinkProps = {
  plantId: string;
  className?: string;
};

/** Relative case URL — always resolves to the current site origin in the browser. */
export function PlantCaseLink({ plantId, className }: PlantCaseLinkProps) {
  return (
    <Link href={`/hh/case/${plantId}`} target="_blank" rel="noopener noreferrer" className={className}>
      Open QR case page
    </Link>
  );
}
