import { useState } from 'react';
import Layout from '../components/Layout';

export default function Settings() {
  const [form, setForm] = useState({
    name: 'Sky',
    email: 'sky@example.com',
    phone: '+91 XXXXXXXXXX',
    role: 'IT Intern, Touras',
  });
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    // TODO: PATCH /users/me on the backend with `form`.
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">Settings</h1>
        <p className="text-inksoft text-sm mt-1.5 max-w-md">
          Update your personal details and choose how Vantage looks.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3 max-w-md">
        <div className="text-xs text-inksoft">Personal details</div>
        {['name', 'email', 'phone', 'role'].map((field) => (
          <input
            key={field}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="bg-surface2 border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-teal"
          />
        ))}
        <button type="submit" className="mt-1 bg-indigo text-bg font-semibold text-sm rounded-lg py-2.5">
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </form>

      <p className="text-xs text-inksoft mt-5 max-w-md">
        Dark/light mode is available from the profile menu (bottom of the sidebar on desktop, or the avatar on
        mobile).
      </p>
    </Layout>
  );
}
