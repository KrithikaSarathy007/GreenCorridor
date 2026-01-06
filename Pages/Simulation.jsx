import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Navigation, CheckCircle, AlertTriangle, MapPin,
  Activity, Clock, Truck
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "sonner";
import TrafficSignal from "@/components/TrafficSignal";

// Custom icons
const ambulanceIcon = new L.DivIcon({
  html: '<div style="font-size: 32px; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));">🚑</div>',
  iconSize: [40, 40],
  className: 'custom-div-icon'
});

const hospitalIcon = new L.DivIcon({
  html: '<div style="font-size: 28px;">🏥</div>',
  iconSize: [30, 30],
  className: 'custom-div-icon'
});

// Traffic signal icon generator
const createSignalIcon = (state) => {
  const redColor = state === 'red' ? '#ef4444' : '#4a1515';
  const yellowColor = state === 'yellow' ? '#fbbf24' : '#4a3f15';
  const greenColor = state === 'green' ? '#22c55e' : '#153a1f';
  const glowRed = state === 'red' ? 'filter: drop-shadow(0 0 8px #ef4444);' : '';
  const glowGreen = state === 'green' ? 'filter: drop-shadow(0 0 8px #22c55e);' : '';
  
  return new L.DivIcon({
    html: `
      <div style="position: relative;">
        <svg width="28" height="70" viewBox="0 0 28 70">
          <!-- Signal housing -->
          <rect x="2" y="0" width="24" height="58" rx="4" fill="url(#signalGrad)" stroke="#555" stroke-width="1"/>
          <defs>
            <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#4a4a4a"/>
              <stop offset="50%" style="stop-color:#3a3a3a"/>
              <stop offset="100%" style="stop-color:#2a2a2a"/>
            </linearGradient>
          </defs>
          
          <!-- Red light -->
          <circle cx="14" cy="12" r="7" fill="${redColor}" style="${glowRed}"/>
          <circle cx="11" cy="10" r="2" fill="rgba(255,255,255,0.3)"/>
          
          <!-- Yellow light -->
          <circle cx="14" cy="29" r="7" fill="${yellowColor}"/>
          <circle cx="11" cy="27" r="2" fill="rgba(255,255,255,0.3)"/>
          
          <!-- Green light -->
          <circle cx="14" cy="46" r="7" fill="${greenColor}" style="${glowGreen}"/>
          <circle cx="11" cy="44" r="2" fill="rgba(255,255,255,0.3)"/>
          
          <!-- Pole -->
          <rect x="11" y="58" width="6" height="12" fill="#555"/>
        </svg>
      </div>
    `,
    iconSize: [28, 70],
    iconAnchor: [14, 70],
    className: 'traffic-signal-icon'
  });
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
}

// Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Simulation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [requestId, setRequestId] = useState(null);
  const [route, setRoute] = useState([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [signals, setSignals] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);

  const GREEN_DISTANCE = 150; // meters

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("requestId");
    if (id) {
      setRequestId(id);
    }
  }, []);

  const { data: request } = useQuery({
    queryKey: ['simulation-request', requestId],
    queryFn: async () => {
      const requests = await base44.entities.EmergencyRequest.filter({ id: requestId });
      return requests[0];
    },
    enabled: !!requestId
  });

  // Fetch route from OSRM
  useEffect(() => {
    if (request?.start_lat && request?.destination_lat) {
      fetch(
        `https://router.project-osrm.org/route/v1/driving/${request.start_lng},${request.start_lat};${request.destination_lng},${request.destination_lat}?overview=full&geometries=geojson`
      )
        .then(r => r.json())
        .then(d => {
          if (d.routes && d.routes[0]) {
            const coords = d.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRoute(coords);
            
            // Create signals along route
            const newSignals = [];
            for (let i = 40; i < coords.length; i += 50) {
              newSignals.push({
                id: `SIGNAL_${newSignals.length + 1}`,
                lat: coords[i][0],
                lng: coords[i][1],
                state: 'red'
              });
            }
            setSignals(newSignals);
          }
        });
    }
  }, [request]);

  const completeTrip = useMutation({
    mutationFn: async () => {
      await base44.entities.EmergencyRequest.update(requestId, {
        status: 'completed',
        corridor_active: false
      });
      
      // Update driver availability
      if (request?.driver_id) {
        await base44.entities.Driver.update(request.driver_id, { is_available: true });
      }

      // Update corridor log
      const logs = await base44.entities.CorridorLog.filter({ request_id: requestId });
      if (logs.length > 0) {
        await base44.entities.CorridorLog.update(logs[0].id, {
          status: 'completed',
          end_time: new Date().toISOString(),
          signals_controlled: signals.length
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['simulation-request']);
      toast.success("Trip completed successfully!");
    }
  });

  const startSimulation = () => {
    if (route.length === 0) return;
    setIsRunning(true);
    setRouteIndex(0);

    intervalRef.current = setInterval(() => {
      setRouteIndex(prev => {
        const next = prev + 1;
        if (next >= route.length) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setIsCompleted(true);
          completeTrip.mutate();
          return prev;
        }
        return next;
      });
    }, 400);
  };

  // Update signal states based on ambulance position
  useEffect(() => {
    if (route.length === 0 || routeIndex >= route.length) return;

    const ambulancePos = route[routeIndex];
    
    setSignals(prev => prev.map(signal => {
      const distance = getDistance(ambulancePos[0], ambulancePos[1], signal.lat, signal.lng);
      return {
        ...signal,
        state: distance <= GREEN_DISTANCE ? 'green' : 'red'
      };
    }));
  }, [routeIndex, route]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const backUrl = currentUser.role === 'driver' ? 'DriverDashboard' : 
                  currentUser.role === 'hospital' ? 'HospitalDashboard' : 'AuthorityDashboard';

  const ambulancePosition = route[routeIndex] || (request ? [request.start_lat, request.start_lng] : [17.385, 78.4867]);
  const greenSignals = signals.filter(s => s.state === 'green').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur text-white shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl(backUrl)}>
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-400" />
                  Green Corridor Simulation
                </h1>
                <p className="text-slate-400 text-sm">
                  {request?.emergency_type?.replace('_', ' ')} • {request?.hospital_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isRunning && (
                <Badge className="bg-emerald-500 animate-pulse">
                  <Activity className="w-4 h-4 mr-1" />
                  LIVE
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-slate-800 p-4 space-y-4 overflow-y-auto border-r border-slate-700">
          {/* Status Card */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Trip Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Progress</span>
                <span className="text-white font-medium">
                  {route.length > 0 ? Math.round((routeIndex / route.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <motion.div
                  className="bg-emerald-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${route.length > 0 ? (routeIndex / route.length) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Signal Control */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Signal Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Total Signals</span>
                <span className="text-white font-medium">{signals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Green Now</span>
                <span className="text-emerald-400 font-medium">{greenSignals}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {signals.map((signal, i) => (
                  <motion.div
                    key={i}
                    className="flex flex-col items-center"
                    animate={{ scale: signal.state === 'green' ? [1, 1.05, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: signal.state === 'green' ? Infinity : 0 }}
                  >
                    <TrafficSignal state={signal.state} size="sm" />
                    <span className="text-xs text-slate-400 mt-1">S{i + 1}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Patient Info */}
          {request && (
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{request.emergency_type?.replace('_', ' ')}</Badge>
                </div>
                <p className="text-white text-sm">
                  {request.patient_name || 'Unknown Patient'}
                </p>
                {request.patient_age && (
                  <p className="text-slate-400 text-xs">{request.patient_age} years old</p>
                )}
                {request.patient_condition && (
                  <p className="text-amber-400 text-xs">{request.patient_condition}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {!isRunning && !isCompleted && route.length > 0 && (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={startSimulation}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Start Navigation
              </Button>
            )}
            {isCompleted && (
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate(createPageUrl(backUrl))}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={ambulancePosition}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap'
            />
            <MapController center={ambulancePosition} />

            {/* Route */}
            {route.length > 0 && (
              <Polyline
                positions={route}
                pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.7 }}
              />
            )}

            {/* Ambulance */}
            {ambulancePosition && (
              <>
                <Marker position={ambulancePosition} icon={ambulanceIcon} />
                <Circle
                  center={ambulancePosition}
                  radius={GREEN_DISTANCE}
                  pathOptions={{ 
                    color: '#22c55e', 
                    fillColor: '#22c55e', 
                    fillOpacity: 0.15,
                    weight: 2
                  }}
                />
              </>
            )}

            {/* Destination */}
            {request?.destination_lat && (
              <Marker 
                position={[request.destination_lat, request.destination_lng]}
                icon={hospitalIcon}
              />
            )}

            {/* Traffic Signals */}
            {signals.map((signal) => (
              <Marker
                key={signal.id}
                position={[signal.lat, signal.lng]}
                icon={createSignalIcon(signal.state)}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{signal.id}</p>
                    <p className={`text-sm font-medium ${signal.state === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                      {signal.state.toUpperCase()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Status Overlay */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <span className="font-medium">Ambulance Status</span>
            </div>
            <div className="text-sm text-slate-300">
              <p>🟢 Green Corridor: {isRunning ? 'Active' : isCompleted ? 'Completed' : 'Standby'}</p>
              <p>📍 Signals Passed: {signals.filter((_, i) => {
                if (route.length === 0) return false;
                const signalPos = [signals[i]?.lat, signals[i]?.lng];
                const ambPos = route[routeIndex];
                if (!signalPos[0] || !ambPos) return false;
                return getDistance(ambPos[0], ambPos[1], signalPos[0], signalPos[1]) > GREEN_DISTANCE && 
                       route.findIndex(p => getDistance(p[0], p[1], signalPos[0], signalPos[1]) < GREEN_DISTANCE) < routeIndex;
              }).length}</p>
            </div>
          </div>

          {/* Completion Overlay */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-2xl p-8 text-center max-w-md"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Patient Delivered Safely!</h2>
                  <p className="text-slate-600 mb-6">
                    The emergency transport has been completed successfully.
                    All signals have returned to normal operation.
                  </p>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => navigate(createPageUrl(backUrl))}
                  >
                    Return to Dashboard
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
