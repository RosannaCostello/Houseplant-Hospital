export const CARE_TIP_CATEGORIES = ["water", "leaves", "light"] as const;

export type CareTipCategory = (typeof CARE_TIP_CATEGORIES)[number];

export const CARE_TIP_CATEGORY_LABELS: Record<CareTipCategory, string> = {
  water: "Water",
  leaves: "Leaves",
  light: "Light",
};

export type CareTipSelections = Record<CareTipCategory, string>;

export type ParsedCareTip =
  | { kind: "structured"; selections: CareTipSelections }
  | { kind: "legacy"; content: string }
  | { kind: "empty" };

const LINE_PATTERN: Record<CareTipCategory, RegExp> = {
  water: /^Water:\s*(.+)$/i,
  leaves: /^Leaves:\s*(.+)$/i,
  light: /^Light:\s*(.+)$/i,
};

export function composeCareTip(selections: CareTipSelections): string {
  return [
    `Water: ${selections.water.trim()}`,
    `Leaves: ${selections.leaves.trim()}`,
    `Light: ${selections.light.trim()}`,
  ].join("\n");
}

export function isCompleteCareTipSelections(
  selections: Partial<CareTipSelections> | CareTipSelections,
): selections is CareTipSelections {
  return CARE_TIP_CATEGORIES.every((category) => {
    const value = selections[category];
    return Boolean(value && value.trim().length > 0);
  });
}

export function parseCareTip(content: string | null | undefined): ParsedCareTip {
  const trimmed = content?.trim() ?? "";
  if (!trimmed) {
    return { kind: "empty" };
  }

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 3) {
    return { kind: "legacy", content: trimmed };
  }

  const selections: Partial<CareTipSelections> = {};

  for (const category of CARE_TIP_CATEGORIES) {
    const line = lines.find((candidate) => LINE_PATTERN[category].test(candidate));
    if (!line) {
      return { kind: "legacy", content: trimmed };
    }
    const match = line.match(LINE_PATTERN[category]);
    const value = match?.[1]?.trim() ?? "";
    if (!value) {
      return { kind: "legacy", content: trimmed };
    }
    selections[category] = value;
  }

  if (!isCompleteCareTipSelections(selections)) {
    return { kind: "legacy", content: trimmed };
  }

  return { kind: "structured", selections };
}

export function isStructuredCareTipComplete(content: string | null | undefined): boolean {
  const parsed = parseCareTip(content);
  return parsed.kind === "structured";
}
