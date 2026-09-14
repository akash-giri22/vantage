import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const NAV_ITEMS = [
  { href: '/resume', label: 'Resume & ATS' },
  { href: '/customize', label: 'Customize' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/tracker', label: 'Tracker' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vantage-theme') : null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('light', saved === 'light');
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('light', next === 'light');
    localStorage.setItem('vantage-theme', next);
  }
  async function handleLogout() {
  try {
    await signOut(auth);
    setProfileOpen(false);
    router.push('/');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-line bg-bg/90 backdrop-blur">
        <div className="flex items-center gap-2 font-display font-bold text-ink">
          <span className="w-2 h-2 rotate-45 bg-teal rounded-sm" />
          Vantage
        </div>
        <div className="font-mono text-xs text-inksoft bg-surface2 px-2.5 py-1 rounded-full">4 / 10 applies</div>
      </div>

      {/* Sidebar (desktop) / bottom bar (mobile) */}
      <aside className="order-2 md:order-1 fixed md:sticky bottom-0 md:top-0 left-0 right-0 md:h-screen w-full md:w-56 flex md:flex-col items-center md:items-stretch justify-around md:justify-start gap-0 md:gap-8 border-t md:border-t-0 md:border-r border-line bg-bg/95 md:bg-transparent backdrop-blur md:backdrop-blur-none px-2 md:px-4 py-2 md:py-6 z-30">
        <div className="hidden md:flex items-center gap-2 font-display font-bold text-lg text-ink pl-2">
          <span className="w-2 h-2 rotate-45 bg-teal rounded-sm" />
          Vantage
        </div>

        <nav className="flex md:flex-col flex-1 md:flex-none justify-around md:justify-start gap-0 md:gap-1 w-full">
          {NAV_ITEMS.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link key={item.href} href={item.href} legacyBehavior>
                <a
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-2 md:px-3 py-1.5 md:py-2.5 rounded-lg text-[10.5px] md:text-sm transition-colors ${
                    active ? 'bg-teal/10 text-teal font-medium' : 'text-inksoft hover:bg-surface2 hover:text-ink'
                  }`}
                >
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block bg-surface border border-line rounded-xl p-3.5">
          <div className="flex justify-between font-mono text-xs text-inksoft mb-2">
            <span>Applies today</span>
            <b className="text-ink font-medium">4 / 10</b>
          </div>
          <div className="h-1 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full w-2/5 bg-teal" />
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2.5 bg-surface md:border md:border-line rounded-xl p-1.5 md:p-2.5"
          >
            <span className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-bg bg-gradient-to-br from-indigo to-teal">
              S
            </span>
            <span className="hidden md:block text-left">
              <span className="block text-sm font-medium text-ink">Sky</span>
              <span className="block text-xs text-inksoft">IT Intern · Touras</span>
            </span>
          </button>
          {profileOpen && (
            <div className="absolute bottom-full right-0 md:left-0 mb-2 w-40 bg-surface2 border border-line rounded-lg p-1.5 shadow-xl">
              <Link href="/settings" legacyBehavior>
                <a className="block px-2.5 py-2 rounded-md text-sm hover:bg-surface">Settings</a>
              </Link>
              <button onClick={toggleTheme} className="w-full text-left px-2.5 py-2 rounded-md text-sm hover:bg-surface">
                {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-2.5 py-2 rounded-md text-sm text-red-400 hover:bg-surface"
              >
                  Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="order-1 md:order-2 flex-1 px-5 md:px-11 py-6 md:py-9 pb-24 md:pb-9 max-w-5xl">{children}</main>
    </div>
  );
}
