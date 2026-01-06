import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, LogOut, Hospital, Truck, CheckCircle, XCircle, Clock,
  Activity, MapPin, AlertTriangle, Eye, BarChart3
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import MapComponent from "@/components/MapComponent";
import { toast } from "sonner";

export default function AuthorityDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      navigate(createPageUrl("AuthLogin") + "?role=authority");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "authority") {
      navigate(createPageUrl("Landing"));
      return;
    }
    setCurrentUser(parsed);
  }, [navigate]);

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list()
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list()
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => base44.entities.EmergencyRequest.list('-created_date')
  });

  const pendingHospitals = hospitals.filter(h => h.type === 'private' && !h.is_approved);
  const pendingDrivers = drivers.filter(d => !d.is_approved);
  const activeRequests = requests.filter(r => r.status === 'in_progress');

  const approveHospital = useMutation({
    mutationFn: async (hospitalId) => {
      await base44.entities.Hospital.update(hospitalId, { is_approved: true });
      const hospital = hospitals.find(h => h.id === hospitalId);
      await base44.entities.Notification.create({
        recipient_id: hospitalId,
        recipient_type: "hospital",
        title: "Registration Approved",
        message: "Your hospital has been approved to access the Green Corridor system.",
        type: "approval"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitals']);
      toast.success("Hospital approved");
    }
  });

  const rejectHospital = useMutation({
    mutationFn: async (hospitalId) => {
      await base44.entities.Hospital.delete(hospitalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitals']);
      toast.success("Hospital rejected");
    }
  });

  const approveDriver = useMutation({
    mutationFn: async (driverId) => {
      await base44.entities.Driver.update(driverId, { is_approved: true });
      await base44.entities.Notification.create({
        recipient_id: driverId,
        recipient_type: "driver",
        title: "Account Approved",
        message: "Your driver account has been approved. You can now receive emergency assignments.",
        type: "approval"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      toast.success("Driver approved");
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate(createPageUrl("Landing"));
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-purple-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Government Authority</h1>
                <p className="text-violet-200 text-sm">Green Corridor Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to={createPageUrl("Statistics")}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Statistics
              </Link>
              <NotificationBell userId="authority" userType="authority" />
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Pending Hospitals</p>
                  <p className="text-3xl font-bold">{pendingHospitals.length}</p>
                </div>
                <Hospital className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500 to-red-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-sm">Pending Drivers</p>
                  <p className="text-3xl font-bold">{pendingDrivers.length}</p>
                </div>
                <Truck className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-green-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Active Corridors</p>
                  <p className="text-3xl font-bold">{activeRequests.length}</p>
                </div>
                <Activity className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Hospitals</p>
                  <p className="text-3xl font-bold">{hospitals.length}</p>
                </div>
                <Building2 className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="hospitals" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="hospitals" className="gap-2">
              <Hospital className="w-4 h-4" />
              Hospital Approvals
              {pendingHospitals.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingHospitals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2">
              <Truck className="w-4 h-4" />
              Driver Approvals
              {pendingDrivers.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingDrivers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Activity className="w-4 h-4" />
              Live Monitoring
            </TabsTrigger>
          </TabsList>

          {/* Hospital Approvals */}
          <TabsContent value="hospitals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Hospital Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingHospitals.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No pending hospital registrations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingHospitals.map((hospital) => (
                      <motion.div
                        key={hospital.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                            <Hospital className="w-6 h-6 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{hospital.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">Private</Badge>
                              <span className="text-xs text-slate-500">@{hospital.username}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => approveHospital.mutate(hospital.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectHospital.mutate(hospital.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Driver Approvals */}
          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle>Pending Driver Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDrivers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No pending driver registrations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDrivers.map((driver) => (
                      <motion.div
                        key={driver.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-rose-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{driver.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                              <span>🚑 {driver.ambulance_id}</span>
                              <span>•</span>
                              <span>{driver.experience_years || 0} years exp</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approveDriver.mutate(driver.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Monitoring */}
          <TabsContent value="live">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    Active Emergency Routes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeRequests.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active corridors</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeRequests.map((request) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedRequest?.id === request.id 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-transparent bg-slate-50 hover:border-slate-200'
                          }`}
                          onClick={() => setSelectedRequest(request)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  {request.emergency_type?.replace('_', ' ')}
                                </Badge>
                                <span className="animate-pulse">🟢</span>
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                {request.hospital_name} → {request.destination_name || 'Destination'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Driver: {request.driver_name || 'Assigned'}
                              </p>
                            </div>
                            <Eye className="w-5 h-5 text-slate-400" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Live Map View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] rounded-xl overflow-hidden">
                    <MapComponent
                      center={selectedRequest ? [selectedRequest.start_lat || 17.385, selectedRequest.start_lng || 78.4867] : [17.385, 78.4867]}
                      ambulancePosition={selectedRequest ? { lat: selectedRequest.start_lat, lng: selectedRequest.start_lng } : null}
                      destination={selectedRequest ? { lat: selectedRequest.destination_lat, lng: selectedRequest.destination_lng, name: selectedRequest.destination_name } : null}
                      showAmbulanceRadius={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
