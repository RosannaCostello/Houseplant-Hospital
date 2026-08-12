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

/** Allow empty tip text after the label (blank categories). */
const LINE_PATTERN: Record<CareTipCategory, RegExp> = {
  water: /^Water:\s*(.*)$/i,
  leaves: /^Leaves:\s*(.*)$/i,
  light: /^Light:\s*(.*)$/i,
};

export function composeCareTip(selections: CareTipSelections): string {
  return [
    `Water: ${selections.water.trim()}`,
    `Leaves: ${selections.leaves.trim()}`,
    `Light: ${selections.light.trim()}`,
  ].join("\n");
}

/** At least one of Water / Leaves / Light has a tip. Blanks are allowed for the rest. */
export function hasMinimumCareTipSelections(
  selections: Partial<CareTipSelections> | CareTipSelections,
): boolean {
  return CARE_TIP_CATEGORIES.some((category) => {
    const value = selections[category];
    return Boolean(value && value.trim().length > 0);
  });
}

/** @deprecated Use hasMinimumCareTipSelections — blanks are allowed. */
export function isCompleteCareTipSelections(
  selections: Partial<CareTipSelections> | CareTipSelections,
): selections is CareTipSelections {
  return hasMinimumCareTipSelections(selections);
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
    selections[category] = match?.[1]?.trim() ?? "";
  }

  if (
    selections.water === undefined ||
    selections.leaves === undefined ||
    selections.light === undefined
  ) {
    return { kind: "legacy", content: trimmed };
  }

  const structured: CareTipSelections = {
    water: selections.water,
    leaves: selections.leaves,
    light: selections.light,
  };

  if (!hasMinimumCareTipSelections(structured)) {
    return { kind: "empty" };
  }

  return { kind: "structured", selections: structured };
}

/** True when structured care tips have at least one tip filled (Outpatient gate). */
export function isStructuredCareTipComplete(content: string | null | undefined): boolean {
  const parsed = parseCareTip(content);
  return parsed.kind === "structured" && hasMinimumCareTipSelections(parsed.selections);
}
