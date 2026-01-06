import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Building2, Hospital, Truck, BarChart3, Shield, Zap, Crown } from "lucide-react";

export default function Landing() {
  const roles = [
    {
      id: "authority",
      title: "Government Authority",
      icon: Building2,
      color: "from-violet-500 to-purple-600",
      features: [
        "Approve private hospital registrations",
        "Monitor green corridor usage",
        "Prevent misuse of emergency access"
      ]
    },
    {
      id: "hospital",
      title: "Hospital Portal",
      icon: Hospital,
      color: "from-emerald-500 to-teal-600",
      features: [
        "Government: auto-approved access",
        "Private: authority approval required",
        "Digital ambulance dispatch"
      ]
    },
    {
      id: "driver",
      title: "Ambulance Driver",
      icon: Truck,
      color: "from-rose-500 to-red-600",
      features: [
        "Live route & destination access",
        "Real-time traffic signal control",
        "Safe guided navigation"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10" />
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl sm:text-7xl mb-6"
            >
              🚦
            </motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4">
              Smart Green <span className="text-emerald-600">Go</span> Corridor
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Intelligent Emergency Dispatch & Priority Signal Management System
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-700">Secure Access</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm">
                <Zap className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-slate-700">Real-time Control</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Role Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`${createPageUrl("AuthLogin")}?role=${role.id}`}>
                <Card className="p-6 h-full bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-0 shadow-lg">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`}>
                    <role.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{role.title}</h3>
                  <ul className="space-y-2">
                    {role.features.map((feature, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <Link 
            to={createPageUrl("Statistics")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <BarChart3 className="w-5 h-5" />
            View Statistics
          </Link>
          <Link 
            to={createPageUrl("MultiAmbulanceSimulation")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <Zap className="w-5 h-5" />
            Priority Demo
          </Link>
        </motion.div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-500">
          Demo-ready system · Designed for real-time emergency response
        </div>
      </div>
    </div>
  );
}
