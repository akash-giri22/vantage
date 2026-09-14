import { useEffect, useState } from 'react';

import Layout from '../components/Layout';

import { api } from '../lib/api';

import { useAuth } from '../lib/useAuth';

const MAX_TAILORED_RESUMES = 2;


// =====================================================
// HISTORY HELPERS
// =====================================================

function getTailoredHistoryKey(user) {
  if (!user || !user.email) return null;

  return `vantage-tailored-resumes-${user.email}`;
}


function getJDTitle(jdText) {
  if (!jdText) {
    return 'Untitled Job Description';
  }

  const lines = jdText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return 'Untitled Job Description';
  }

  const titleLine = lines.find((line) =>
    /^(job\s*title|position|role|designation|title)\s*[:\-]/i.test(
      line
    )
  );

  let title = titleLine || lines[0];

  title = title
    .replace(
      /^(job\s*title|position|role|designation|title)\s*[:\-]\s*/i,
      ''
    )
    .trim();

  if (title.length > 70) {
    title = `${title.substring(0, 67)}...`;
  }

  return title || 'Untitled Job Description';
}


function formatDate(timestamp) {
  if (!timestamp) return '';

  try {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}


function getATSScore(result) {
  if (!result) return null;

  const score =
    result.updated_score ??
    result.ats_score ??
    result.score ??
    result.updatedScore ??
    null;

  if (score === null || score === undefined) {
    return null;
  }

  const numericScore = Number(score);

  return Number.isFinite(numericScore)
    ? numericScore
    : null;
}


// =====================================================
// COMPONENT
// =====================================================

export default function Customize() {
  const { user, loading: authLoading } = useAuth();

  const [jd, setJd] = useState('');

  const [resumeText, setResumeText] = useState('');

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  // =====================================================
  // TAILORED RESUME HISTORY
  // =====================================================

  const [tailoredHistory, setTailoredHistory] =
    useState([]);

  const [activeTailoredId, setActiveTailoredId] =
    useState(null);


  // =====================================================
  // LOAD ORIGINAL RESUME
  // =====================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedResume =
      window.localStorage.getItem(
        'vantage-resume-text'
      );

    setResumeText(savedResume || '');
  }, []);


  // =====================================================
  // LOAD TAILORED RESUME HISTORY
  // =====================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (authLoading) return;

    if (!user) {
      setTailoredHistory([]);
      setActiveTailoredId(null);
      setResult(null);
      return;
    }

    const key = getTailoredHistoryKey(user);

    if (!key) return;

    try {
      const saved =
        window.localStorage.getItem(key);

      const parsed = saved
        ? JSON.parse(saved)
        : [];

      if (Array.isArray(parsed)) {
        const limited = parsed.slice(
          -MAX_TAILORED_RESUMES
        );

        setTailoredHistory(limited);

        if (limited.length > 0) {
          const latest =
            limited[limited.length - 1];

          setJd(
            latest.jobDescription || ''
          );

          setResult(
            latest.result || null
          );

          setActiveTailoredId(
            latest.id
          );
        }
      }
    } catch (err) {
      console.error(
        'Failed to load tailored resume history:',
        err
      );

      setTailoredHistory([]);
    }
  }, [user, authLoading]);


  // =====================================================
  // SAVE HISTORY
  // =====================================================

  function persistTailoredHistory(history) {
    const limitedHistory =
      history.slice(
        -MAX_TAILORED_RESUMES
      );

    setTailoredHistory(
      limitedHistory
    );

    if (typeof window === 'undefined') {
      return;
    }

    const key =
      getTailoredHistoryKey(user);

    if (!key) return;

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(
          limitedHistory
        )
      );
    } catch (err) {
      console.error(
        'Failed to save tailored resume history:',
        err
      );
    }
  }


  // =====================================================
  // OPEN SAVED RESUME
  // =====================================================

  function openTailoredResume(item) {
    if (!item) return;

    setJd(
      item.jobDescription || ''
    );

    setResult(
      item.result || null
    );

    setActiveTailoredId(
      item.id
    );

    setError('');

    setTimeout(() => {
      const element =
        document.getElementById(
          'tailored-resume-result'
        );

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 50);
  }


  // =====================================================
  // DELETE RESUME
  // =====================================================

  function deleteTailoredResume(
    id,
    event
  ) {
    if (event) {
      event.stopPropagation();
    }

    const updatedHistory =
      tailoredHistory.filter(
        (item) => item.id !== id
      );

    persistTailoredHistory(
      updatedHistory
    );

    if (
      activeTailoredId === id
    ) {
      if (
        updatedHistory.length > 0
      ) {
        const latest =
          updatedHistory[
            updatedHistory.length - 1
          ];

        setActiveTailoredId(
          latest.id
        );

        setJd(
          latest.jobDescription || ''
        );

        setResult(
          latest.result || null
        );
      } else {
        setActiveTailoredId(null);

        setJd('');

        setResult(null);
      }
    }
  }


  // =====================================================
  // ONE-SHOT TAILOR
  // =====================================================

  async function handleTailor() {
    setError('');

    if (!resumeText) {
      setError(
        'Please upload your resume on the Resume & ATS page first.'
      );

      return;
    }

    if (!jd.trim()) {
      setError(
        'Please paste a job description first.'
      );

      return;
    }

    if (!user) {
      setError(
        'Please log in before tailoring your resume.'
      );

      return;
    }

    setLoading(true);

    try {
      // =================================================
      // ONE API CALL ONLY
      // =================================================

      const res =
        await api.tailorResume(
          resumeText,
          jd.trim()
        );

      // =================================================
      // VALIDATE RESPONSE
      // =================================================

      if (
        !res ||
        !res.rewritten_resume
      ) {
        throw new Error(
          'AI did not return a valid tailored resume.'
        );
      }

      // =================================================
      // SHOW RESULT
      // =================================================

      setResult(res);

      // =================================================
      // SAVE NEW TAILORED RESUME
      // =================================================

      const atsScore =
        getATSScore(res);

      const newEntry = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`,

        jobDescription:
          jd.trim(),

        jobTitle:
          getJDTitle(jd),

        createdAt:
          new Date().toISOString(),

        resumeFilename:
          res.download_filename ||
          'tailored_resume.pdf',

        atsScore,

        result: res,
      };

      // =================================================
      // KEEP ONLY LATEST 2
      // =================================================

      const updatedHistory = [
        ...tailoredHistory,
        newEntry,
      ].slice(
        -MAX_TAILORED_RESUMES
      );

      persistTailoredHistory(
        updatedHistory
      );

      setActiveTailoredId(
        newEntry.id
      );
    } catch (err) {
      console.error(
        'Resume tailoring failed:',
        err
      );

      setError(
        err.message ||
          'Something went wrong while tailoring the resume.'
      );
    } finally {
      setLoading(false);
    }
  }


  // =====================================================
  // DOWNLOAD PDF
  // =====================================================

  function downloadPdf(
    resultToDownload = result
  ) {
    if (
      !resultToDownload ||
      !resultToDownload.download_base64
    ) {
      return;
    }

    try {
      const byteCharacters =
        atob(
          resultToDownload.download_base64
        );

      const byteNumbers =
        new Array(
          byteCharacters.length
        );

      for (
        let i = 0;
        i < byteCharacters.length;
        i++
      ) {
        byteNumbers[i] =
          byteCharacters.charCodeAt(i);
      }

      const byteArray =
        new Uint8Array(
          byteNumbers
        );

      const blob =
        new Blob(
          [byteArray],
          {
            type: 'application/pdf',
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement('a');

      link.href = url;

      link.download =
        resultToDownload.download_filename ||
        'tailored_resume.pdf';

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (err) {
      console.error(
        'PDF download failed:',
        err
      );

      setError(
        'Unable to download the tailored resume PDF.'
      );
    }
  }


  // =====================================================
  // ATS COLOR
  // =====================================================

  function getScoreColor(score) {
    if (
      score === null ||
      score === undefined
    ) {
      return 'text-inksoft';
    }

    if (score >= 85) {
      return 'text-teal';
    }

    if (score >= 60) {
      return 'text-amber';
    }

    return 'text-red-400';
  }


  // =====================================================
  // UI
  // =====================================================

  return (
    <Layout>

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-8">

        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">
          Customize for a JD
        </h1>

        <p className="text-inksoft text-sm mt-1.5 max-w-md">
          Paste the job description. Vantage finds
          the gap between it and your resume, then
          rewrites the relevant lines — no keyword
          stuffing.
        </p>

      </div>


      {/* =================================================
          NO RESUME WARNING
      ================================================= */}

      {!resumeText && (
        <div className="bg-amber/10 border border-amber/30 text-amber text-sm rounded-lg px-4 py-3 mb-5">

          No resume found yet — go to the{' '}

          <strong>
            Resume &amp; ATS
          </strong>

          {' '}page and upload your resume first.

        </div>
      )}


      {/* =================================================
          SAVED TAILORED RESUMES
      ================================================= */}

      {tailoredHistory.length > 0 && (

        <div className="mb-6">

          <div className="flex items-center justify-between mb-3">

            <div>

              <h2 className="font-display text-lg font-semibold text-ink">
                Your Tailored Resumes
              </h2>

              <p className="text-xs text-inksoft mt-1">
                Your 2 most recent JD-specific
                resumes are saved here.
              </p>

            </div>

            <div className="font-mono text-xs text-inksoft">

              {tailoredHistory.length}
              {' / '}
              {MAX_TAILORED_RESUMES}

            </div>

          </div>


          <div className="grid md:grid-cols-2 gap-4">

            {[...tailoredHistory]
              .reverse()
              .map((item) => {

                const itemScore =
                  item.atsScore ??
                  getATSScore(
                    item.result
                  );

                const isActive =
                  item.id ===
                  activeTailoredId;

                return (

                  <div
                    key={item.id}
                    onClick={() =>
                      openTailoredResume(
                        item
                      )
                    }
                    className={`relative cursor-pointer bg-surface border rounded-xl p-4 transition-all ${
                      isActive
                        ? 'border-teal shadow-lg shadow-teal/5'
                        : 'border-line hover:border-teal/50'
                    }`}
                  >

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={(event) =>
                        deleteTailoredResume(
                          item.id,
                          event
                        )
                      }
                      className="absolute top-3 right-3 w-7 h-7 rounded-md text-inksoft hover:text-red-400 hover:bg-surface2 transition-colors"
                      title="Delete tailored resume"
                    >
                      ×
                    </button>


                    {/* JD TITLE */}

                    <div className="pr-8">

                      <div className="text-xs text-inksoft mb-1">
                        Job Description
                      </div>

                      <h3 className="font-display font-semibold text-ink text-base leading-snug">
                        {item.jobTitle ||
                          getJDTitle(
                            item.jobDescription
                          )}
                      </h3>

                    </div>


                    {/* ATS SCORE + DATE */}

                    <div className="flex items-end justify-between mt-5">

                      <div>

                        <div className="text-xs text-inksoft mb-1">
                          ATS Score
                        </div>

                        <div
                          className={`font-mono text-2xl font-bold ${getScoreColor(
                            itemScore
                          )}`}
                        >
                          {itemScore ??
                            '--'}
                        </div>

                      </div>


                      <div className="text-right">

                        <div className="text-xs text-inksoft">
                          Created
                        </div>

                        <div className="text-xs text-inksoft mt-1">
                          {formatDate(
                            item.createdAt
                          )}
                        </div>

                      </div>

                    </div>


                    {/* ACTIONS */}

                    <div className="flex gap-2 mt-4">

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          openTailoredResume(
                            item
                          );
                        }}
                        className="flex-1 bg-indigo text-bg font-semibold text-xs rounded-lg px-3 py-2"
                      >
                        Open Resume
                      </button>


                      <button
                        type="button"
                        disabled={
                          !item.result
                            ?.download_base64
                        }
                        onClick={(event) => {
                          event.stopPropagation();

                          downloadPdf(
                            item.result
                          );
                        }}
                        className="flex-1 bg-teal text-bg font-semibold text-xs rounded-lg px-3 py-2 disabled:opacity-40"
                      >
                        Download PDF
                      </button>

                    </div>

                  </div>

                );
              })}

          </div>

        </div>

      )}


      {/* =================================================
          JD + CHANGES
      ================================================= */}

      <div className="grid md:grid-cols-2 gap-5">


        {/* JOB DESCRIPTION */}

        <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col">

          <div className="text-xs text-inksoft mb-2">
            Job description
          </div>

          <textarea
            value={jd}
            onChange={(e) =>
              setJd(e.target.value)
            }
            placeholder="Paste the job description here…"
            className="flex-1 min-h-[220px] bg-transparent outline-none text-sm leading-relaxed resize-none"
          />


          <button
            onClick={handleTailor}
            disabled={
              !jd.trim() ||
              !resumeText ||
              loading ||
              !user
            }
            className="mt-3 self-start bg-indigo text-bg font-semibold text-sm rounded-lg px-4 py-2.5 disabled:opacity-50"
          >
            {loading
              ? 'Tailoring resume…'
              : 'Tailor my resume'}
          </button>


          {loading && (
            <div className="mt-2 text-xs text-inksoft">
              Vantage is analyzing this job
              description and creating your
              JD-specific resume.
            </div>
          )}

        </div>


        {/* WHAT VANTAGE CHANGES */}

        <div className="bg-surface border border-line rounded-2xl p-5">

          <div className="text-xs text-inksoft mb-2">
            What Vantage will change
          </div>


          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}


          {!error && !result && (
            <p className="text-sm text-inksoft">
              Results appear here once you tailor.
            </p>
          )}


          {!error && result && (

            <div>

              {result.summary && (
                <p className="text-sm text-inksoft leading-relaxed">

                  <strong className="text-ink font-medium">
                    {result.summary}
                  </strong>

                </p>
              )}


              {result.changes &&
                result.changes.length > 0 && (

                  <div className="mt-4 flex flex-col gap-3">

                    {result.changes.map(
                      (change, i) => (

                        <div
                          key={i}
                          className="text-xs"
                        >

                          <div className="text-indigo font-mono mb-1">
                            {change.section}
                          </div>


                          <div className="bg-surface2 rounded-md p-2 text-inksoft mb-1">

                            <span className="text-red-400 font-mono mr-1">
                              before:
                            </span>

                            {change.original}

                          </div>


                          <div className="bg-surface2 rounded-md p-2 text-inksoft">

                            <span className="text-teal font-mono mr-1">
                              after:
                            </span>

                            {change.revised}

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

            </div>

          )}

        </div>

      </div>


      {/* =================================================
          FINAL TAILORED RESUME
      ================================================= */}

      {result &&
        result.rewritten_resume && (

          <div
            id="tailored-resume-result"
            className="bg-surface border border-line rounded-2xl p-5 mt-5"
          >

            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">

              <div>

                <div className="flex items-center gap-3 flex-wrap">

                  <h2 className="font-display text-lg font-semibold">
                    Tailored Resume
                  </h2>


                  {getATSScore(result) !==
                    null && (

                    <span
                      className={`font-mono text-sm font-bold ${getScoreColor(
                        getATSScore(
                          result
                        )
                      )}`}
                    >
                      ATS{' '}
                      {getATSScore(
                        result
                      )}
                    </span>

                  )}

                </div>


                <p className="text-inksoft text-sm mt-1">

                  Customized for:{' '}

                  <span className="text-ink">
                    {getJDTitle(jd)}
                  </span>

                </p>


                {getATSScore(result) !==
                  null && (

                  <p
                    className={`text-xs mt-1 ${
                      getATSScore(result) >= 85
                        ? 'text-teal'
                        : 'text-amber'
                    }`}
                  >
                    {getATSScore(result) >= 85
                      ? '✓ Strong ATS match for this job description'
                      : 'ATS score based on the supplied job description'}
                  </p>

                )}

              </div>


              <button
                onClick={() =>
                  downloadPdf(result)
                }
                disabled={
                  !result.download_base64
                }
                className="bg-teal text-bg font-semibold text-sm rounded-lg px-4 py-2.5 disabled:opacity-50"
              >
                Download Tailored Resume PDF
              </button>

            </div>


            {/* RESUME */}

            <div className="bg-white text-[#111827] rounded-lg p-6 whitespace-pre-wrap leading-relaxed text-sm max-h-[600px] overflow-y-auto">

              {result.rewritten_resume}

            </div>

          </div>

        )}

    </Layout>
  );
}