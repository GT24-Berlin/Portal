export type PartnerProfileFormData = {
  companyName: string;
  legalForm: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  region: string;
};

export type PartnerProfileDto = {
  clerkUserId: string;
  role: 'GUTACHTER' | 'ANWALT';
  partnerId: string | null;
  companyName: string;
  legalForm: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  region: string;
};

export type PartnerCollaborationRow = {
  caseId: string;
  caseNumber: string | null;
  token: string;
  updatedAt: Date;
  customerName: string | null;
  ownRole: 'GUTACHTER' | 'ANWALT';
  ownAssignmentStatus: string;
  counterpartRole: 'GUTACHTER' | 'ANWALT';
  counterpartClerkUserId: string | null;
  counterpartName: string | null;
  counterpartEmail: string | null;
  gutachterStatus: string;
  anwaltStatus: string;
};

export type PartnerCollaborationData = {
  items: PartnerCollaborationRow[];
};

export function emptyPartnerProfile(
  role: 'GUTACHTER' | 'ANWALT',
  clerkUserId: string
): PartnerProfileDto {
  return {
    clerkUserId,
    role,
    partnerId: null,
    companyName: '',
    legalForm: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    country: '',
    region: ''
  };
}
