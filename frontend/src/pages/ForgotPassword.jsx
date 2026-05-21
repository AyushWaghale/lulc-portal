import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { MapPin, Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    const res = await forgotPassword(email);
    setLoading(false);
    if (res.success) {
      setSent(true);
      setMsg({ text: res.msg, type: 'success' });
    } else {
      setMsg({ text: res.msg, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <MapPin size={40} className="text-indigo-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Forgot Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-2xl sm:px-10">
          {sent ? (
            <div className="text-center py-6 space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Check Your Email</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                We've sent a password reset link to <span className="font-semibold text-indigo-600">{email}</span>. 
                Please check your inbox and follow the instructions.
              </p>
              <p className="text-xs text-slate-400">Link expires in 1 hour</p>
              <div className="pt-4 space-y-3">
                <button 
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="w-full py-2 px-4 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Try a different email
                </button>
                <Link 
                  to="/login" 
                  className="block w-full py-2 px-4 text-sm font-medium text-center text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft size={14} className="inline mr-1" /> Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {msg.text && (
                <div className={`p-3 text-sm rounded-lg border ${
                  msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
                  'bg-green-50 text-green-600 border-green-100'
                }`}>
                  {msg.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Send Reset Link
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
