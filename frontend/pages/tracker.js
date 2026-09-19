import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';

const STATUS_STYLES = {
  applied: 'bg-teal/10 text-teal',
  pending: 'bg-amber/10 text-amber',
  manual: 'bg-indigo/10 text-indigo',
};

const STATUS_LABEL = { applied: 'Applied', pending: 'Pending', manual: 'Needs manual apply' };

export default function Tracker() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api
      .getApplications()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">Application tracker</h1>
        <p className="text-inksoft text-sm mt-1.5 max-w-md">
          Every application attempt is tracked here, including jobs that need manual follow-up.
        </p>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3.5 bg-surface border border-line rounded-xl px-4 py-3.5 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{row.title}</div>
            <div className="text-xs text-inksoft mt-0.5">
              {row.company} · {row.source} · {row.status}
            </div>
          </div>
          <div className={`font-mono text-[11.5px] px-2.5 py-1 rounded-md flex-shrink-0 ${STATUS_STYLES[row.status]}`}>
            {STATUS_LABEL[row.status] || row.status}
          </div>
        </div>
      ))}
    </Layout>
  );
}
