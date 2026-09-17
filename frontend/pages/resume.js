import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import { useAuth } from '../lib/useAuth';

function getHistoryKey(user) {
  if (!user || !user.email) return 'vantage-resumes-guest';
  return `vantage-resumes-${user.email}`;
}

function ensurePdfName(name) {
  const clean = (name || 'resume.pdf').trim();
  return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
}

function buildUpdatedName(originalName) {
  const clean = (originalName || 'Resume.pdf').trim();
  const base = clean.replace(/\.pdf$/i, '').replace(/\.[^/.]+$/, '');
  return `${base}_AI.pdf`;
}

function normalizeHistory(history) {
  const list = Array.isArray(history) ? [...history] : [];

  const originals = list.filter((r) => !r.isOptimized);
  const optimized = list.filter((r) => r.isOptimized);

  // Old localStorage data migration:
  // if an older AI resume has no parentId, attach it to
  // the nearest previous original resume.
  optimized.forEach((child) => {
    if (child.parentId) return;

    const previousOriginals = originals
      .filter((o) => Number(o.id) < Number(child.id))
      .sort((a, b) => Number(b.id) - Number(a.id));

    if (previousOriginals.length > 0) {
      child.parentId = previousOriginals[0].id;
    }
  });

  // FIFO:
  // only newest 2 ORIGINAL resumes are allowed.
  const keptOriginals = originals
    .sort((a, b) => Number(a.id) - Number(b.id))
    .slice(-2);

  const result = [];

  keptOriginals.forEach((original) => {
    result.push(original);

    // Only newest AI version for this original.
    const child = optimized
      .filter((r) => r.parentId === original.id)
      .sort((a, b) => Number(b.id) - Number(a.id))[0];

    if (child) {
      result.push(child);
    }
  });

  return result;
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

  const [optimizationStatus, setOptimizationStatus] =
    useState('');

  // =====================================================
  // RESUME HISTORY
  // =====================================================

  const [resumeHistory, setResumeHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [showUploadForm, setShowUploadForm] =
    useState(true);

  const [openMenuId, setOpenMenuId] =
    useState(null);

  // =====================================================
  // LOAD SAVED HISTORY
  // =====================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return;

    const key = getHistoryKey(user);

    try {
      const saved =
        window.localStorage.getItem(key);

      const parsed =
        saved ? JSON.parse(saved) : [];

      const normalized =
        normalizeHistory(parsed);

      if (normalized.length > 0) {
        setResumeHistory(normalized);

        window.localStorage.setItem(
          key,
          JSON.stringify(normalized)
        );

        const mostRecent =
          normalized[normalized.length - 1];

        applyEntryToState(mostRecent);

        setActiveId(mostRecent.id);
        setShowUploadForm(false);
      } else {
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
        setDownloadFilename(
          'updated_resume.pdf'
        );

        setShowUploadForm(true);
      }
    } catch (e) {
      console.error(
        'Failed to load resume history:',
        e
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // =====================================================
  // CLOSE 3 DOT MENU ON OUTSIDE CLICK
  // =====================================================

  useEffect(() => {
    function handleOutsideClick() {
      setOpenMenuId(null);
    }

    document.addEventListener(
      'click',
      handleOutsideClick
    );

    return () =>
      document.removeEventListener(
        'click',
        handleOutsideClick
      );
  }, []);

  // =====================================================
  // HISTORY HELPERS
  // =====================================================

  function persistHistory(updatedHistory) {
    const normalized =
      normalizeHistory(updatedHistory);

    setResumeHistory(normalized);

    if (typeof window !== 'undefined') {
      const key =
        getHistoryKey(user);

      window.localStorage.setItem(
        key,
        JSON.stringify(normalized)
      );
    }
  }

  function applyEntryToState(entry) {
    if (!entry) return;

    setFileName(
      entry.fileName || ''
    );

    setResumeText(
      entry.resumeText || ''
    );

    setScore(
      entry.score ?? null
    );

    setBreakdown(
      entry.breakdown || []
    );

    setNote(
      entry.note || ''
    );

    setUpdatedScore(
      entry.updatedScore ?? null
    );

    setUpdatedBreakdown(
      entry.updatedBreakdown || []
    );

    setUpdatedNote(
      entry.updatedNote || ''
    );

    setChanges(
      entry.changes || []
    );

    setRewrittenResume(
      entry.rewrittenResume || ''
    );

    setDownloadBase64(
      entry.downloadBase64 || ''
    );

    setDownloadFilename(
      entry.downloadFilename ||
      'updated_resume.pdf'
    );
  }

  function selectResume(id) {
    const entry =
      resumeHistory.find(
        (r) => r.id === id
      );

    if (!entry) return;

    applyEntryToState(entry);

    setActiveId(id);

    setShowUploadForm(false);

    setOptimizationStatus('');
  }

  // =====================================================
  // DELETE RESUME
  // =====================================================

  function deleteResume(id) {
    const target =
      resumeHistory.find(
        (r) => r.id === id
      );

    if (!target) return;

    let updatedHistory;

    if (target.isOptimized) {
      // Delete ONLY updated AI version.
      updatedHistory =
        resumeHistory.filter(
          (r) => r.id !== id
        );

      // Clear updated fields from parent original.
      updatedHistory =
        updatedHistory.map((r) =>
          r.id === target.parentId
            ? {
                ...r,
                updatedScore: null,
                updatedBreakdown: [],
                updatedNote: '',
                changes: [],
                rewrittenResume: '',
                downloadBase64: '',
                downloadFilename:
                  'updated_resume.pdf',
              }
            : r
        );
    } else {
      // Original delete:
      // remove original + its AI child.
      updatedHistory =
        resumeHistory.filter(
          (r) =>
            r.id !== id &&
            r.parentId !== id
        );
    }

    persistHistory(updatedHistory);

    const activeEntryBeforeDelete =
      resumeHistory.find(
        (r) => r.id === activeId
      );

    const shouldChangeActive =
      activeId === id ||
      (
        !target.isOptimized &&
        activeEntryBeforeDelete?.parentId === id
      );

    if (shouldChangeActive) {
      if (updatedHistory.length > 0) {
        const nextOriginal =
          [...updatedHistory]
            .reverse()
            .find(
              (r) => !r.isOptimized
            );

        const next =
          nextOriginal ||
          updatedHistory[
            updatedHistory.length - 1
          ];

        applyEntryToState(next);

        setActiveId(next.id);

        setShowUploadForm(false);
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
        setDownloadFilename(
          'updated_resume.pdf'
        );

        setShowUploadForm(true);
      }
    }
  }

  // =====================================================
  // RENAME RESUME
  // =====================================================

  function renameResume(
    id,
    currentName
  ) {
    const newName =
      window.prompt(
        'Rename this resume:',
        currentName
      );

    if (
      !newName ||
      !newName.trim()
    ) {
      return;
    }

    const cleanName =
      newName.trim();

    const target =
      resumeHistory.find(
        (r) => r.id === id
      );

    if (!target) return;

    const updatedHistory =
      resumeHistory.map((r) => {
        if (r.id !== id) {
          return r;
        }

        // For AI resume:
        // download filename must exactly
        // follow renamed UI filename.
        if (r.isOptimized) {
          return {
            ...r,
            fileName:
              cleanName,

            downloadFilename:
              ensurePdfName(
                cleanName
              ),
          };
        }

        return {
          ...r,
          fileName:
            cleanName,
        };
      });

    persistHistory(
      updatedHistory
    );

    if (id === activeId) {
      setFileName(
        cleanName
      );

      if (target.isOptimized) {
        setDownloadFilename(
          ensurePdfName(
            cleanName
          )
        );
      }
    }
  }

  // =====================================================
  // DOWNLOAD ANY AI TILE
  // =====================================================

  function downloadEntryPdf(
    entry
  ) {
    if (
      !entry.downloadBase64
    ) {
      alert(
        'No PDF available for this updated resume.'
      );

      return;
    }

    try {
      const byteCharacters =
        atob(
          entry.downloadBase64
        );

      const byteNumbers =
        new Array(
          byteCharacters.length
        );

      for (
        let i = 0;
        i <
        byteCharacters.length;
        i++
      ) {
        byteNumbers[i] =
          byteCharacters.charCodeAt(
            i
          );
      }

      const byteArray =
        new Uint8Array(
          byteNumbers
        );

      const blob =
        new Blob(
          [byteArray],
          {
            type:
              'application/pdf'
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.download =
        entry.isOptimized
          ? ensurePdfName(
              entry.fileName
            )
          : (
              entry.downloadFilename ||
              ensurePdfName(
                entry.fileName
              )
            );

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
    }
  }

  // =====================================================
  // UPLOAD RESUME
  // =====================================================

  const handleUpload =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      setFileName(
        file.name
      );

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

      setDownloadFilename(
        'updated_resume.pdf'
      );

      setOptimizationStatus('');

      setLoading(true);

      try {
        const formData =
          new FormData();

        formData.append(
          'file',
          file
        );

        const result =
          await api.uploadResume(
            formData
          );

        setResumeText(
          result.resume_text ||
          ''
        );

        if (
          typeof window !==
          'undefined'
        ) {
          window.localStorage.setItem(
            'vantage-resume-text',
            result.resume_text ||
            ''
          );
        }

        setScore(
          result.score ??
          null
        );

        setBreakdown(
          result.breakdown ||
          []
        );

        setNote(
          result.note ||
          ''
        );

        const newEntry = {
          id:
            Date.now(),

          fileName:
            file.name,

          resumeText:
            result.resume_text ||
            '',

          score:
            result.score ??
            null,

          breakdown:
            result.breakdown ||
            [],

          note:
            result.note ||
            '',

          updatedScore:
            null,

          updatedBreakdown:
            [],

          updatedNote:
            '',

          changes:
            [],

          rewrittenResume:
            '',

          downloadBase64:
            '',

          downloadFilename:
            'updated_resume.pdf',

          isOptimized:
            false,

          parentId:
            null,
        };

        // ==============================================
        // FIFO MAXIMUM 2 ORIGINAL RESUMES
        // ==============================================

        const existingOriginals =
          resumeHistory.filter(
            (r) =>
              !r.isOptimized
          );

        let trimmedHistory =
          [...resumeHistory];

        // If already 2 originals exist,
        // uploading 3rd removes oldest pair.
        if (
          existingOriginals.length >=
          2
        ) {
          const oldestOriginal =
            [...existingOriginals]
              .sort(
                (a, b) =>
                  Number(a.id) -
                  Number(b.id)
              )[0];

          trimmedHistory =
            trimmedHistory.filter(
              (r) =>
                r.id !==
                  oldestOriginal.id &&
                r.parentId !==
                  oldestOriginal.id
            );
        }

        const updatedHistory = [
          ...trimmedHistory,
          newEntry,
        ];

        persistHistory(
          updatedHistory
        );

        setActiveId(
          newEntry.id
        );

        setShowUploadForm(
          false
        );
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

  const fixWithAI =
    async () => {
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

      setUpdatedScore(null);

      setUpdatedBreakdown([]);

      setUpdatedNote('');

      setChanges([]);

      setRewrittenResume('');

      setDownloadBase64('');

      setDownloadFilename(
        'updated_resume.pdf'
      );

      const MAX_ATTEMPTS =
        2;

      const TARGET_SCORE =
        Math.max(
          85,
          score + 1
        );

      let bestResult =
        null;

      let bestScore =
        score;

      let resumeForNextAttempt =
        resumeText;

      try {
        for (
          let attempt = 1;
          attempt <=
          MAX_ATTEMPTS;
          attempt++
        ) {
          setOptimizationStatus(
            `AI optimization ${attempt}/${MAX_ATTEMPTS} — Target ${TARGET_SCORE}+ ATS`
          );

          const result =
            await api.tailorResume(
              resumeForNextAttempt,
              ''
            );

          const candidateScore =
            Number(
              result.updated_score ??
              0
            );

          if (
            candidateScore >
              bestScore &&
            result.rewritten_resume
          ) {
            bestScore =
              candidateScore;

            bestResult =
              result;

            resumeForNextAttempt =
              result.rewritten_resume;
          }

          if (
            bestScore >=
            TARGET_SCORE
          ) {
            break;
          }

          if (
            candidateScore <=
              bestScore &&
            !bestResult
          ) {
            resumeForNextAttempt =
              resumeText;
          }
        }

        // =============================================
        // NO BETTER RESULT
        // =============================================

        if (!bestResult) {
          setOptimizationStatus(
            ''
          );

          setUpdatedScore(
            score
          );

          setUpdatedBreakdown(
            breakdown
          );

          setUpdatedNote(
            'AI tested multiple resume improvements, but none scored higher than your original resume. Your original version remains the stronger ATS version.'
          );

          setChanges([]);

          setRewrittenResume(
            ''
          );

          setDownloadBase64(
            ''
          );

          setNote(
            `Your original ATS score of ${score} is still the best result. Lower-scoring AI versions were rejected automatically.`
          );

          if (activeId) {
            const updatedHistory =
              resumeHistory.map(
                (r) =>
                  r.id ===
                  activeId
                    ? {
                        ...r,

                        updatedScore:
                          score,

                        updatedBreakdown:
                          breakdown,

                        updatedNote:
                          'AI tested multiple resume improvements, but none scored higher than your original resume. Your original version remains the stronger ATS version.',
                      }
                    : r
              );

            persistHistory(
              updatedHistory
            );
          }

          return;
        }

        // =============================================
        // BEST AI RESULT
        // =============================================

        setUpdatedScore(
          bestResult.updated_score
        );

        setUpdatedBreakdown(
          bestResult.updated_breakdown ||
          []
        );

        setUpdatedNote(
          bestResult.updated_note ||
          ''
        );

        setChanges(
          bestResult.changes ||
          []
        );

        setRewrittenResume(
          bestResult.rewritten_resume ||
          ''
        );

        setDownloadBase64(
          bestResult.download_base64 ||
          ''
        );

        setDownloadFilename(
          bestResult.download_filename ||
          'updated_resume.pdf'
        );

        const improvement =
          bestResult.updated_score -
          score;

        if (
          bestResult.updated_score >=
          TARGET_SCORE
        ) {
          setNote(
            `Resume optimized successfully. ATS score improved from ${score} to ${bestResult.updated_score} (+${improvement} points).`
          );
        } else {
          setNote(
            `Best truthful AI optimization improved your ATS score from ${score} to ${bestResult.updated_score} (+${improvement} points). Target was ${TARGET_SCORE}+, but lower-scoring versions were rejected.`
          );
        }

        setOptimizationStatus(
          `Best ATS version selected: ${bestResult.updated_score}`
        );

        // =============================================
        // ORIGINAL + UPDATED RESUME PAIR
        // =============================================

        if (activeId) {
          const currentActive =
            resumeHistory.find(
              (r) =>
                r.id ===
                activeId
            );

          const originalId =
            currentActive?.isOptimized
              ? currentActive.parentId
              : activeId;

          const originalEntry =
            resumeHistory.find(
              (r) =>
                r.id ===
                  originalId &&
                !r.isOptimized
            );

          if (originalEntry) {
            const optimizedName =
              buildUpdatedName(
                originalEntry.fileName
              );

            const newOptimizedEntry =
              {
                id:
                  Date.now(),

                parentId:
                  originalId,

                fileName:
                  optimizedName,

                resumeText:
                  bestResult.rewritten_resume ||
                  '',

                score:
                  bestResult.updated_score,

                breakdown:
                  bestResult.updated_breakdown ||
                  [],

                note:
                  bestResult.updated_note ||
                  '',

                updatedScore:
                  null,

                updatedBreakdown:
                  [],

                updatedNote:
                  '',

                changes:
                  bestResult.changes ||
                  [],

                rewrittenResume:
                  bestResult.rewritten_resume ||
                  '',

                downloadBase64:
                  bestResult.download_base64 ||
                  '',

                downloadFilename:
                  ensurePdfName(
                    optimizedName
                  ),

                isOptimized:
                  true,
              };

            // Update original entry with
            // ATS improvement information.
            let updatedHistory =
              resumeHistory.map(
                (r) =>
                  r.id ===
                  originalId
                    ? {
                        ...r,

                        updatedScore:
                          bestResult.updated_score,

                        updatedBreakdown:
                          bestResult.updated_breakdown ||
                          [],

                        updatedNote:
                          bestResult.updated_note ||
                          '',

                        changes:
                          bestResult.changes ||
                          [],

                        rewrittenResume:
                          bestResult.rewritten_resume ||
                          '',

                        downloadBase64:
                          bestResult.download_base64 ||
                          '',

                        downloadFilename:
                          ensurePdfName(
                            optimizedName
                          ),
                      }
                    : r
              );

            // Only ONE updated AI version
            // is allowed for each original.
            updatedHistory =
              updatedHistory.filter(
                (r) =>
                  !(
                    r.isOptimized &&
                    r.parentId ===
                      originalId
                  )
              );

            updatedHistory.push(
              newOptimizedEntry
            );

            updatedHistory =
              normalizeHistory(
                updatedHistory
              );

            persistHistory(
              updatedHistory
            );

            // After AI finishes,
            // automatically open
            // the UPDATED resume.
            applyEntryToState(
              newOptimizedEntry
            );

            setActiveId(
              newOptimizedEntry.id
            );

            setShowUploadForm(
              false
            );
          }
        }
      } catch (error) {
        console.error(
          'AI rewriting failed:',
          error
        );

        setOptimizationStatus(
          ''
        );

        setNote(
          `AI rewriting failed: ${error.message}`
        );
      } finally {
        setFixing(false);
      }
    };

  // =====================================================
  // DOWNLOAD UPDATED PDF
  // =====================================================

  const downloadUpdatedResume =
    () => {
      if (!downloadBase64) {
        setNote(
          'Updated resume is not ready yet.'
        );

        return;
      }

      try {
        const byteCharacters =
          atob(
            downloadBase64
          );

        const byteNumbers =
          new Array(
            byteCharacters.length
          );

        for (
          let i = 0;
          i <
          byteCharacters.length;
          i++
        ) {
          byteNumbers[i] =
            byteCharacters.charCodeAt(
              i
            );
        }

        const byteArray =
          new Uint8Array(
            byteNumbers
          );

        const blob =
          new Blob(
            [byteArray],
            {
              type:
                'application/pdf'
            }
          );

        const url =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            'a'
          );

        link.href =
          url;

        const currentActive =
          resumeHistory.find(
            (r) =>
              r.id ===
              activeId
          );

        link.download =
          currentActive?.isOptimized
            ? ensurePdfName(
                currentActive.fileName
              )
            : (
                downloadFilename ||
                'updated_resume.pdf'
              );

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

  const getScoreColor =
    (value) => {
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
          flexDirection:
            'column',
          alignItems:
            'center',
          minWidth:
            '180px'
        }}
      >
        <div
          style={{
            width:
              '160px',

            height:
              '160px',

            borderRadius:
              '50%',

            border:
              `14px solid ${getScoreColor(value)}`,

            display:
              'flex',

            flexDirection:
              'column',

            justifyContent:
              'center',

            alignItems:
              'center',

            boxShadow:
              value !== null
                ? `0 0 30px ${getScoreColor(value)}55`
                : 'none',

            background:
              '#111827'
          }}
        >
          <div
            style={{
              fontSize:
                '44px',

              fontWeight:
                '800',

              lineHeight:
                1
            }}
          >
            {value ?? '--'}
          </div>

          <div
            style={{
              color:
                '#94a3b8',

              fontSize:
                '14px',

              marginTop:
                '8px'
            }}
          >
            ATS score
          </div>
        </div>

        <div
          style={{
            marginTop:
              '14px',

            color:
              '#cbd5e1',

            fontWeight:
              '700'
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
          width:
            '100%',

          marginTop:
            '25px'
        }}
      >
        {items.map(
          (
            item,
            index
          ) => (
            <div
              key={index}

              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                padding:
                  '13px 0',

                borderBottom:
                  '1px solid #263246'
              }}
            >
              <span
                style={{
                  color:
                    '#cbd5e1'
                }}
              >
                {item.label}
              </span>

              <span
                style={{
                  fontWeight:
                    '800',

                  color:
                    item.value >=
                    70
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

  const activeEntry =
    resumeHistory.find(
      (r) =>
        r.id ===
        activeId
    );

  const activeLabel =
    activeEntry?.isOptimized
      ? 'Updated / AI Resume'
      : 'Original Resume';

  const originalResumes =
    resumeHistory.filter(
      (r) =>
        !r.isOptimized
    );

  return (
    <Layout>
      <div
        style={{
          minHeight:
            '100vh',

          background:
            '#0b111c',

          color:
            '#f8fafc',

          padding:
            '50px 30px'
        }}
      >
        <div
          style={{
            maxWidth:
              '1100px',

            margin:
              '0 auto'
          }}
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              marginBottom:
                '30px'
            }}
          >
            <h1
              style={{
                fontSize:
                  '38px',

                margin:
                  0,

                marginBottom:
                  '10px'
              }}
            >
              Resume & ATS
            </h1>

            <p
              style={{
                color:
                  '#94a3b8',

                fontSize:
                  '18px',

                margin:
                  0
              }}
            >
              Upload your resume, check your ATS score,
              and optimize it with AI.
            </p>
          </div>

          {/* =================================================
              RESUME HISTORY
          ================================================= */}

          {originalResumes.length >
            0 && (
            <div
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                gap:
                  '16px',

                marginBottom:
                  '20px',
              }}
            >
              {originalResumes.map(
                (original) => {
                  const updated =
                    resumeHistory
                      .filter(
                        (r) =>
                          r.isOptimized &&
                          r.parentId ===
                            original.id
                      )
                      .sort(
                        (
                          a,
                          b
                        ) =>
                          Number(
                            b.id
                          ) -
                          Number(
                            a.id
                          )
                      )[0];

                  const renderResumeTile =
                    (
                      r,
                      typeLabel
                    ) => (
                      <div
                        key={
                          r.id
                        }

                        onClick={() =>
                          selectResume(
                            r.id
                          )
                        }

                        style={{
                          position:
                            'relative',

                          cursor:
                            'pointer',

                          background:
                            r.id ===
                            activeId
                              ? '#123c38'
                              : '#111827',

                          border:
                            r.id ===
                            activeId
                              ? '1px solid #2dd4bf'
                              : '1px solid #263246',

                          borderRadius:
                            '12px',

                          padding:
                            '14px 40px 14px 16px',

                          minWidth:
                            '250px',

                          flex:
                            1,
                        }}
                      >
                        {/* THREE DOT BUTTON */}

                        <button
                          onClick={(
                            e
                          ) => {
                            e.stopPropagation();

                            setOpenMenuId(
                              openMenuId ===
                                r.id
                                ? null
                                : r.id
                            );
                          }}

                          title="More options"

                          style={{
                            position:
                              'absolute',

                            top:
                              '6px',

                            right:
                              '6px',

                            border:
                              'none',

                            background:
                              'transparent',

                            color:
                              '#94a3b8',

                            fontSize:
                              '18px',

                            lineHeight:
                              1,

                            cursor:
                              'pointer',

                            padding:
                              '4px 6px',
                          }}
                        >
                          ⋮
                        </button>

                        {/* MENU */}

                        {openMenuId ===
                          r.id && (
                          <div
                            onClick={(
                              e
                            ) =>
                              e.stopPropagation()
                            }

                            style={{
                              position:
                                'absolute',

                              top:
                                '30px',

                              right:
                                '6px',

                              background:
                                '#1e293b',

                              border:
                                '1px solid #334155',

                              borderRadius:
                                '8px',

                              overflow:
                                'hidden',

                              zIndex:
                                20,

                              minWidth:
                                '140px',

                              boxShadow:
                                '0 10px 25px rgba(0,0,0,0.4)',
                            }}
                          >
                            {/* DOWNLOAD ONLY AI */}

                            {r.isOptimized && (
                              <button
                                onClick={() => {
                                  downloadEntryPdf(
                                    r
                                  );

                                  setOpenMenuId(
                                    null
                                  );
                                }}

                                style={{
                                  display:
                                    'block',

                                  width:
                                    '100%',

                                  textAlign:
                                    'left',

                                  padding:
                                    '10px 14px',

                                  border:
                                    'none',

                                  background:
                                    'transparent',

                                  color:
                                    '#e2e8f0',

                                  fontSize:
                                    '13px',

                                  cursor:
                                    'pointer',
                                }}
                              >
                                Download
                              </button>
                            )}

                            {/* RENAME */}

                            <button
                              onClick={() => {
                                renameResume(
                                  r.id,
                                  r.fileName
                                );

                                setOpenMenuId(
                                  null
                                );
                              }}

                              style={{
                                display:
                                  'block',

                                width:
                                  '100%',

                                textAlign:
                                  'left',

                                padding:
                                  '10px 14px',

                                border:
                                  'none',

                                background:
                                  'transparent',

                                color:
                                  '#e2e8f0',

                                fontSize:
                                  '13px',

                                cursor:
                                  'pointer',
                              }}
                            >
                              Rename
                            </button>

                            {/* DELETE */}

                            <button
                              onClick={() => {
                                deleteResume(
                                  r.id
                                );

                                setOpenMenuId(
                                  null
                                );
                              }}

                              style={{
                                display:
                                  'block',

                                width:
                                  '100%',

                                textAlign:
                                  'left',

                                padding:
                                  '10px 14px',

                                border:
                                  'none',

                                background:
                                  'transparent',

                                color:
                                  '#f87171',

                                fontSize:
                                  '13px',

                                cursor:
                                  'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}

                        {/* TYPE BADGE */}

                        <div
                          style={{
                            display:
                              'inline-block',

                            fontSize:
                              '10px',

                            fontWeight:
                              '800',

                            color:
                              r.isOptimized
                                ? '#2dd4bf'
                                : '#94a3b8',

                            background:
                              r.isOptimized
                                ? 'rgba(45,212,191,0.12)'
                                : 'rgba(148,163,184,0.10)',

                            borderRadius:
                              '5px',

                            padding:
                              '2px 6px',

                            marginBottom:
                              '6px',
                          }}
                        >
                          {typeLabel}
                        </div>

                        {/* FILE NAME */}

                        <div
                          style={{
                            fontSize:
                              '13px',

                            fontWeight:
                              '700',

                            marginBottom:
                              '6px',

                            paddingRight:
                              '20px',

                            wordBreak:
                              'break-word',
                          }}
                        >
                          {r.fileName}
                        </div>

                        {/* ATS */}

                        <div
                          style={{
                            fontFamily:
                              'monospace',

                            fontWeight:
                              '800',

                            fontSize:
                              '16px',

                            color:
                              getScoreColor(
                                r.score
                              ),
                          }}
                        >
                          ATS{' '}
                          {r.score ??
                            '--'}
                        </div>
                      </div>
                    );

                  return (
                    <div
                      key={
                        original.id
                      }

                      style={{
                        display:
                          'flex',

                        gap:
                          '12px',

                        flexWrap:
                          'wrap',

                        padding:
                          '12px',

                        border:
                          '1px solid #1e293b',

                        borderRadius:
                          '14px',

                        background:
                          'rgba(15,23,42,0.35)',
                      }}
                    >
                      {/* ORIGINAL */}

                      {renderResumeTile(
                        original,
                        'ORIGINAL'
                      )}

                      {/* UPDATED */}

                      {updated ? (
                        renderResumeTile(
                          updated,
                          'UPDATED / AI'
                        )
                      ) : (
                        <div
                          style={{
                            flex:
                              1,

                            minWidth:
                              '250px',

                            border:
                              '1px dashed #334155',

                            borderRadius:
                              '12px',

                            padding:
                              '14px 16px',

                            color:
                              '#64748b',

                            display:
                              'flex',

                            alignItems:
                              'center',

                            justifyContent:
                              'center',

                            textAlign:
                              'center',

                            minHeight:
                              '84px',

                            fontSize:
                              '13px',
                          }}
                        >
                          Updated resume will appear here after “Fix with AI”.
                        </div>
                      )}
                    </div>
                  );
                }
              )}

              {/* ADD RESUME */}

              <div
                onClick={() =>
                  setShowUploadForm(
                    true
                  )
                }

                style={{
                  cursor:
                    'pointer',

                  border:
                    '1px dashed #334155',

                  borderRadius:
                    '12px',

                  padding:
                    '14px 20px',

                  maxWidth:
                    '180px',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  color:
                    '#2dd4bf',

                  fontWeight:
                    '700',

                  fontSize:
                    '13px',
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
                background:
                  '#111827',

                border:
                  '1px dashed #334155',

                borderRadius:
                  '18px',

                padding:
                  '38px',

                textAlign:
                  'center',

                marginBottom:
                  '25px'
              }}
            >
              <input
                id="resume-upload"

                type="file"

                accept=".pdf,.docx"

                onChange={
                  handleUpload
                }

                style={{
                  display:
                    'none'
                }}
              />

              <label
                htmlFor="resume-upload"

                style={{
                  display:
                    'inline-block',

                  background:
                    '#2dd4bf',

                  color:
                    '#061018',

                  padding:
                    '15px 28px',

                  borderRadius:
                    '11px',

                  fontSize:
                    '17px',

                  fontWeight:
                    '800',

                  cursor:
                    'pointer'
                }}
              >
                Upload Resume
              </label>

              {fileName && (
                <div
                  style={{
                    marginTop:
                      '16px',

                    color:
                      '#cbd5e1',

                    fontSize:
                      '16px'
                  }}
                >
                  {fileName}
                </div>
              )}

              {loading && (
                <div
                  style={{
                    marginTop:
                      '15px',

                    color:
                      '#2dd4bf'
                  }}
                >
                  Analyzing resume...
                </div>
              )}

              {resumeHistory.length >
                0 && (
                <div
                  style={{
                    marginTop:
                      '16px'
                  }}
                >
                  <button
                    onClick={() =>
                      setShowUploadForm(
                        false
                      )
                    }

                    style={{
                      border:
                        'none',

                      background:
                        'transparent',

                      color:
                        '#94a3b8',

                      fontSize:
                        '13px',

                      textDecoration:
                        'underline',

                      cursor:
                        'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================
              ACTIVE ATS SCORE
          ================================================= */}

          {score !== null && (
            <div
              style={{
                background:
                  '#111827',

                border:
                  '1px solid #263246',

                borderRadius:
                  '20px',

                padding:
                  '35px',

                marginBottom:
                  '25px'
              }}
            >
              <div
                style={{
                  display:
                    'flex',

                  justifyContent:
                    'center'
                }}
              >
                <ScoreCircle
                  value={
                    score
                  }

                  label={
                    activeLabel
                  }
                />
              </div>

              <h3
                style={{
                  marginTop:
                    '35px',

                  marginBottom:
                    '5px'
                }}
              >
                ATS Breakdown
              </h3>

              <Breakdown
                items={
                  breakdown
                }
              />

              {note && (
                <p
                  style={{
                    color:
                      '#94a3b8',

                    lineHeight:
                      '1.6',

                    marginTop:
                      '22px'
                  }}
                >
                  {note}
                </p>
              )}

              {/* =================================================
                  FIX WITH AI
              ================================================= */}

              {!activeEntry?.isOptimized && (
                <div
                  style={{
                    textAlign:
                      'center',

                    marginTop:
                      '25px'
                  }}
                >
                  <button
                    onClick={
                      fixWithAI
                    }

                    disabled={
                      fixing ||
                      loading
                    }

                    style={{
                      border:
                        'none',

                      borderRadius:
                        '12px',

                      padding:
                        '16px 32px',

                      background:
                        fixing
                          ? '#475569'
                          : '#2dd4bf',

                      color:
                        '#061018',

                      fontSize:
                        '18px',

                      fontWeight:
                        '800',

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

                  {optimizationStatus && (
                    <div
                      style={{
                        marginTop:
                          '15px',

                        color:
                          fixing
                            ? '#2dd4bf'
                            : '#94a3b8',

                        fontSize:
                          '14px',

                        fontWeight:
                          '600'
                      }}
                    >
                      {
                        optimizationStatus
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================
              SCORE AFTER AI
          ================================================= */}

          {updatedScore !==
            null && (
            <div
              style={{
                background:
                  '#111827',

                border:
                  '1px solid #263246',

                borderRadius:
                  '20px',

                padding:
                  '35px',

                marginBottom:
                  '25px'
              }}
            >
              <h2
                style={{
                  textAlign:
                    'center',

                  marginTop:
                    0,

                  marginBottom:
                    '35px'
                }}
              >
                ATS Score Improvement
              </h2>

              <div
                style={{
                  display:
                    'flex',

                  justifyContent:
                    'center',

                  alignItems:
                    'center',

                  gap:
                    '50px',

                  flexWrap:
                    'wrap'
                }}
              >
                <ScoreCircle
                  value={
                    score
                  }

                  label="Original Resume"
                />

                <div
                  style={{
                    fontSize:
                      '42px',

                    color:
                      '#2dd4bf',

                    fontWeight:
                      '800'
                  }}
                >
                  →
                </div>

                <ScoreCircle
                  value={
                    updatedScore
                  }

                  label="AI Optimized Resume"
                />
              </div>

              {score !==
                null && (
                <div
                  style={{
                    textAlign:
                      'center',

                    marginTop:
                      '28px'
                  }}
                >
                  <div
                    style={{
                      display:
                        'inline-block',

                      padding:
                        '9px 18px',

                      borderRadius:
                        '25px',

                      background:
                        updatedScore >
                        score
                          ? '#123c38'
                          : '#334155',

                      color:
                        updatedScore >
                        score
                          ? '#2dd4bf'
                          : '#cbd5e1',

                      fontWeight:
                        '800'
                    }}
                  >
                    {updatedScore >
                    score
                      ? `+${updatedScore - score} ATS points`
                      : 'Original resume remains the best ATS version'}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop:
                    '35px'
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
                    {
                      updatedNote
                    }
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =================================================
              WHAT AI CHANGED
          ================================================= */}

          {changes.length >
            0 && (
            <div
              style={{
                background:
                  '#111827',

                border:
                  '1px solid #263246',

                borderRadius:
                  '20px',

                padding:
                  '35px',

                marginBottom:
                  '25px'
              }}
            >
              <h2
                style={{
                  marginTop:
                    0
                }}
              >
                What AI Changed
              </h2>

              <p
                style={{
                  color:
                    '#94a3b8',

                  marginBottom:
                    '30px'
                }}
              >
                See exactly how your resume was improved.
              </p>

              {changes.map(
                (
                  change,
                  index
                ) => (
                  <div
                    key={
                      index
                    }

                    style={{
                      marginBottom:
                        '30px',

                      paddingBottom:
                        '30px',

                      borderBottom:
                        '1px solid #263246'
                    }}
                  >
                    <div
                      style={{
                        color:
                          '#2dd4bf',

                        fontWeight:
                          '800',

                        marginBottom:
                          '15px'
                      }}
                    >
                      {
                        change.section
                      }
                    </div>

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
                        {
                          change.original
                        }
                      </div>
                    </div>

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
                        {
                          change.revised
                        }
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* =================================================
              UPDATED RESUME PREVIEW
          ================================================= */}

          {rewrittenResume && (
            <div
              style={{
                background:
                  '#111827',

                border:
                  '1px solid #263246',

                borderRadius:
                  '20px',

                padding:
                  '35px',

                marginBottom:
                  '25px'
              }}
            >
              <div
                style={{
                  display:
                    'flex',

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
                <div>
                  <h2
                    style={{
                      margin:
                        0,

                      marginBottom:
                        '6px'
                    }}
                  >
                    Updated Resume
                  </h2>

                  <p
                    style={{
                      margin:
                        0,

                      color:
                        '#94a3b8'
                    }}
                  >
                    Your highest-scoring AI-optimized resume
                  </p>
                </div>

                <button
                  onClick={
                    downloadUpdatedResume
                  }

                  disabled={
                    !downloadBase64
                  }

                  style={{
                    border:
                      'none',

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
                {
                  rewrittenResume
                }
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}