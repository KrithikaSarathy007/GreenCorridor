import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Navigation, AlertTriangle, Activity, Truck, Crown, Shield
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import TrafficSignal from "@/components/TrafficSignal";

// Priority configuration
const PRIORITY_CONFIG = {
  1: { label: "CRITICAL", color: "bg-red-600", emoji: "🔴", name: "Cardiac Arrest" },
  2: { label: "HIGH", color: "bg-orange-500", emoji: "🟠", name: "Stroke" },
  3: { label: "MEDIUM", color: "bg-yellow-500", emoji: "🟡", name: "Accident" },
  4: { label: "LOW", color: "bg-blue-500", emoji: "🔵", name: "Critical Transfer" },
  5: { label: "NORMAL", color: "bg-gray-500", emoji: "⚪", name: "Other" }
};

// Custom ambulance icon with priority color
const createAmbulanceIcon = (priority, isActive) => {
  const colors = {
    1: '#ef4444',
    2: '#f97316', 
    3: '#eab308',
    4: '#3b82f6',
    5: '#6b7280'
  };
  const color = colors[priority] || colors[5];
  const glow = isActive ? `filter: drop-shadow(0 0 10px ${color});` : '';
  
  return new L.DivIcon({
    html: `<div style="position: relative; ${glow}">
      <div style="font-size: 32px;">🚑</div>
      ${isActive ? `<div style="position: absolute; top: -8px; right: -8px; background: ${color}; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; border: 2px solid white;">P${priority}</div>` : ''}
    </div>`,
    iconSize: [40, 40],
    className: 'custom-div-icon'
  });
};

const createSignalIcon = (state, controlledBy) => {
  const redColor = state === 'red' ? '#ef4444' : '#4a1515';
  const greenColor = state === 'green' ? '#22c55e' : '#153a1f';
  const glowGreen = state === 'green' ? 'filter: drop-shadow(0 0 8px #22c55e);' : '';
  
  return new L.DivIcon({
    html: `
      <div style="position: relative;">
        <svg width="28" height="70" viewBox="0 0 28 70">
          <rect x="2" y="0" width="24" height="58" rx="4" fill="#333" stroke="#555" stroke-width="1"/>
          <circle cx="14" cy="12" r="7" fill="${redColor}"/>
          <circle cx="14" cy="29" r="7" fill="#4a3f15"/>
          <circle cx="14" cy="46" r="7" fill="${greenColor}" style="${glowGreen}"/>
          <rect x="11" y="58" width="6" height="12" fill="#555"/>
        </svg>
        ${controlledBy ? `<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #22c55e; color: white; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 4px; white-space: nowrap;">P${controlledBy}</div>` : ''}
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
    if (center) map.panTo(center, { animate: true });
  }, [center, map]);
  return null;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MultiAmbulanceSimulation() {
  const navigate = useNavigate();
  const [ambulances, setAmbulances] = useState([]);
  const [signals, setSignals] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [priorityConflicts, setPriorityConflicts] = useState([]);
  const intervalRef = useRef(null);

  const GREEN_DISTANCE = 150;

  // Fetch active requests
  const { data: activeRequests = [] } = useQuery({
    queryKey: ['active-requests'],
    queryFn: () => base44.entities.EmergencyRequest.filter({ status: 'in_progress' }),
    refetchInterval: 3000
  });

  // Initialize demo ambulances
  useEffect(() => {
    // Demo: Create 2 ambulances on intersecting routes
    const demoAmbulances = [
      {
        id: 'AMB_001',
        priority: 1,
        emergency: 'Cardiac Arrest',
        hospital: 'City General',
        route: [],
        routeIndex: 0,
        start: { lat: 17.38, lng: 78.48 },
        end: { lat: 17.40, lng: 78.50 }
      },
      {
        id: 'AMB_002', 
        priority: 3,
        emergency: 'Accident',
        hospital: 'Apollo Medical',
        route: [],
        routeIndex: 0,
        start: { lat: 17.385, lng: 78.475 },
        end: { lat: 17.395, lng: 78.505 }
      }
    ];

    // Fetch routes for both ambulances
    Promise.all(demoAmbulances.map(amb => 
      fetch(`https://router.project-osrm.org/route/v1/driving/${amb.start.lng},${amb.start.lat};${amb.end.lng},${amb.end.lat}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(d => ({
          ...amb,
          route: d.routes?.[0]?.geometry.coordinates.map(c => [c[1], c[0]]) || []
        }))
    )).then(ambsWithRoutes => {
      setAmbulances(ambsWithRoutes);
      
      // Create signals at intersections
      const allCoords = ambsWithRoutes.flatMap(a => a.route);
      const newSignals = [];
      for (let i = 30; i < Math.min(allCoords.length, 200); i += 40) {
        if (allCoords[i]) {
          newSignals.push({
            id: `SIG_${newSignals.length + 1}`,
            lat: allCoords[i][0],
            lng: allCoords[i][1],
            state: 'red',
            controlledBy: null
          });
        }
      }
      setSignals(newSignals);
    });
  }, []);

  const startSimulation = () => {
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      setAmbulances(prev => {
        const updated = prev.map(amb => ({
          ...amb,
          routeIndex: Math.min(amb.routeIndex + 1, amb.route.length - 1)
        }));

        // Check for priority conflicts and update signals
        const newSignals = [...signals];
        const conflicts = [];

        newSignals.forEach((signal, sIdx) => {
          const ambulancesNearSignal = updated.filter(amb => {
            if (amb.route.length === 0) return false;
            const pos = amb.route[amb.routeIndex];
            return pos && getDistance(pos[0], pos[1], signal.lat, signal.lng) <= GREEN_DISTANCE;
          });

          if (ambulancesNearSignal.length > 1) {
            // PRIORITY CONFLICT - sort by priority (lower number = higher priority)
            const sorted = ambulancesNearSignal.sort((a, b) => a.priority - b.priority);
            const winner = sorted[0];
            const loser = sorted[1];
            
            conflicts.push({
              signalId: signal.id,
              winner: winner.id,
              winnerPriority: winner.priority,
              loser: loser.id,
              loserPriority: loser.priority
            });

            newSignals[sIdx] = { ...signal, state: 'green', controlledBy: winner.priority };
          } else if (ambulancesNearSignal.length === 1) {
            newSignals[sIdx] = { ...signal, state: 'green', controlledBy: ambulancesNearSignal[0].priority };
          } else {
            newSignals[sIdx] = { ...signal, state: 'red', controlledBy: null };
          }
        });

        setSignals(newSignals);
        setPriorityConflicts(conflicts);

        return updated;
      });
    }, 500);
  };

  const stopSimulation = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/80 backdrop-blur text-white shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Landing")}>
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Multi-Ambulance Priority System
                </h1>
                <p className="text-slate-400 text-sm">Priority-based signal control when ambulances intersect</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {priorityConflicts.length > 0 && (
                <Badge className="bg-amber-500 animate-pulse">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {priorityConflicts.length} Conflict(s)
                </Badge>
              )}
              {isRunning ? (
                <Button onClick={stopSimulation} variant="destructive">Stop</Button>
              ) : (
                <Button onClick={startSimulation} className="bg-emerald-600 hover:bg-emerald-700">
                  <Navigation className="w-4 h-4 mr-2" />
                  Start Simulation
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-96 bg-slate-800 p-4 space-y-4 overflow-y-auto border-r border-slate-700">
          {/* Priority Legend */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Priority Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(PRIORITY_CONFIG).map(([level, config]) => (
                <div key={level} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{config.emoji}</span>
                  <Badge className={`${config.color} text-white`}>P{level}</Badge>
                  <span className="text-slate-300">{config.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Active Ambulances */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Active Ambulances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ambulances.map((amb) => {
                const config = PRIORITY_CONFIG[amb.priority];
                const progress = amb.route.length > 0 ? Math.round((amb.routeIndex / amb.route.length) * 100) : 0;
                
                return (
                  <motion.div
                    key={amb.id}
                    className="p-3 bg-slate-600 rounded-lg"
                    animate={{ 
                      boxShadow: priorityConflicts.some(c => c.winner === amb.id) 
                        ? ['0 0 0 2px #22c55e', '0 0 0 4px #22c55e', '0 0 0 2px #22c55e']
                        : priorityConflicts.some(c => c.loser === amb.id)
                        ? ['0 0 0 2px #ef4444', '0 0 0 4px #ef4444', '0 0 0 2px #ef4444']
                        : 'none'
                    }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🚑</span>
                        <span className="text-white font-medium">{amb.id}</span>
                      </div>
                      <Badge className={`${config.color} text-white`}>
                        P{amb.priority} - {config.label}
                      </Badge>
                    </div>
                    <p className="text-slate-300 text-xs mb-2">{amb.emergency} • {amb.hospital}</p>
                    <div className="w-full bg-slate-500 rounded-full h-1.5">
                      <motion.div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{progress}% complete</p>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Priority Conflicts */}
          <AnimatePresence>
            {priorityConflicts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-amber-900/50 border-amber-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Priority Conflict Resolution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {priorityConflicts.map((conflict, i) => (
                      <div key={i} className="p-2 bg-slate-800 rounded text-xs">
                        <p className="text-white mb-1">📍 {conflict.signalId}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-white">
                            ✓ {conflict.winner} (P{conflict.winnerPriority})
                          </Badge>
                          <span className="text-slate-400">→</span>
                          <Badge variant="outline" className="text-red-400 border-red-400">
                            ✗ {conflict.loser} (P{conflict.loserPriority})
                          </Badge>
                        </div>
                        <p className="text-emerald-400 mt-1">
                          Higher priority ambulance gets green signal
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signal Status */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Signal Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {signals.map((signal, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <TrafficSignal state={signal.state} size="sm" />
                    <span className="text-xs text-slate-400 mt-1">S{i + 1}</span>
                    {signal.controlledBy && (
                      <Badge className="text-[8px] px-1 py-0 bg-emerald-600 mt-1">
                        P{signal.controlledBy}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[17.39, 78.49]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

            {/* Ambulance Routes */}
            {ambulances.map((amb) => (
              <React.Fragment key={amb.id}>
                {amb.route.length > 0 && (
                  <Polyline
                    positions={amb.route}
                    pathOptions={{ 
                      color: amb.priority === 1 ? '#ef4444' : amb.priority === 3 ? '#eab308' : '#3b82f6',
                      weight: 4, 
                      opacity: 0.6,
                      dashArray: amb.priority > 2 ? '10, 10' : undefined
                    }}
                  />
                )}
                {amb.route[amb.routeIndex] && (
                  <>
                    <Marker 
                      position={amb.route[amb.routeIndex]}
                      icon={createAmbulanceIcon(amb.priority, true)}
                    >
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold">{amb.id}</p>
                          <p className="text-sm">Priority: {amb.priority}</p>
                          <p className="text-xs text-gray-500">{amb.emergency}</p>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={amb.route[amb.routeIndex]}
                      radius={GREEN_DISTANCE}
                      pathOptions={{ 
                        color: amb.priority === 1 ? '#ef4444' : '#22c55e',
                        fillOpacity: 0.1,
                        weight: 1
                      }}
                    />
                  </>
                )}
              </React.Fragment>
            ))}

            {/* Traffic Signals */}
            {signals.map((signal) => (
              <Marker
                key={signal.id}
                position={[signal.lat, signal.lng]}
                icon={createSignalIcon(signal.state, signal.controlledBy)}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{signal.id}</p>
                    <p className={signal.state === 'green' ? 'text-green-600' : 'text-red-600'}>
                      {signal.state.toUpperCase()}
                    </p>
                    {signal.controlledBy && (
                      <p className="text-xs text-emerald-600">Controlled by P{signal.controlledBy}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Info Overlay */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur rounded-xl p-4 text-white max-w-xs">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-amber-400" />
              Priority System
            </h3>
            <p className="text-xs text-slate-300">
              When multiple ambulances approach the same signal, the system automatically gives 
              priority to the ambulance with the more critical emergency (lower priority number).
            </p>
            <div className="mt-2 text-xs text-emerald-400">
              P1 (Cardiac) &gt; P2 (Stroke) &gt; P3 (Accident) &gt; P4 (Transfer) &gt; P5 (Other)
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
