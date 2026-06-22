type CustomerName = {
  firstName: string;
  lastName: string;
};

export function formatCustomerPlantTitle(customer: CustomerName): string {
  return `${customer.firstName} ${customer.lastName}'s plant`;
}
