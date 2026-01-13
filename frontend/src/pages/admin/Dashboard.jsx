import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserPlus, DollarSign, Activity, TrendingUp, AlertCircle, FileText } from 'lucide-react';

const StatCard = ({ icon: Icon, title, value, subtext, color }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
            {subtext && (
                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-lg flex items-center gap-1">
                    <TrendingUp size={12} /> {subtext}
                </span>
            )}
        </div>
        <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const statsRes = await client.get('/admin/stats');
                setStats(statsRes.data);
            } catch (err) {
                console.error("Failed to load admin dashboard", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Admin Overview</h1>
                    <p className="text-slate-500">Platform performance and operational metrics.</p>
                </div>
                <button className="btn-primary">Generate Report</button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={DollarSign}
                    title="Total Revenue"
                    value="$15,400"
                    subtext="+12% vs last month"
                    color="bg-emerald-500"
                />
                <StatCard
                    icon={Users}
                    title="Active Agents"
                    value={stats?.totalAgents || 0}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={UserPlus}
                    title="Pending Approvals"
                    value={stats?.pendingAgents || 0}
                    subtext={stats?.pendingAgents > 0 ? "Action Required" : "All Clear"}
                    color="bg-orange-500"
                />
                <StatCard
                    icon={Activity}
                    title="Total Services"
                    value={stats?.totalServices || 0}
                    color="bg-purple-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Trends (6 Months)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.revenueChart || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} prefix="$" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Activities</h3>
                    <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
                        <Activity size={32} className="mb-2" />
                        <p>No recent alerts</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
