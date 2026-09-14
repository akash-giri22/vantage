import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';

const DEMO_JOBS = [
  {
    id: 1,
    title: 'Backend Engineer, Platform',
    company: 'Nimbus Systems',
    meta: 'Remote · ₹9–14L · 1–3 yrs',
    match: 91,
    source: 'LinkedIn',
    sourceColor: '#0A66C2',
    description: 'Own core FastAPI services and background job infra. Playwright experience directly relevant.',
    applyLabel: 'Apply via Vantage',
  },
  {
    id: 2,
    title: 'IT Support & Automation Intern',
    company: 'Touras Digital',
    meta: 'Nagpur · ₹15–20K/mo · Intern',
    match: 85,
    source: 'Naukri',
    sourceColor: '#2DD4BF',
    description: 'Cross-team IT support with scripting responsibilities. Strong overlap with your current role.',
    applyLabel: 'Apply via Vantage',
  },
  {
    id: 3,
    title: 'Junior Full-Stack Developer',
    company: 'Ashen Labs',
    meta: 'Pune · ₹6–8L · 0–2 yrs',
    match: 76,
    source: 'Company career page',
    sourceColor: '#FBBF24',
    description: "Posted directly on the company's careers page — Vantage will take you there to apply.",
    applyLabel: 'Open on Ashen Labs →',
    external: true,
  },
];

export default function Jobs() {
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api
      .getJobs()
      .then((data) => setJobs(data.length ? data : DEMO_JOBS))
      .catch(() => setJobs(DEMO_JOBS));
  }, []);

  async function handleApply(job) {
    if (job.external) {
      window.open(job.applyUrl || '#', '_blank');
      return;
    }
    try {
      await api.applyToJob(job.id);
    } catch (err) {
      // Backend not wired yet — this is expected during local frontend-only dev.
      console.warn('Apply endpoint not reachable yet:', err.message);
    }
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">Job matches</h1>
        <p className="text-inksoft text-sm mt-1.5 max-w-md">
          Ranked against your resume. Tap a role to expand it — applying through Vantage queues a background apply;
          company-page roles open on their own site.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {['All', 'Remote', '> 80% match', 'Career pages'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3.5 py-1.5 rounded-full border ${
              filter === f ? 'border-teal text-teal bg-teal/10' : 'border-line text-inksoft bg-surface'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {jobs.map((job) => (
        <div key={job.id} className="bg-surface border border-line rounded-xl mb-2.5 overflow-hidden">
          <div
            className="flex items-center gap-4 px-4 py-4 cursor-pointer"
            onClick={() => setOpenId(openId === job.id ? null : job.id)}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-semibold text-bg flex-shrink-0"
              style={{ background: job.sourceColor }}
            >
              {job.company[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10.5px] text-inksoft flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: job.sourceColor }} />
                {job.source === 'Company career page' ? job.source : `via ${job.source}`}
              </div>
              <div className="text-sm font-medium">{job.title}</div>
              <div className="text-xs text-inksoft mt-0.5">
                {job.company} · {job.meta}
              </div>
            </div>
            <div className="text-right w-16 flex-shrink-0">
              <div className="font-mono text-sm font-semibold text-teal">{job.match}%</div>
              <div className="h-0.5 bg-surface2 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-teal" style={{ width: `${job.match}%` }} />
              </div>
            </div>
          </div>
          {openId === job.id && (
            <div className="border-t border-line px-4 py-4 text-sm text-inksoft leading-relaxed">
              {job.description}
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(job);
                  }}
                  className="mt-3 bg-teal text-bg font-semibold text-xs rounded-md px-3.5 py-2"
                >
                  {job.applyLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="text-xs text-inksoft mt-6 pt-4 border-t border-line">
        Career-page roles are shown for reference and open on the company's own site — Vantage doesn't auto-apply
        there.
      </div>
    </Layout>
  );
}
