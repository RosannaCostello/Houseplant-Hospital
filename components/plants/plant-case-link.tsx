import Link from "next/link";

type PlantCaseLinkProps = {
  visitId: string;
  /** Optional plant to highlight on the Care Card. */
  plantId?: string;
  className?: string;
};

/** Relative Care Card URL — current site origin in the browser. */
export function PlantCaseLink({ visitId, plantId, className }: PlantCaseLinkProps) {
  const href =
    plantId != null && plantId.length > 0
      ? `/hh/care/${visitId}?plant=${plantId}`
      : `/hh/care/${visitId}`;

  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Open Care Card
    </Link>
  );
}
