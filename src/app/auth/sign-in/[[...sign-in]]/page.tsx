import { Metadata } from 'next';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Gutachtery24 | Login',
  description: 'Sicherer Zugang zum Kunden- und Partnerportal.'
};

export default function Page() {
  return <SignInViewPage />;
}
