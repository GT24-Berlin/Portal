export type Partner = {
  id: string;
  name: string;
  region: string;
  email?: string;
  phone?: string;
  active: boolean;
};

export const partnersMock: Partner[] = [
  {
    id: 'PT-3001',
    name: 'Gutachter Berlin',
    region: 'Berlin',
    email: 'partner-berlin@example.com',
    phone: '+49 30 000000',
    active: true
  },
  {
    id: 'PT-3002',
    name: 'Gutachter NRW',
    region: 'NRW',
    email: 'partner-nrw@example.com',
    phone: '+49 201 000000',
    active: true
  }
];
