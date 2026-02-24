import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const { userId } = await auth();

  // nicht eingeloggt -> zur Sign-in Page (entspricht deinen Clerk Paths)
  if (!userId) {
    redirect('/sign-in');
  }

  // eingeloggt -> Dashboard Start
  redirect('/dashboard/overview');
}
