import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Hospital, LogOut, Truck, MapPin, Clock, Activity,
  Plus, Send, AlertTriangle, User, Phone, FileText
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import MapComponent from "@/components/MapComponent";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [clickMode, setClickMode] = useState("start");
  const [formData, setFormData] = useState({
    emergency_type: "",
    patient_name: "",
    patient_age: "",
    patient_condition: "",
    notes: ""
  });

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      navigate(createPageUrl("AuthLogin") + "?role=hospital");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "hospital") {
      navigate(createPageUrl("Landing"));
      return;
    }
    setCurrentUser(parsed);
  }, [navigate]);

  const { data: drivers = [] } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: () => base44.entities.Driver.filter({ is_approved: true, is_available: true })
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['hospital-requests', currentUser?.id],
    queryFn: () => base44.entities.EmergencyRequest.filter({ hospital_id: currentUser?.id }),
    enabled: !!currentUser?.id
  });

  // Priority levels based on emergency severity
  const PRIORITY_LEVELS = {
    cardiac_arrest: 1,
    stroke: 2,
    accident: 3,
    critical_transfer: 4,
    other: 5
  };

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!selectedDriver || !startLocation || !destination || !formData.emergency_type) {
        throw new Error("Please fill all required fields");
      }
      
      const driver = drivers.find(d => d.id === selectedDriver);
      const isGovHospital = currentUser.type === "government";
      const priorityLevel = PRIORITY_LEVELS[formData.emergency_type] || 5;
      
      const request = await base44.entities.EmergencyRequest.create({
        hospital_id: currentUser.id,
        hospital_name: currentUser.name,
        hospital_type: currentUser.type,
        driver_id: selectedDriver,
        driver_name: driver?.name,
        ambulance_id: driver?.ambulance_id,
        emergency_type: formData.emergency_type,
        priority_level: priorityLevel,
        patient_name: formData.patient_name,
        patient_age: parseInt(formData.patient_age) || null,
        patient_condition: formData.patient_condition,
        status: isGovHospital ? "approved" : "approved",
        start_lat: startLocation.lat,
        start_lng: startLocation.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_name: "Hospital",
        notes: formData.notes,
        corridor_active: false
      });

      // Update driver availability
      await base44.entities.Driver.update(selectedDriver, { is_available: false });

      // Notify driver
      await base44.entities.Notification.create({
        recipient_id: selectedDriver,
        recipient_type: "driver",
        title: "🚨 New Emergency Assignment",
        message: `Emergency: ${formData.emergency_type.replace('_', ' ')}. Patient: ${formData.patient_name || 'Unknown'}. From ${currentUser.name}`,
        type: "assignment",
        request_id: request.id
      });

      // Update hospital corridor count
      const hospital = await base44.entities.Hospital.filter({ id: currentUser.id });
      if (hospital.length > 0) {
        await base44.entities.Hospital.update(currentUser.id, {
          corridor_access_count: (hospital[0].corridor_access_count || 0) + 1
        });
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospital-requests']);
      queryClient.invalidateQueries(['available-drivers']);
      setShowCreateRequest(false);
      setFormData({ emergency_type: "", patient_name: "", patient_age: "", patient_condition: "", notes: "" });
      setStartLocation(null);
      setDestination(null);
      setSelectedDriver(null);
      toast.success("Emergency request created! Driver notified.");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleMapClick = (e) => {
    const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (clickMode === "start") {
      setStartLocation(latlng);
      setClickMode("destination");
      toast.info("Now click to set destination");
    } else {
      setDestination(latlng);
      setClickMode("start");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate(createPageUrl("Landing"));
  };

  if (!currentUser) return null;

  const isApproved = currentUser.is_approved;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Hospital className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{currentUser.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge className={currentUser.type === 'government' ? 'bg-emerald-400' : 'bg-violet-400'}>
                    {currentUser.type}
                  </Badge>
                  {!isApproved && <Badge variant="destructive">Pending Approval</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell userId={currentUser.id} userType="hospital" />
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isApproved && currentUser.type === 'private' ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Pending Approval</h2>
              <p className="text-slate-600">
                Your hospital registration is pending approval from the Government Authority.
                You'll be notified once approved.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm">Total Requests</p>
                      <p className="text-3xl font-bold">{requests.length}</p>
                    </div>
                    <FileText className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Available Drivers</p>
                      <p className="text-3xl font-bold">{drivers.length}</p>
                    </div>
                    <Truck className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-rose-500 to-red-600 text-white border-0 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setShowCreateRequest(true)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Create Emergency</p>
                      <p className="text-lg font-bold">New Request</p>
                    </div>
                    <Plus className="w-8 h-8" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Recent Emergency Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No emergency requests yet</p>
                    <Button 
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setShowCreateRequest(true)}
                    >
                      Create First Request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            request.status === 'completed' ? 'bg-green-100' :
                            request.status === 'in_progress' ? 'bg-blue-100' :
                            request.status === 'approved' ? 'bg-emerald-100' : 'bg-amber-100'
                          }`}>
                            <AlertTriangle className={`w-6 h-6 ${
                              request.status === 'completed' ? 'text-green-600' :
                              request.status === 'in_progress' ? 'text-blue-600' :
                              request.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {request.emergency_type?.replace('_', ' ')}
                              </p>
                              <Badge variant={
                                request.status === 'completed' ? 'default' :
                                request.status === 'in_progress' ? 'secondary' : 'outline'
                              }>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              Patient: {request.patient_name || 'Unknown'} • Driver: {request.driver_name || 'Assigned'}
                            </p>
                          </div>
                        </div>
                        {request.status === 'in_progress' && (
                          <Link to={createPageUrl("Simulation") + `?requestId=${request.id}`}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <MapPin className="w-4 h-4 mr-1" />
                              Track
                            </Button>
                          </Link>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Create Request Dialog */}
      <Dialog open={showCreateRequest} onOpenChange={setShowCreateRequest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Create Emergency Request
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label>Emergency Type *</Label>
                <Select
                  value={formData.emergency_type}
                  onValueChange={(val) => setFormData({ ...formData, emergency_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardiac_arrest">Cardiac Arrest</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="stroke">Stroke</SelectItem>
                    <SelectItem value="critical_transfer">Critical Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Select Driver *</Label>
                <Select
                  value={selectedDriver}
                  onValueChange={setSelectedDriver}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose available driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.ambulance_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient Name</Label>
                  <Input
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Patient Age</Label>
                  <Input
                    type="number"
                    value={formData.patient_age}
                    onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                    placeholder="45"
                  />
                </div>
              </div>

              <div>
                <Label>Patient Condition</Label>
                <Textarea
                  value={formData.patient_condition}
                  onChange={(e) => setFormData({ ...formData, patient_condition: e.target.value })}
                  placeholder="Describe patient's current condition..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Start Location</p>
                  <p className="text-xs text-slate-500">
                    {startLocation ? `${startLocation.lat.toFixed(4)}, ${startLocation.lng.toFixed(4)}` : 'Click on map'}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Destination</p>
                  <p className="text-xs text-slate-500">
                    {destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : 'Click on map'}
                  </p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="h-[400px] rounded-xl overflow-hidden border">
              <MapContainer
                center={[17.385, 78.4867]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker onSelect={(loc) => {
                  if (clickMode === "start") {
                    setStartLocation(loc);
                    setClickMode("destination");
                  } else {
                    setDestination(loc);
                    setClickMode("start");
                  }
                }} />
                {startLocation && <Marker position={[startLocation.lat, startLocation.lng]} />}
                {destination && <Marker position={[destination.lat, destination.lng]} />}
              </MapContainer>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Click to set: {clickMode === "start" ? "Start Location" : "Destination"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateRequest(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => createRequest.mutate()}
              disabled={createRequest.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {createRequest.isPending ? "Creating..." : "Create Emergency Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
