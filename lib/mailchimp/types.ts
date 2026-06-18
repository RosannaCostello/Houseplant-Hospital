export type MailchimpMemberStatus =
  | "subscribed"
  | "unsubscribed"
  | "cleaned"
  | "pending"
  | "transactional";

export type MailchimpListMember = {
  id: string;
  contactId: string;
  emailAddress: string;
  status: MailchimpMemberStatus;
};

export type MailchimpApiErrorBody = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Array<{ field?: string; message?: string }>;
};
