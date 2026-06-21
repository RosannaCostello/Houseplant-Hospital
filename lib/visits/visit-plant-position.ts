export type VisitPlantPosition = {
  index: number;
  total: number;
};

export function formatVisitPlantPosition(index: number, total: number): string {
  return `${index}/${total}`;
}

type VisitPlantRow = {
  id: string;
  visit_id: string;
  created_at: string;
};

export function buildVisitPlantPositions<T extends VisitPlantRow>(
  rows: T[],
): Map<string, VisitPlantPosition> {
  const byVisit = new Map<string, T[]>();

  for (const row of rows) {
    const list = byVisit.get(row.visit_id) ?? [];
    list.push(row);
    byVisit.set(row.visit_id, list);
  }

  const positions = new Map<string, VisitPlantPosition>();

  for (const visitRows of byVisit.values()) {
    const sorted = [...visitRows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    sorted.forEach((row, index) => {
      positions.set(row.id, { index: index + 1, total: sorted.length });
    });
  }

  return positions;
}

export function visitPlantPositionFromOrderedIds(
  plantId: string,
  orderedPlantIds: string[],
): VisitPlantPosition {
  const index = orderedPlantIds.findIndex((id) => id === plantId);

  return {
    index: index >= 0 ? index + 1 : 1,
    total: orderedPlantIds.length || 1,
  };
}
