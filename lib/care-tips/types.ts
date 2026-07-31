import {
  CARE_TIP_CATEGORIES,
  type CareTipCategory,
} from "@/lib/care-tips/compose-parse";

export type CareTipOption = {
  id: string;
  category: CareTipCategory;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type CareTipOptionsByCategory = Record<CareTipCategory, CareTipOption[]>;

export function emptyCareTipOptionsByCategory(): CareTipOptionsByCategory {
  return {
    water: [],
    leaves: [],
    light: [],
  };
}

export function isCareTipCategory(value: string): value is CareTipCategory {
  return (CARE_TIP_CATEGORIES as readonly string[]).includes(value);
}
