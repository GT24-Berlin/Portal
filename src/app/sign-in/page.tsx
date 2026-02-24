import { redirect } from 'next/navigation';

export default function SignInAlias() {
  redirect('/auth/sign-in');
}
