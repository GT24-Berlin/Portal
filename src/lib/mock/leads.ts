export type LeadStatus =
  | 'Neu'
  | 'Kontaktiert'
  | 'Termin'
  | 'In Bearbeitung'
  | 'Abgeschlossen'
  | 'Verloren';

export type Lead = {
  id: string;
  name: string;
  region: string;
  phone?: string;
  email?: string;
  status: LeadStatus;
  createdAt: string; // ISO
  source: 'Web' | 'Telefon' | 'Partner' | 'Empfehlung';
};

export const leadsMock: Lead[] = [
  {
    id: 'LD-1001',
    name: 'Max Mustermann',
    region: 'Berlin',
    phone: '+49 151 000000',
    email: 'max@example.com',
    status: 'Neu',
    createdAt: '2026-01-24',
    source: 'Web'
  },
  {
    id: 'LD-1002',
    name: 'Sara Yilmaz',
    region: 'NRW',
    phone: '+49 151 000001',
    email: 'sara@example.com',
    status: 'Kontaktiert',
    createdAt: '2026-01-24',
    source: 'Telefon'
  },
  {
    id: 'LD-1003',
    name: 'Jonas Becker',
    region: 'Berlin',
    phone: '+49 151 000002',
    email: 'jonas@example.com',
    status: 'Termin',
    createdAt: '2026-01-25',
    source: 'Empfehlung'
  },
  {
    id: 'LD-1004',
    name: 'Aylin Demir',
    region: 'NRW',
    phone: '+49 151 000003',
    email: 'aylin@example.com',
    status: 'In Bearbeitung',
    createdAt: '2026-01-25',
    source: 'Partner'
  },
  {
    id: 'LD-1005',
    name: 'Tim Schneider',
    region: 'Berlin',
    phone: '+49 151 000004',
    email: 'tim@example.com',
    status: 'Abgeschlossen',
    createdAt: '2026-01-26',
    source: 'Web'
  }
];
