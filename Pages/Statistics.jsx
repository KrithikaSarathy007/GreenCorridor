import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import { 
  ArrowLeft, TrendingUp, Hospital, Truck, Activity, Clock,
  CheckCircle, AlertTriangle, Timer, Zap, BarChart3
} from "lucide-react";

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function Statistics() {
  const { data: corridorLogs = [] } = useQuery({
    queryKey: ['corridor-logs'],
    queryFn: () => base44.entities.CorridorLog.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['all-hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['all-drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['all-requests'],
    queryFn: () => base44.entities.EmergencyRequest.list(),
  });

  // Calculate stats
  const totalCorridorUses = corridorLogs.length || requests.filter(r => r.status === 'completed').length;
  const completedCorridors = corridorLogs.filter(c => c.status === 'completed').length;
  const activeCorridors = corridorLogs.filter(c => c.status === 'active').length || requests.filter(r => r.status === 'in_progress').length;
  const totalHospitals = hospitals.length;
  const governmentHospitals = hospitals.filter(h => h.type === 'government').length;
  const privateHospitals = hospitals.filter(h => h.type === 'private').length;
  const approvedDrivers = drivers.filter(d => d.is_approved).length;

  // Hospital access data
  const hospitalAccessData = hospitals
    .filter(h => h.corridor_access_count > 0)
    .map(h => ({
      name: h.name?.substring(0, 15) || 'Hospital',
      value: h.corridor_access_count || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Emergency type distribution
  const emergencyTypeData = requests.reduce((acc, req) => {
    const type = req.emergency_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const emergencyChartData = Object.entries(emergencyTypeData).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value
  }));

  // Hospital type distribution
  const hospitalTypeData = [
    { name: 'Government', value: governmentHospitals, color: '#10b981' },
    { name: 'Private', value: privateHospitals, color: '#8b5cf6' }
  ];

  // Mock timeline data
  const timelineData = [
    { name: 'Mon', corridors: requests.length > 0 ? Math.floor(requests.length * 0.1) + 1 : 4, avgTime: 12 },
    { name: 'Tue', corridors: requests.length > 0 ? Math.floor(requests.length * 0.15) + 1 : 6, avgTime: 10 },
    { name: 'Wed', corridors: requests.length > 0 ? Math.floor(requests.length * 0.2) + 1 : 8, avgTime: 9 },
    { name: 'Thu', corridors: requests.length > 0 ? Math.floor(requests.length * 0.12) + 1 : 5, avgTime: 11 },
    { name: 'Fri', corridors: requests.length > 0 ? Math.floor(requests.length * 0.25) + 1 : 9, avgTime: 8 },
    { name: 'Sat', corridors: requests.length > 0 ? Math.floor(requests.length * 0.15) + 1 : 7, avgTime: 10 },
    { name: 'Sun', corridors: requests.length > 0 ? Math.floor(requests.length * 0.03) + 1 : 3, avgTime: 14 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link 
            to={createPageUrl("Landing")} 
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <motion.span 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl"
            >
              📊
            </motion.span>
            <div>
              <h1 className="text-2xl font-bold">System Statistics</h1>
              <p className="text-amber-100">Smart Green Go Corridor Analytics</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-sm">Total Corridor Uses</p>
                    <p className="text-4xl font-bold mt-1">{totalCorridorUses || requests.length}</p>
                    <p className="text-violet-200 text-xs mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      All time
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Activity className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Registered Hospitals</p>
                    <p className="text-4xl font-bold mt-1">{totalHospitals}</p>
                    <p className="text-emerald-200 text-xs mt-2">
                      {governmentHospitals} Gov · {privateHospitals} Private
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Hospital className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-rose-500 to-red-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-rose-100 text-sm">Approved Drivers</p>
                    <p className="text-4xl font-bold mt-1">{approvedDrivers}</p>
                    <p className="text-rose-200 text-xs mt-2">
                      {drivers.length - approvedDrivers} pending
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Truck className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">Active Now</p>
                    <p className="text-4xl font-bold mt-1">{activeCorridors}</p>
                    <p className="text-amber-200 text-xs mt-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Live corridors
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Timer className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Corridor Usage */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-violet-600" />
                  Weekly Corridor Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="colorCorridors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="corridors" 
                        stroke="#8b5cf6" 
                        fillOpacity={1} 
                        fill="url(#colorCorridors)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Emergency Type Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Emergency Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={emergencyChartData.length > 0 ? emergencyChartData : [{ name: 'No Data', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {emergencyChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Hospital Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hospital Access Count */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hospital className="w-5 h-5 text-emerald-600" />
                  Hospital Corridor Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hospitalAccessData.length > 0 ? hospitalAccessData : [{ name: 'No Data', value: 0 }]} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#9ca3af" />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hospital Type Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Hospital Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hospitalTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {hospitalTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
