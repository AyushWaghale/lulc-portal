import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL;
import { Users, Shield, Trash2, ShieldAlert, Database, MapPin, Layers, Clock, Activity } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/auth/users`),
        axios.get(`${API}/admin/stats`)
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API}/auth/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
      // Refresh stats implicitly by fetching again, or manually decrement
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'admin') {
    return <Navigate to="/map" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          </div>
          <button 
            onClick={() => window.location.href = '/map'} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition text-sm font-medium"
          >
            Back to Map Portal
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading system data...</div>
        ) : (
          <>
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.userCount}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Database size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Villages Loaded</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.layerStats?.villages || 0}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg"><MapPin size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Road Segments</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.layerStats?.roads || 0}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Layers size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">LULC Polygons</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.layerStats?.lulcs || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* User Management Table */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> User Management
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                          <td className="px-6 py-4">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.role !== 'admin' && (
                              <button 
                                onClick={() => deleteUser(u._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Activity Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> Recent Activity
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  {stats?.recentUsers?.map(ru => (
                    <div key={ru._id} className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">New user registered</p>
                        <p className="text-xs text-slate-500">{ru.name} ({ru.email})</p>
                      </div>
                    </div>
                  ))}
                  {stats?.recentUsers?.length === 0 && (
                    <p className="text-sm text-slate-500">No recent activity.</p>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
