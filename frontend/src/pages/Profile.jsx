import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Building2, Lock, Camera, 
  ArrowLeft, Save, CheckCircle, AlertCircle, Briefcase,
  Edit3, X, Eye, EyeOff
} from 'lucide-react';

const Profile = () => {
  const { user, getProfile, updateProfile, changePassword } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', phone: '', bio: '', address: '', city: '',
    state: '', pincode: '', organization: '', profilePic: ''
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const res = await getProfile();
    if (res.success) {
      setProfile(res.data);
      setForm({
        name: res.data.name || '',
        phone: res.data.phone || '',
        bio: res.data.bio || '',
        address: res.data.address || '',
        city: res.data.city || '',
        state: res.data.state || '',
        pincode: res.data.pincode || '',
        organization: res.data.organization || '',
        profilePic: res.data.profilePic || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg({ text: '', type: '' });
    const res = await updateProfile(form);
    setSaving(false);
    if (res.success) {
      setProfile(res.data);
      setEditMode(false);
      setMsg({ text: 'Profile updated successfully!', type: 'success' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    } else {
      setMsg({ text: res.msg, type: 'error' });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters', type: 'error' });
      return;
    }
    setChangingPassword(true);
    setPasswordMsg({ text: '', type: '' });
    const res = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    setChangingPassword(false);
    if (res.success) {
      setPasswordMsg({ text: res.msg, type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMsg({ text: '', type: '' }), 3000);
    } else {
      setPasswordMsg({ text: res.msg, type: 'error' });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ text: 'Image must be less than 2MB', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, profilePic: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-indigo-600 font-medium text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Basic Details', icon: User },
    { id: 'contact', label: 'Contact Info', icon: MapPin },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/map" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-sm font-medium">
              <ArrowLeft size={18} />
              Back to Map
            </Link>
            <h1 className="text-lg font-bold text-slate-800">My Profile</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Message */}
        {msg.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-medium transition-all ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {msg.text}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-40"></div>
          </div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6 relative">
            {/* Avatar */}
            <div className="relative -mt-16 mb-4 inline-block">
              <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                {form.profilePic ? (
                  <img src={form.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{getInitials(form.name)}</span>
                )}
              </div>
              {editMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
                >
                  <Camera size={14} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{profile?.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Mail size={14} /> {profile?.email}
                </p>
                {profile?.organization && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Briefcase size={14} /> {profile.organization}
                  </p>
                )}
                {profile?.bio && (
                  <p className="text-sm text-slate-600 mt-2 max-w-lg">{profile.bio}</p>
                )}
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => { setEditMode(false); fetchProfile(); }}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {saving ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
                      ) : (
                        <><Save size={14} /> Save Changes</>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 mt-5 pt-5 border-t border-slate-100">
              <div className="text-center">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Role</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                  profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {profile?.role?.toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Member Since</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Location</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User size={20} className="text-indigo-500" /> Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">{form.name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Email (Read-only)</label>
                  <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-500 border border-slate-100 flex items-center gap-2">
                    <Mail size={14} /> {profile?.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Organization</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      placeholder="Your organization or company"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">{form.organization || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Phone</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 XXXXXXXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100 flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" /> {form.phone || '-'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Bio</label>
                {editMode ? (
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none transition-shadow"
                  />
                ) : (
                  <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100 min-h-[60px]">{form.bio || '-'}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={20} className="text-indigo-500" /> Contact Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Street Address</label>
                {editMode ? (
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main Street"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                  />
                ) : (
                  <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">{form.address || '-'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">City</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">{form.city || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">State</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="Maharashtra"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">{form.state || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Pincode</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                      placeholder="400001"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">{form.pincode || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lock size={20} className="text-indigo-500" /> Change Password
              </h3>

              {passwordMsg.text && (
                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
                  passwordMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {passwordMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm pr-10 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Confirm New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {changingPassword ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Changing...</>
                  ) : (
                    <><Lock size={14} /> Update Password</>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
