import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';

export async function getPartnerSchedulingContext(input: {
  clerkUserId: string;
  role: 'GUTACHTER' | 'ANWALT';
}) {
  const profile = await getPartnerProfile({
    clerkUserId: input.clerkUserId,
    role: input.role
  });

  if (!profile.partnerId) {
    return null;
  }

  return {
    partnerId: profile.partnerId,
    role: profile.role as 'GUTACHTER' | 'ANWALT'
  };
}
