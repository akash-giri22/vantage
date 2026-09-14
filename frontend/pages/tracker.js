import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';

const DEMO_ROWS = [
  { title: 'Backend Engineer, Platform', meta: 'Nimbus Systems · Applied today, 10:42 AM', status: 'applied' },
  { title: 'IT Support & Automation Intern', meta: 'Touras Digital · Applied today, 10:44 AM', status: 'applied' },
  { title: 'DevOps Trainee', meta: 'Orbital Cloud · Captcha blocked the automation', status: 'manual' },
  { title: 'Junior Full-Stack Developer', meta: 'Ashen Labs · Queued for tomorrow (daily cap reached)', status: 'pending' },
];

const STATUS_STYLES = {
  applied: 'bg-teal/10 text-teal',
  pending: 'bg-amber/10 text-amber',
  manual: 'bg-indigo/10 text-indigo',
};

const STATUS_LABEL = { applied: 'Applied', pending: 'Pending', manual: 'Needs manual apply' };

export default function Tracker() {
  const [rows, setRows] = useState(DEMO_ROWS);

  useEffect(() => {
    api
      .getApplications()
      .then((data) => setRows(data.length ? data : DEMO_ROWS))
      .catch(() => setRows(DEMO_ROWS));
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">Application tracker</h1>
        <p className="text-inksoft text-sm mt-1.5 max-w-md">
          Everything Vantage has applied to on your behalf, plus anything that needs your manual follow-up.
        </p>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3.5 bg-surface border border-line rounded-xl px-4 py-3.5 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{row.title}</div>
            <div className="text-xs text-inksoft mt-0.5">{row.meta}</div>
          </div>
          <div className={`font-mono text-[11.5px] px-2.5 py-1 rounded-md flex-shrink-0 ${STATUS_STYLES[row.status]}`}>
            {STATUS_LABEL[row.status]}
          </div>
        </div>
      ))}
    </Layout>
  );
}
