import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

export default function Login() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/resume');
    }
  }, [authLoading, user, router]);

  const [mode, setMode] = useState('signup'); // 'signup' or 'login'

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  function updateField(field, value) {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  }

  function validate() {
    const newErrors = {};

    if (mode === 'signup' && !form.name.trim()) {
      newErrors.name = 'Please enter your full name.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!emailPattern.test(form.email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (mode === 'signup') {
      const digitsOnly = form.phone.replace(/\D/g, '');
      if (!digitsOnly) {
        newErrors.phone = 'Phone number is required.';
      } else if (digitsOnly.length !== 10) {
        newErrors.phone = 'Phone number must be exactly 10 digits.';
      }
    }

    if (mode === 'signup' && !form.role.trim()) {
      newErrors.role = 'Please enter your current role or experience level.';
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAuthError('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'vantage-profile',
            JSON.stringify({
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.replace(/\D/g, ''),
              role: form.role.trim(),
            })
          );
        }
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      }

      router.push('/resume');
    } catch (error) {
      setAuthError(friendlyFirebaseError(error.code));
    } finally {
      setSubmitting(false);
    }
  }

  function friendlyFirebaseError(code) {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists — try logging in instead.';
      case 'auth/invalid-email':
        return 'That email address looks invalid.';
      case 'auth/weak-password':
        return 'Password is too weak — use at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  const inputClass = (field) =>
    `bg-surface2 border rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-inksoft outline-none focus:border-teal ${
      errors[field] ? 'border-red-400' : 'border-line'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="text-center mb-7">
          <h1 className="font-display text-2xl font-semibold text-ink">
            {mode === 'signup' ? 'Welcome to Vantage' : 'Welcome back'}
          </h1>
          <p className="text-inksoft text-sm mt-2">
            {mode === 'signup'
              ? 'A few basic details — these help build your resume profile before you upload anything.'
              : 'Log in to continue where you left off.'}
          </p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3">
          {mode === 'signup' && (
            <div>
              <input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass('name')}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
          )}

          <div>
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass('email')}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {mode === 'signup' && (
            <div>
              <input
                placeholder="Phone number (10 digits)"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                maxLength={10}
                inputMode="numeric"
                className={inputClass('phone')}
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <input
                placeholder="Current role / experience level"
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
                className={inputClass('role')}
              />
              {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
            </div>
          )}

          <div>
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={inputClass('password')}
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 bg-indigo text-bg font-semibold text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'signup'
              ? 'Continue to Resume Upload'
              : 'Log in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setErrors({});
              setAuthError('');
            }}
            className="text-inksoft text-xs text-center underline"
          >
            {mode === 'signup'
              ? 'Already have an account? Log in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}