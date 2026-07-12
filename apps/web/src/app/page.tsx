import { redirect } from 'next/navigation';

// app.useplinth.xyz has no marketing page of its own — the real one lives at
// the primary domain (apps/site). This is the product surface only, so the
// root just sends visitors straight to login.
export default function RootPage() {
  redirect('/login');
}
