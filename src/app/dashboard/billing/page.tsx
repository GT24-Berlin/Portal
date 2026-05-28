import type { Metadata } from 'next';
import BillingPageClient from '@/app/dashboard/billing/billing-page-client';

export const metadata: Metadata = {
  title: 'Abrechnung & Pläne'
};

export default function BillingPage() {
  return <BillingPageClient />;
}
