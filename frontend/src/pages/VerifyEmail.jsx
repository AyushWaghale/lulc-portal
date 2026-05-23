import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifyEmail, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    // If logged in, go to map
    if (user) {
      navigate('/map');
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    const verify = async () => {
      const res = await verifyEmail(token);
      if (res.success) {
        setStatus('success');
        setMessage(res.msg);
      } else {
        setStatus('error');
        setMessage(res.msg);
      }
    };

    verify();
  }, [token, verifyEmail, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-12 px-4 shadow-xl border border-slate-100 sm:rounded-xl sm:px-10 text-center">
          
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Verifying Email...</h2>
              <p className="text-slate-500 mt-2">Please wait while we verify your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-extrabold text-slate-900">Email Verified!</h2>
              <p className="text-slate-600 mt-2 mb-6">{message}</p>
              <Link 
                to="/login"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Continue to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center animate-in fade-in duration-300">
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-extrabold text-slate-900">Verification Failed</h2>
              <p className="text-slate-600 mt-2 mb-6">{message}</p>
              <Link 
                to="/register"
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Register Again
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
