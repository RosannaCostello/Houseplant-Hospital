/** Tags used by Houseplant Hospital — see scope Mailchimp Sync Rules. */
export const MAILCHIMP_TAGS = {
  houseplantHospital: "houseplant_hospital",
  repeatHospitalCustomer: "repeat_hospital_customer",
  bugsTreatment: "bugs_treatment",
  newsletter: "newsletter",
} as const;

export type MailchimpTagName = (typeof MAILCHIMP_TAGS)[keyof typeof MAILCHIMP_TAGS];
