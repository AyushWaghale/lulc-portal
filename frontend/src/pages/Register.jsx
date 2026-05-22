import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, ShieldCheck, UserPlus, RefreshCw } from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);       // 1=email, 2=otp, 3=details
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailToken, setEmailToken] = useState('');  // proof from step 2
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [resending, setResending] = useState(false);

  const { sendOtp, verifyOtp, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 2) return;
    setCountdown(600);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── STEP 1: Check email & send OTP ───
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: 'Checking email and sending OTP...', type: 'info' });
    const res = await sendOtp(email);
    setLoading(false);
    if (res.success) {
      setMsg({ text: '', type: '' });
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setMsg({ text: res.msg, type: 'error' });
    }
  };

  // OTP input helpers
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // ─── STEP 2: Verify OTP → get emailToken ───
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length < 6) {
      setMsg({ text: 'Please enter the complete 6-digit OTP.', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: 'Verifying OTP...', type: 'info' });
    const res = await verifyOtp(email, otpStr);
    setLoading(false);
    if (res.success) {
      setEmailToken(res.emailToken);
      setMsg({ text: '', type: '' });
      setStep(3);
    } else {
      setMsg({ text: res.msg, type: 'error' });
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResending(true);
    setMsg({ text: 'Sending new OTP...', type: 'info' });
    const res = await sendOtp(email);
    setResending(false);
    if (res.success) {
      setOtp(['', '', '', '', '', '']);
      setCountdown(600);
      setMsg({ text: 'New OTP sent! Check your inbox.', type: 'success' });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setMsg({ text: res.msg, type: 'error' });
    }
  };

  // ─── STEP 3: Complete registration ───
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: 'Creating your account...', type: 'info' });
    const res = await register(emailToken, name, password);
    setLoading(false);
    if (res.success) {
      setMsg({ text: '🎉 ' + res.msg, type: 'success' });
      setTimeout(() => navigate('/login'), 2500);
    } else {
      setMsg({ text: res.msg, type: 'error' });
      // If emailToken expired, go back to step 1
      if (res.msg.includes('expired') || res.msg.includes('start over')) {
        setTimeout(() => { setStep(1); setMsg({ text: '', type: '' }); }, 2000);
      }
    }
  };

  const msgClass = msg.type === 'error'
    ? 'bg-red-50 text-red-600 border-red-100'
    : msg.type === 'success'
    ? 'bg-green-50 text-green-700 border-green-100'
    : 'bg-blue-50 text-blue-600 border-blue-100';

  const steps = [
    { label: 'Email', icon: <Mail size={14} /> },
    { label: 'Verify OTP', icon: <ShieldCheck size={14} /> },
    { label: 'Details', icon: <UserPlus size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-indigo-600">
          <MapPin size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Create a new account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      {/* Step Indicator */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-5">
        <div className="flex items-center justify-center gap-1">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step > i + 1
                    ? 'bg-green-500 text-white'
                    : step === i + 1
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${step === i + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-14 h-0.5 mb-4 rounded-full transition-all duration-500 ${step > i + 1 ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-xl sm:px-10">

          {msg.text && (
            <div className={`mb-5 p-3 text-sm rounded-md border ${msgClass}`}>
              {msg.text}
            </div>
          )}

          {/* ─── STEP 1: Enter Email ─── */}
          {step === 1 && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  We'll send an OTP to verify this email before creating your account.
                </p>
                <input
                  type="email"
                  required
                  autoFocus
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Mail size={16} />
                }
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
            </form>
          )}

          {/* ─── STEP 2: OTP Verification ─── */}
          {step === 2 && (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="text-center mb-2">
                <p className="text-sm text-slate-600">
                  OTP sent to <span className="font-semibold text-slate-900">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 text-center mb-4">
                  Enter the 6-digit OTP
                </label>
                <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl shadow-sm outline-none transition-all duration-150 ${
                        digit
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Timer */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-slate-500">
                    Expires in{' '}
                    <span className={`font-bold tabular-nums ${countdown < 60 ? 'text-red-500' : 'text-indigo-600'}`}>
                      {formatTime(countdown)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-red-500 font-medium">OTP expired. Please resend.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <ShieldCheck size={16} />
                }
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setMsg({ text: '', type: '' }); setOtp(['','','','','','']); }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                >
                  <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 3: Name & Password ─── */}
          {step === 3 && (
            <form className="space-y-5" onSubmit={handleRegister}>
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg mb-2">
                <ShieldCheck size={16} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-700">
                  <span className="font-semibold">{email}</span> has been verified ✓
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="mt-1 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <UserPlus size={16} />
                }
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Register;
