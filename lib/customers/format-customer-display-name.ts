type CustomerName = {
  firstName: string;
  lastName: string;
};

export function formatCustomerDisplayName(customer: CustomerName): string {
  return `${customer.firstName} ${customer.lastName}`;
}
