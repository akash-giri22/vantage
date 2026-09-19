import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Layout from '../components/Layout';
import { api } from '../lib/api';


const SOURCE_COLORS = {
  Lever: '#8B5CF6',
  Greenhouse: '#22C55E',
  'Remote OK': '#2DD4BF',
  Himalayas: '#F59E0B',
  Jobicy: '#38BDF8',
  Arbeitnow: '#A78BFA',
  Indeed: '#2164F3',
  LinkedIn: '#0A66C2',
  Naukri: '#4A90E2',
  Glassdoor: '#0CAA41',
  WorkIndia: '#FF7A00',
};


export default function Jobs() {

  const [jobs, setJobs] =
    useState([]);

  const [openId, setOpenId] =
    useState(null);

  const [filter, setFilter] =
    useState('All');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');


  async function loadJobs() {

    setLoading(true);
    setError('');

    try {

      const data =
        await api.getJobs();

      setJobs(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(
        'Job loading failed:',
        err
      );

      setError(
        err.message ||
        'Unable to load jobs.'
      );

    } finally {

      setLoading(false);
    }
  }


  useEffect(() => {

    loadJobs();

  }, []);


  function getMatchScore(job) {

    const value =
      job.match_score ??
      job.match ??
      0;

    const score =
      Number(value);

    if (
      Number.isNaN(score)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        score
      )
    );
  }


  function isRemote(job) {

    const text = [
      job.location,
      job.meta,
      job.title,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      text.includes('remote') ||
      text.includes('work from home') ||
      text.includes('wfh')
    );
  }


  function isCareerPage(job) {

    const source =
      String(
        job.source || ''
      ).toLowerCase();

    return (
      source === 'lever' ||
      source === 'greenhouse' ||
      source.includes(
        'career'
      )
    );
  }


  const filteredJobs =
    useMemo(() => {

      return jobs.filter(
        (job) => {

          if (
            filter === 'Remote'
          ) {
            return isRemote(job);
          }

          if (
            filter === '> 80% match'
          ) {
            return (
              getMatchScore(job)
              >= 80
            );
          }

          if (
            filter ===
            'Career pages'
          ) {
            return (
              isCareerPage(job)
            );
          }

          return true;
        }
      );

    }, [
      jobs,
      filter,
    ]);


  async function handleApply(
    job
  ) {

    const directUrl =
      job.apply_url ||
      job.applyUrl ||
      job.source_url ||
      '';

    try {

      const result =
        await api.applyToJob(
          job.id
        );

      const resultUrl =
        result?.apply_url ||
        directUrl;

      if (resultUrl) {

        window.open(
          resultUrl,
          '_blank',
          'noopener,noreferrer'
        );
      }

    } catch (err) {

      console.warn(
        'Application endpoint error:',
        err.message
      );

      if (directUrl) {

        window.open(
          directUrl,
          '_blank',
          'noopener,noreferrer'
        );
      }
    }
  }


  return (
    <Layout>

      <div className="mb-8">

        <div className="flex items-start justify-between gap-4">

          <div>

            <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">
              Job matches
            </h1>

            <p className="text-inksoft text-sm mt-1.5 max-w-lg">
              Live jobs from connected job feeds and
              employer career systems, ranked against
              your uploaded resume.
            </p>

          </div>

          <button
            onClick={loadJobs}
            className="border border-line bg-surface text-xs px-3.5 py-2 rounded-lg text-inksoft hover:text-teal"
          >
            Refresh jobs
          </button>

        </div>

      </div>


      <div className="flex gap-2 flex-wrap mb-5">

        {[
          'All',
          'Remote',
          '> 80% match',
          'Career pages',
        ].map((f) => (

          <button
            key={f}
            onClick={() =>
              setFilter(f)
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border ${
              filter === f
                ? 'border-teal text-teal bg-teal/10'
                : 'border-line text-inksoft bg-surface'
            }`}
          >
            {f}
          </button>

        ))}

      </div>


      {loading && (

        <div className="bg-surface border border-line rounded-xl p-5 text-sm text-inksoft">
          Loading live jobs...
        </div>

      )}


      {!loading && error && (

        <div className="bg-surface border border-line rounded-xl p-5">

          <div className="text-sm text-red-400">
            {error}
          </div>

          <button
            onClick={loadJobs}
            className="mt-3 bg-teal text-bg font-semibold text-xs rounded-md px-3.5 py-2"
          >
            Retry
          </button>

        </div>

      )}


      {!loading &&
        !error &&
        filteredJobs.length === 0 && (

        <div className="bg-surface border border-line rounded-xl p-5 text-sm text-inksoft">
          No jobs found for this filter.
        </div>

      )}


      {!loading &&
        !error &&
        filteredJobs.map(
          (job) => {

            const score =
              getMatchScore(job);

            const source =
              job.source ||
              'Career page';

            const sourceColor =
              SOURCE_COLORS[source] ||
              '#2DD4BF';

            const location =
              job.location ||
              job.meta ||
              'Location not specified';

            const directUrl =
              job.apply_url ||
              job.applyUrl ||
              job.source_url ||
              '';

            return (

              <div
                key={`${source}-${job.id}`}
                className="bg-surface border border-line rounded-xl mb-2.5 overflow-hidden"
              >

                <div
                  className="flex items-center gap-4 px-4 py-4 cursor-pointer"
                  onClick={() =>
                    setOpenId(
                      openId === job.id
                        ? null
                        : job.id
                    )
                  }
                >

                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-semibold text-bg flex-shrink-0"
                    style={{
                      background:
                        sourceColor,
                    }}
                  >
                    {
                      (
                        job.company ||
                        '?'
                      )[0]
                    }
                  </div>


                  <div className="flex-1 min-w-0">

                    <div className="font-mono text-[10.5px] text-inksoft flex items-center gap-1.5 mb-1">

                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            sourceColor,
                        }}
                      />

                      via {source}

                    </div>


                    <div className="text-sm font-medium">
                      {job.title}
                    </div>


                    <div className="text-xs text-inksoft mt-0.5">
                      {job.company}
                      {' · '}
                      {location}
                    </div>

                  </div>


                  <div className="text-right w-16 flex-shrink-0">

                    <div className="font-mono text-sm font-semibold text-teal">
                      {score}%
                    </div>

                    <div className="h-0.5 bg-surface2 rounded-full mt-1.5 overflow-hidden">

                      <div
                        className="h-full bg-teal"
                        style={{
                          width:
                            `${score}%`,
                        }}
                      />

                    </div>

                  </div>

                </div>


                {openId === job.id && (

                  <div className="border-t border-line px-4 py-4 text-sm text-inksoft leading-relaxed">

                    <div className="whitespace-pre-line">
                      {
                        (
                          job.description ||
                          'No description available.'
                        ).slice(
                          0,
                          1800
                        )
                      }
                    </div>


                    {Array.isArray(
                      job.match_reasons
                    ) &&
                      job.match_reasons
                        .length > 0 && (

                      <div className="mt-4">

                        <div className="text-xs font-semibold text-ink mb-1">
                          Why it matches
                        </div>

                        {job.match_reasons.map(
                          (
                            reason,
                            index
                          ) => (

                            <div
                              key={index}
                              className="text-xs"
                            >
                              • {reason}
                            </div>

                          )
                        )}

                      </div>

                    )}


                    {directUrl && (

                      <button
                        onClick={(e) => {

                          e.stopPropagation();

                          handleApply(job);
                        }}
                        className="mt-4 bg-teal text-bg font-semibold text-xs rounded-md px-3.5 py-2"
                      >
                        {job.automation_supported ? 'Auto Apply →' : 'Open / Apply →'}
                      </button>

                    )}

                  </div>

                )}

              </div>
            );
          }
        )}


      {!loading &&
        !error && (

        <div className="text-xs text-inksoft mt-6 pt-4 border-t border-line">

          Showing{' '}
          {filteredJobs.length}
          {' '}of{' '}
          {jobs.length}
          {' '}live job records.

        </div>

      )}

    </Layout>
  );
}
