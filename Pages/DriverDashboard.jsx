import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Truck, LogOut, User, Clock, CheckCircle, MapPin, AlertTriangle,
  Play, Navigation, Phone, FileText, Activity, Shield
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import MapComponent from "@/components/MapComponent";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      navigate(createPageUrl("AuthLogin") + "?role=driver");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "driver") {
      navigate(createPageUrl("Landing"));
      return;
    }
    setCurrentUser(parsed);
  }, [navigate]);

  // Fetch fresh driver data
  const { data: driverData } = useQuery({
    queryKey: ['driver-data', currentUser?.id],
    queryFn: async () => {
      const drivers = await base44.entities.Driver.filter({ id: currentUser?.id });
      return drivers[0];
    },
    enabled: !!currentUser?.id,
    refetchInterval: 5000
  });

  // Fetch assigned requests
  const { data: assignedRequests = [] } = useQuery({
    queryKey: ['driver-requests', currentUser?.id],
    queryFn: () => base44.entities.EmergencyRequest.filter({ driver_id: currentUser?.id }),
    enabled: !!currentUser?.id,
    refetchInterval: 5000
  });

  const activeRequest = assignedRequests.find(r => r.status === 'approved' || r.status === 'in_progress');
  const completedRequests = assignedRequests.filter(r => r.status === 'completed');

  const startRoute = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.EmergencyRequest.update(requestId, { 
        status: 'in_progress',
        corridor_active: true 
      });
      
      // Create corridor log
      await base44.entities.CorridorLog.create({
        request_id: requestId,
        hospital_name: activeRequest?.hospital_name,
        driver_name: currentUser?.name,
        emergency_type: activeRequest?.emergency_type,
        start_time: new Date().toISOString(),
        status: 'active',
        signals_controlled: 0
      });
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries(['driver-requests']);
      toast.success("Route started! Green Corridor activated.");
      navigate(createPageUrl("Simulation") + `?requestId=${requestId}`);
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate(createPageUrl("Landing"));
  };

  if (!currentUser) return null;

  const isApproved = driverData?.is_approved ?? currentUser.is_approved;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-red-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Driver Dashboard</h1>
                <div className="flex items-center gap-2">
                  <span className="text-rose-200 text-sm">🚑 {currentUser.ambulance_id}</span>
                  {!isApproved && <Badge variant="destructive" className="bg-amber-500">Pending</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell userId={currentUser.id} userType="driver" />
              <Sheet open={showProfile} onOpenChange={setShowProfile}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="text-white hover:bg-white/20">
                    <User className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Driver Profile</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="flex flex-col items-center">
                      <Avatar className="w-24 h-24">
                        <AvatarFallback className="bg-rose-100 text-rose-600 text-2xl">
                          {currentUser.name?.charAt(0) || 'D'}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-bold mt-4">{driverData?.name || currentUser.name}</h3>
                      <Badge className={isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {isApproved ? 'Approved' : 'Pending Approval'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Truck className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500">Ambulance ID</p>
                          <p className="font-medium">{driverData?.ambulance_id || currentUser.ambulance_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Clock className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500">Experience</p>
                          <p className="font-medium">{driverData?.experience_years || currentUser.experience_years || 0} years</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Activity className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500">Completed Trips</p>
                          <p className="font-medium">{completedRequests.length}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Shield className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500">Status</p>
                          <p className="font-medium">{driverData?.is_available ? 'Available' : 'On Duty'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isApproved ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Pending Approval</h2>
              <p className="text-slate-600">
                Your driver account is pending approval from the Government Authority.
                You'll be notified once approved.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Assignment */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Current Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeRequest ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No Active Assignments</p>
                    <p className="text-sm">You'll be notified when a new emergency is assigned</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-6 border-2 border-red-200"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-100 text-red-700 text-lg px-3 py-1">
                            🚨 {activeRequest.emergency_type?.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {activeRequest.status === 'in_progress' && (
                            <span className="animate-pulse text-green-500">● LIVE</span>
                          )}
                        </div>
                        <p className="text-slate-600">From: {activeRequest.hospital_name}</p>
                      </div>
                      {activeRequest.status === 'approved' && (
                        <Button 
                          size="lg"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => startRoute.mutate(activeRequest.id)}
                          disabled={startRoute.isPending}
                        >
                          <Play className="w-5 h-5 mr-2" />
                          Start Route
                        </Button>
                      )}
                      {activeRequest.status === 'in_progress' && (
                        <Link to={createPageUrl("Simulation") + `?requestId=${activeRequest.id}`}>
                          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                            <Navigation className="w-5 h-5 mr-2" />
                            Open Navigation
                          </Button>
                        </Link>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Patient</p>
                        <p className="font-semibold">{activeRequest.patient_name || 'Unknown'}</p>
                        {activeRequest.patient_age && (
                          <p className="text-sm text-slate-600">{activeRequest.patient_age} years old</p>
                        )}
                      </div>
                      <div className="bg-white p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Condition</p>
                        <p className="font-semibold text-red-600">
                          {activeRequest.patient_condition || 'Critical'}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Destination</p>
                        <p className="font-semibold">{activeRequest.destination_name || 'Hospital'}</p>
                      </div>
                    </div>

                    {activeRequest.notes && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-700 mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Notes
                        </p>
                        <p className="text-sm text-amber-800">{activeRequest.notes}</p>
                      </div>
                    )}

                    {/* Map Preview */}
                    <div className="h-[300px] mt-6 rounded-xl overflow-hidden">
                      <MapComponent
                        center={[activeRequest.start_lat || 17.385, activeRequest.start_lng || 78.4867]}
                        startPosition={{ lat: activeRequest.start_lat, lng: activeRequest.start_lng }}
                        destination={{ lat: activeRequest.destination_lat, lng: activeRequest.destination_lng, name: activeRequest.destination_name }}
                        ambulancePosition={activeRequest.status === 'in_progress' ? { lat: activeRequest.start_lat, lng: activeRequest.start_lng } : null}
                        showAmbulanceRadius={activeRequest.status === 'in_progress'}
                      />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Completed Trips */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Completed Trips ({completedRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedRequests.length === 0 ? (
                  <p className="text-center py-8 text-slate-400">No completed trips yet</p>
                ) : (
                  <div className="space-y-3">
                    {completedRequests.slice(0, 5).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{request.emergency_type?.replace('_', ' ')}</p>
                            <p className="text-sm text-slate-500">{request.hospital_name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600">Completed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
