const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Something went wrong (${res.status}).`;

    try {
      const data = await res.json();

      if (data && data.detail) {
        message = data.detail;
      }
    } catch (e) {
      // response wasn't JSON — keep the default message
    }

    throw new Error(message);
  }

  return res.json();
}

export const api = {
  // Uploads a resume file and gets back the parsed ATS score + breakdown.
  uploadResume: async (formData) => {
    const res = await fetch(`${API_BASE}/resume/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let message = `Something went wrong (${res.status}).`;

      try {
        const data = await res.json();

        if (data && data.detail) {
          message = data.detail;
        }
      } catch (e) {
        // response wasn't JSON — keep the default message
      }

      throw new Error(message);
    }

    return res.json();
  },

  // Sends resume text + a job description, gets back tailored suggestions.
  tailorResume: (resumeText, jobDescription) =>
    request('/resume/tailor', {
      method: 'POST',
      body: JSON.stringify({
        resume_text: resumeText,
        job_description: jobDescription,
      }),
    }),

  // Fetches matched job listings.
  getJobs: (query = '') =>
    request(
      `/jobs${query ? `?q=${encodeURIComponent(query)}` : ''}`
    ),

  // Queues an application for a given job.
  applyToJob: (jobId, resumeName = '') =>
    request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        resume_name: resumeName,
      }),
    }),

  // Fetches the user's application tracker rows.
  getApplications: () =>
    request('/applications'),

  // Updates application tracker status.
  updateApplicationStatus: (applicationId, status) =>
    request(`/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
      }),
    }),
};