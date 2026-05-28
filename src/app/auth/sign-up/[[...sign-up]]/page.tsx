import { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Gutachtery24 | Registrierung',
  description: 'Zugang für Kunden, Partner und operative Nutzer anfordern.'
};

export default function Page() {
  return <SignUpViewPage />;
}
