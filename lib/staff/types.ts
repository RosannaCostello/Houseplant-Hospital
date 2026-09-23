export type HospitalStaff = {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
  sortOrder: number;
};

export function formatStaffInitials(staff: Pick<HospitalStaff, "firstName" | "lastName">): string {
  const first = staff.firstName.trim()[0] ?? "";
  const last = staff.lastName.trim()[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function formatStaffName(staff: Pick<HospitalStaff, "firstName" | "lastName">): string {
  return `${staff.firstName.trim()} ${staff.lastName.trim()}`.trim();
}
