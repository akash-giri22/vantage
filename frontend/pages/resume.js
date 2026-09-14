import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import { useAuth } from '../lib/useAuth';

function getHistoryKey(user) {
  if (!user || !user.email) return 'vantage-resumes-guest';
  return `vantage-resumes-${user.email}`;
}

export default function ResumePage() {
  const { user } = useAuth();

  const [fileName, setFileName] = useState('');

  // =====================================================
  // ORIGINAL RESUME DATA
  // =====================================================

  const [resumeText, setResumeText] = useState('');
  const [score, setScore] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [note, setNote] = useState('');

  // =====================================================
  // AI OPTIMIZED RESUME DATA
  // =====================================================

  const [updatedScore, setUpdatedScore] = useState(null);
  const [updatedBreakdown, setUpdatedBreakdown] = useState([]);
  const [updatedNote, setUpdatedNote] = useState('');

  const [changes, setChanges] = useState([]);
  const [rewrittenResume, setRewrittenResume] = useState('');

  // =====================================================
  // PDF
  // =====================================================

  const [downloadBase64, setDownloadBase64] = useState('');
  const [downloadFilename, setDownloadFilename] =
    useState('updated_resume.pdf');

  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  // Shows current AI attempt
  const [optimizationStatus, setOptimizationStatus] =
    useState('');

  // =====================================================
  // RESUME HISTORY (per logged-in user email)
  // =====================================================

  const [resumeHistory, setResumeHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(true);

  // =====================================================
  // LOAD SAVED HISTORY — reruns whenever the logged-in user changes
  // =====================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return; // wait until we know who's logged in

    const key = getHistoryKey(user);

    try {
      const saved = window.localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];

      if (parsed.length > 0) {
        setResumeHistory(parsed);
        const mostRecent = parsed[parsed.length - 1];
        applyEntryToState(mostRecent);
        setActiveId(mostRecent.id);
        setShowUploadForm(false);
      } else {
        // this email has no saved resumes yet — blank slate
        setResumeHistory([]);
        setActiveId(null);
        setFileName('');
        setResumeText('');
        setScore(null);
        setBreakdown([]);
        setNote('');
        setUpdatedScore(null);
        setUpdatedBreakdown([]);
        setUpdatedNote('');
        setChanges([]);
        setRewrittenResume('');
        setDownloadBase64('');
        setShowUploadForm(true);
      }
    } catch (e) {
      console.error('Failed to load resume history:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // =====================================================
  // HISTORY HELPERS (NEW)
  // =====================================================

  function persistHistory(updatedHistory) {
    setResumeHistory(updatedHistory);
    if (typeof window !== 'undefined') {
      const key = getHistoryKey(user);
      window.localStorage.setItem(key, JSON.stringify(updatedHistory));
    }
  }

  function applyEntryToState(entry) {
    setFileName(entry.fileName || '');
    setResumeText(entry.resumeText || '');
    setScore(entry.score ?? null);
    setBreakdown(entry.breakdown || []);
    setNote(entry.note || '');

    setUpdatedScore(entry.updatedScore ?? null);
    setUpdatedBreakdown(entry.updatedBreakdown || []);
    setUpdatedNote(entry.updatedNote || '');

    setChanges(entry.changes || []);
    setRewrittenResume(entry.rewrittenResume || '');

    setDownloadBase64(entry.downloadBase64 || '');
    setDownloadFilename(entry.downloadFilename || 'updated_resume.pdf');
  }

  function selectResume(id) {
    const entry = resumeHistory.find((r) => r.id === id);
    if (!entry) return;

    applyEntryToState(entry);
    setActiveId(id);
    setShowUploadForm(false);
    setOptimizationStatus('');
  }

  function deleteResume(id) {
    const updatedHistory = resumeHistory.filter((r) => r.id !== id);
    persistHistory(updatedHistory);

    if (activeId === id) {
      if (updatedHistory.length > 0) {
        selectResume(updatedHistory[updatedHistory.length - 1].id);
      } else {
        setActiveId(null);
        setFileName('');
        setResumeText('');
        setScore(null);
        setBreakdown([]);
        setNote('');
        setUpdatedScore(null);
        setUpdatedBreakdown([]);
        setUpdatedNote('');
        setChanges([]);
        setRewrittenResume('');
        setDownloadBase64('');
        setShowUploadForm(true);
      }
    }
  }

  // =====================================================
  // UPLOAD RESUME
  // =====================================================

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    // Reset old result
    setResumeText('');
    setScore(null);
    setBreakdown([]);
    setNote('');

    setUpdatedScore(null);
    setUpdatedBreakdown([]);
    setUpdatedNote('');

    setChanges([]);
    setRewrittenResume('');

    setDownloadBase64('');
    setDownloadFilename('updated_resume.pdf');

    setOptimizationStatus('');

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('file', file);

      const result = await api.uploadResume(formData);

      setResumeText(
        result.resume_text || ''
      );

      // Save it so the Customize page can use the real resume text
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'vantage-resume-text',
          result.resume_text || ''
        );
      }

      setScore(
        result.score ?? null
      );

      setBreakdown(
        result.breakdown || []
      );

      setNote(
        result.note || ''
      );

      // ===== add this resume to history instead of overwriting =====
      const newEntry = {
        id: Date.now(),
        fileName: file.name,
        resumeText: result.resume_text || '',
        score: result.score ?? null,
        breakdown: result.breakdown || [],
        note: result.note || '',
        updatedScore: null,
        updatedBreakdown: [],
        updatedNote: '',
        changes: [],
        rewrittenResume: '',
        downloadBase64: '',
        downloadFilename: 'updated_resume.pdf',
      };

      const updatedHistory = [...resumeHistory, newEntry];
      persistHistory(updatedHistory);
      setActiveId(newEntry.id);
      setShowUploadForm(false);
      // ===== END =====

    } catch (error) {
      console.error(
        'Resume upload failed:',
        error
      );

      setNote(
        `Unable to analyze the resume: ${error.message}`
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // FIX WITH AI
  // =====================================================

  const fixWithAI = async () => {
    if (!resumeText) {
      setNote(
        'Please upload a resume first.'
      );
      return;
    }

    if (score === null) {
      setNote(
        'ATS score is not ready yet.'
      );
      return;
    }

    setFixing(true);

    // Remove previous optimized result
    setUpdatedScore(null);
    setUpdatedBreakdown([]);
    setUpdatedNote('');

    setChanges([]);
    setRewrittenResume('');

    setDownloadBase64('');
    setDownloadFilename('updated_resume.pdf');

    // ===================================================
    // TARGET SETTINGS
    // ===================================================

    const MAX_ATTEMPTS = 2;

    // Target minimum 85.
    // If original is already 85+, target at least +1.
    const TARGET_SCORE = Math.max(
      85,
      score + 1
    );

    // Best AI result found so far
    let bestResult = null;
    let bestScore = score;

    // Start every optimization from the original resume
    let resumeForNextAttempt = resumeText;

    try {

      // =================================================
      // MULTIPLE AI OPTIMIZATION ATTEMPTS
      // =================================================

      for (
        let attempt = 1;
        attempt <= MAX_ATTEMPTS;
        attempt++
      ) {

        setOptimizationStatus(
          `AI optimization ${attempt}/${MAX_ATTEMPTS} — Target ${TARGET_SCORE}+ ATS`
        );

        console.log(
          `AI attempt ${attempt}/${MAX_ATTEMPTS}`
        );

        console.log(
          `Current best ATS score: ${bestScore}`
        );

        // -----------------------------------------------
        // AI REWRITE + BACKEND RE-SCORE
        // -----------------------------------------------

        const result = await api.tailorResume(
          resumeForNextAttempt,
          ''
        );

        const candidateScore =
          Number(result.updated_score ?? 0);

        console.log(
          `Attempt ${attempt} ATS score:`,
          candidateScore
        );

        // -----------------------------------------------
        // KEEP ONLY BETTER RESULT
        // -----------------------------------------------

        if (
          candidateScore > bestScore &&
          result.rewritten_resume
        ) {
          bestScore = candidateScore;

          bestResult = result;

          // Next attempt improves the current best version
          resumeForNextAttempt =
            result.rewritten_resume;

          console.log(
            `New best ATS score: ${bestScore}`
          );
        }

        // -----------------------------------------------
        // TARGET ACHIEVED
        // -----------------------------------------------

        if (
          bestScore >= TARGET_SCORE
        ) {
          console.log(
            `Target achieved: ${bestScore}`
          );

          break;
        }

        // -----------------------------------------------
        // IF THIS VERSION WAS WORSE
        // Retry using current best/original.
        // -----------------------------------------------

        if (
          candidateScore <= bestScore &&
          !bestResult
        ) {
          resumeForNextAttempt =
            resumeText;
        }
      }


      // =================================================
      // NO IMPROVEMENT FOUND
      // =================================================

      if (!bestResult) {
        setOptimizationStatus('');

        setUpdatedScore(score);

        setUpdatedBreakdown(
          breakdown
        );

        setUpdatedNote(
          'AI tested multiple resume improvements, but none scored higher than your original resume. Your original version remains the stronger ATS version.'
        );

        setChanges([]);
        setRewrittenResume('');
        setDownloadBase64('');

        setNote(
          `Your original ATS score of ${score} is still the best result. Lower-scoring AI versions were rejected automatically.`
        );

        // ===== save "no improvement" result into history entry =====
        if (activeId) {
          const updatedHistory = resumeHistory.map((r) =>
            r.id === activeId
              ? {
                  ...r,
                  updatedScore: score,
                  updatedBreakdown: breakdown,
                  updatedNote:
                    'AI tested multiple resume improvements, but none scored higher than your original resume. Your original version remains the stronger ATS version.',
                }
              : r
          );
          persistHistory(updatedHistory);
        }
        // ===== END =====

        return;
      }


      // =================================================
      // BEST RESULT FOUND
      // =================================================

      setUpdatedScore(
        bestResult.updated_score
      );

      setUpdatedBreakdown(
        bestResult.updated_breakdown || []
      );

      setUpdatedNote(
        bestResult.updated_note || ''
      );


      // =================================================
      // CHANGES
      // =================================================

      setChanges(
        bestResult.changes || []
      );


      // =================================================
      // REWRITTEN RESUME
      // =================================================

      setRewrittenResume(
        bestResult.rewritten_resume || ''
      );


      // =================================================
      // BEST PDF
      // =================================================

      setDownloadBase64(
        bestResult.download_base64 || ''
      );

      setDownloadFilename(
        bestResult.download_filename ||
        'updated_resume.pdf'
      );


      // =================================================
      // SUCCESS MESSAGE
      // =================================================

      const improvement =
        bestResult.updated_score - score;

      let finalNote = '';

      if (
        bestResult.updated_score >= TARGET_SCORE
      ) {
        finalNote = `Resume optimized successfully. ATS score improved from ${score} to ${bestResult.updated_score} (+${improvement} points).`;
        setNote(finalNote);
      } else {
        finalNote = `Best truthful AI optimization improved your ATS score from ${score} to ${bestResult.updated_score} (+${improvement} points). Target was ${TARGET_SCORE}+, but lower-scoring versions were rejected.`;
        setNote(finalNote);
      }

      setOptimizationStatus(
        `Best ATS version selected: ${bestResult.updated_score}`
      );

      // ===== save the AI result into this resume's history entry =====
      if (activeId) {
        const updatedHistory = resumeHistory.map((r) =>
          r.id === activeId
            ? {
                ...r,
                updatedScore: bestResult.updated_score,
                updatedBreakdown: bestResult.updated_breakdown || [],
                updatedNote: bestResult.updated_note || '',
                changes: bestResult.changes || [],
                rewrittenResume: bestResult.rewritten_resume || '',
                downloadBase64: bestResult.download_base64 || '',
                downloadFilename: bestResult.download_filename || 'updated_resume.pdf',
              }
            : r
        );
        persistHistory(updatedHistory);
      }
      // ===== END =====

    } catch (error) {
      console.error(
        'AI rewriting failed:',
        error
      );

      setOptimizationStatus('');

      setNote(
        `AI rewriting failed: ${error.message}`
      );

    } finally {
      setFixing(false);
    }
  };


  // =====================================================
  // DOWNLOAD PDF
  // =====================================================

  const downloadUpdatedResume = () => {
    if (!downloadBase64) {
      setNote(
        'Updated resume is not ready yet.'
      );

      return;
    }

    try {
      const byteCharacters =
        atob(downloadBase64);

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
            type: 'application/pdf'
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
        downloadFilename ||
        'updated_resume.pdf';

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );

    } catch (error) {
      console.error(
        'PDF download failed:',
        error
      );

      setNote(
        'Unable to download the updated PDF.'
      );
    }
  };


  // =====================================================
  // SCORE COLOR
  // =====================================================

  const getScoreColor = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return '#64748b';
    }

    if (value >= 80) {
      return '#2dd4bf';
    }

    if (value >= 60) {
      return '#fbbf24';
    }

    return '#f87171';
  };


  // =====================================================
  // SCORE CIRCLE
  // =====================================================

  const ScoreCircle = ({
    value,
    label
  }) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '180px'
        }}
      >
        <div
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',

            border:
              `14px solid ${getScoreColor(value)}`,

            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',

            boxShadow:
              value !== null
                ? `0 0 30px ${getScoreColor(value)}55`
                : 'none',

            background: '#111827'
          }}
        >
          <div
            style={{
              fontSize: '44px',
              fontWeight: '800',
              lineHeight: 1
            }}
          >
            {value ?? '--'}
          </div>

          <div
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              marginTop: '8px'
            }}
          >
            ATS score
          </div>
        </div>

        <div
          style={{
            marginTop: '14px',
            color: '#cbd5e1',
            fontWeight: '700'
          }}
        >
          {label}
        </div>
      </div>
    );
  };


  // =====================================================
  // BREAKDOWN
  // =====================================================

  const Breakdown = ({
    items
  }) => {
    if (
      !items ||
      items.length === 0
    ) {
      return null;
    }

    return (
      <div
        style={{
          width: '100%',
          marginTop: '25px'
        }}
      >
        {items.map(
          (item, index) => (
            <div
              key={index}

              style={{
                display: 'flex',
                justifyContent:
                  'space-between',

                alignItems: 'center',

                padding: '13px 0',

                borderBottom:
                  '1px solid #263246'
              }}
            >
              <span
                style={{
                  color: '#cbd5e1'
                }}
              >
                {item.label}
              </span>

              <span
                style={{
                  fontWeight: '800',

                  color:
                    item.value >= 70
                      ? '#2dd4bf'
                      : '#fbbf24'
                }}
              >
                {item.value}
              </span>
            </div>
          )
        )}
      </div>
    );
  };


  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <Layout>
      <div
        style={{
          minHeight: '100vh',
          background: '#0b111c',
          color: '#f8fafc',
          padding: '50px 30px'
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto'
          }}
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              marginBottom: '30px'
            }}
          >
            <h1
              style={{
                fontSize: '38px',
                margin: 0,
                marginBottom: '10px'
              }}
            >
              Resume & ATS
            </h1>

            <p
              style={{
                color: '#94a3b8',
                fontSize: '18px',
                margin: 0
              }}
            >
              Upload your resume, check your ATS score,
              and optimize it with AI.
            </p>
          </div>


          {/* =================================================
              RESUME HISTORY TILES
          ================================================= */}

          {resumeHistory.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              {resumeHistory.map((r) => (
                <div
                  key={r.id}
                  onClick={() => selectResume(r.id)}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    background: r.id === activeId ? '#123c38' : '#111827',
                    border: r.id === activeId ? '1px solid #2dd4bf' : '1px solid #263246',
                    borderRadius: '12px',
                    padding: '14px 40px 14px 16px',
                    minWidth: '200px',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteResume(r.id);
                    }}
                    title="Delete this resume"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </button>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', paddingRight: '10px' }}>
                    {r.fileName}
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: '800',
                      fontSize: '16px',
                      color: getScoreColor(r.score),
                    }}
                  >
                    ATS {r.score ?? '--'}
                  </div>
                </div>
              ))}

              <div
                onClick={() => setShowUploadForm(true)}
                style={{
                  cursor: 'pointer',
                  border: '1px dashed #334155',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  minWidth: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2dd4bf',
                  fontWeight: '700',
                  fontSize: '13px',
                }}
              >
                + Add resume
              </div>
            </div>
          )}


          {/* =================================================
              UPLOAD CARD
          ================================================= */}

          {showUploadForm && (
          <div
            style={{
              background: '#111827',

              border:
                '1px dashed #334155',

              borderRadius: '18px',

              padding: '38px',

              textAlign: 'center',

              marginBottom: '25px'
            }}
          >
            <input
              id="resume-upload"

              type="file"

              accept=".pdf,.docx"

              onChange={handleUpload}

              style={{
                display: 'none'
              }}
            />

            <label
              htmlFor="resume-upload"

              style={{
                display: 'inline-block',

                background: '#2dd4bf',

                color: '#061018',

                padding: '15px 28px',

                borderRadius: '11px',

                fontSize: '17px',

                fontWeight: '800',

                cursor: 'pointer'
              }}
            >
              Upload Resume
            </label>


            {fileName && (
              <div
                style={{
                  marginTop: '16px',

                  color: '#cbd5e1',

                  fontSize: '16px'
                }}
              >
                {fileName}
              </div>
            )}


            {loading && (
              <div
                style={{
                  marginTop: '15px',
                  color: '#2dd4bf'
                }}
              >
                Analyzing resume...
              </div>
            )}

            {resumeHistory.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setShowUploadForm(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '13px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          )}


          {/* =================================================
              ORIGINAL ATS SCORE
          ================================================= */}

          {score !== null && (
            <div
              style={{
                background: '#111827',

                border:
                  '1px solid #263246',

                borderRadius: '20px',

                padding: '35px',

                marginBottom: '25px'
              }}
            >

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <ScoreCircle
                  value={score}
                  label="Original Resume"
                />
              </div>


              <h3
                style={{
                  marginTop: '35px',
                  marginBottom: '5px'
                }}
              >
                ATS Breakdown
              </h3>


              <Breakdown
                items={breakdown}
              />


              {note && (
                <p
                  style={{
                    color: '#94a3b8',

                    lineHeight: '1.6',

                    marginTop: '22px'
                  }}
                >
                  {note}
                </p>
              )}


              {/* =================================================
                  FIX WITH AI
              ================================================= */}

              <div
                style={{
                  textAlign: 'center',

                  marginTop: '25px'
                }}
              >
                <button
                  onClick={fixWithAI}

                  disabled={
                    fixing ||
                    loading
                  }

                  style={{
                    border: 'none',

                    borderRadius: '12px',

                    padding: '16px 32px',

                    background:
                      fixing
                        ? '#475569'
                        : '#2dd4bf',

                    color: '#061018',

                    fontSize: '18px',

                    fontWeight: '800',

                    cursor:
                      fixing
                        ? 'not-allowed'
                        : 'pointer'
                  }}
                >
                  {fixing
                    ? 'Optimizing Resume...'
                    : 'Fix with AI'}
                </button>


                {/* =================================================
                    OPTIMIZATION STATUS
                ================================================= */}

                {optimizationStatus && (
                  <div
                    style={{
                      marginTop: '15px',

                      color:
                        fixing
                          ? '#2dd4bf'
                          : '#94a3b8',

                      fontSize: '14px',

                      fontWeight: '600'
                    }}
                  >
                    {optimizationStatus}
                  </div>
                )}

              </div>

            </div>
          )}


          {/* =================================================
              SCORE AFTER AI
          ================================================= */}

          {updatedScore !== null && (
            <div
              style={{
                background: '#111827',

                border:
                  '1px solid #263246',

                borderRadius: '20px',

                padding: '35px',

                marginBottom: '25px'
              }}
            >

              <h2
                style={{
                  textAlign: 'center',

                  marginTop: 0,

                  marginBottom: '35px'
                }}
              >
                ATS Score Improvement
              </h2>


              <div
                style={{
                  display: 'flex',

                  justifyContent: 'center',

                  alignItems: 'center',

                  gap: '50px',

                  flexWrap: 'wrap'
                }}
              >

                {/* ORIGINAL */}

                <ScoreCircle
                  value={score}
                  label="Original Resume"
                />


                {/* ARROW */}

                <div
                  style={{
                    fontSize: '42px',

                    color: '#2dd4bf',

                    fontWeight: '800'
                  }}
                >
                  →
                </div>


                {/* UPDATED */}

                <ScoreCircle
                  value={updatedScore}
                  label="AI Optimized Resume"
                />

              </div>


              {/* =================================================
                  SCORE CHANGE
              ================================================= */}

              {score !== null && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '28px'
                  }}
                >

                  <div
                    style={{
                      display: 'inline-block',

                      padding:
                        '9px 18px',

                      borderRadius:
                        '25px',

                      background:
                        updatedScore > score
                          ? '#123c38'
                          : '#334155',

                      color:
                        updatedScore > score
                          ? '#2dd4bf'
                          : '#cbd5e1',

                      fontWeight:
                        '800'
                    }}
                  >
                    {updatedScore > score
                      ? `+${updatedScore - score} ATS points`
                      : 'Original resume remains the best ATS version'}
                  </div>

                </div>
              )}


              {/* =================================================
                  UPDATED BREAKDOWN
              ================================================= */}

              <div
                style={{
                  marginTop: '35px'
                }}
              >
                <h3>
                  Updated ATS Breakdown
                </h3>


                <Breakdown
                  items={
                    updatedBreakdown
                  }
                />


                {updatedNote && (
                  <p
                    style={{
                      color:
                        '#94a3b8',

                      lineHeight:
                        '1.6',

                      marginTop:
                        '20px'
                    }}
                  >
                    {updatedNote}
                  </p>
                )}

              </div>

            </div>
          )}


          {/* =================================================
              WHAT AI CHANGED
          ================================================= */}

          {changes.length > 0 && (
            <div
              style={{
                background: '#111827',

                border:
                  '1px solid #263246',

                borderRadius: '20px',

                padding: '35px',

                marginBottom: '25px'
              }}
            >

              <h2
                style={{
                  marginTop: 0
                }}
              >
                What AI Changed
              </h2>


              <p
                style={{
                  color: '#94a3b8',

                  marginBottom: '30px'
                }}
              >
                See exactly how your resume was improved.
              </p>


              {changes.map(
                (change, index) => (

                  <div
                    key={index}

                    style={{
                      marginBottom:
                        '30px',

                      paddingBottom:
                        '30px',

                      borderBottom:
                        '1px solid #263246'
                    }}
                  >

                    {/* SECTION */}

                    <div
                      style={{
                        color: '#2dd4bf',

                        fontWeight: '800',

                        marginBottom:
                          '15px'
                      }}
                    >
                      {change.section}
                    </div>


                    {/* BEFORE */}

                    <div
                      style={{
                        marginBottom:
                          '15px'
                      }}
                    >

                      <div
                        style={{
                          color:
                            '#f87171',

                          fontSize:
                            '12px',

                          fontWeight:
                            '800',

                          marginBottom:
                            '7px'
                        }}
                      >
                        BEFORE
                      </div>


                      <div
                        style={{
                          background:
                            '#1e293b',

                          padding:
                            '15px',

                          borderRadius:
                            '9px',

                          color:
                            '#cbd5e1',

                          lineHeight:
                            '1.6'
                        }}
                      >
                        {change.original}
                      </div>

                    </div>


                    {/* AFTER */}

                    <div>

                      <div
                        style={{
                          color:
                            '#2dd4bf',

                          fontSize:
                            '12px',

                          fontWeight:
                            '800',

                          marginBottom:
                            '7px'
                        }}
                      >
                        AFTER
                      </div>


                      <div
                        style={{
                          background:
                            '#12333a',

                          padding:
                            '15px',

                          borderRadius:
                            '9px',

                          color:
                            '#e2e8f0',

                          lineHeight:
                            '1.6'
                        }}
                      >
                        {change.revised}
                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}


          {/* =================================================
              UPDATED RESUME
          ================================================= */}

          {rewrittenResume && (
            <div
              style={{
                background: '#111827',

                border:
                  '1px solid #263246',

                borderRadius: '20px',

                padding: '35px',

                marginBottom: '25px'
              }}
            >

              <div
                style={{
                  display: 'flex',

                  justifyContent:
                    'space-between',

                  alignItems:
                    'center',

                  gap:
                    '20px',

                  flexWrap:
                    'wrap',

                  marginBottom:
                    '25px'
                }}
              >

                {/* TITLE */}

                <div>
                  <h2
                    style={{
                      margin: 0,

                      marginBottom:
                        '6px'
                    }}
                  >
                    Updated Resume
                  </h2>

                  <p
                    style={{
                      margin: 0,

                      color:
                        '#94a3b8'
                    }}
                  >
                    Your highest-scoring AI-optimized resume
                  </p>
                </div>


                {/* =================================================
                    DOWNLOAD PDF
                ================================================= */}

                <button
                  onClick={
                    downloadUpdatedResume
                  }

                  disabled={
                    !downloadBase64
                  }

                  style={{
                    border: 'none',

                    borderRadius:
                      '11px',

                    padding:
                      '13px 22px',

                    background:
                      downloadBase64
                        ? '#2dd4bf'
                        : '#475569',

                    color:
                      '#061018',

                    fontWeight:
                      '800',

                    cursor:
                      downloadBase64
                        ? 'pointer'
                        : 'not-allowed'
                  }}
                >
                  Download Updated Resume PDF
                </button>

              </div>


              {/* =================================================
                  UPDATED RESUME PREVIEW
              ================================================= */}

              <div
                style={{
                  background:
                    '#f8fafc',

                  color:
                    '#111827',

                  borderRadius:
                    '10px',

                  padding:
                    '35px',

                  whiteSpace:
                    'pre-wrap',

                  lineHeight:
                    '1.65',

                  fontSize:
                    '14px',

                  maxHeight:
                    '750px',

                  overflowY:
                    'auto'
                }}
              >
                {rewrittenResume}
              </div>

            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}