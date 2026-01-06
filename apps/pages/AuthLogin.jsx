import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Building2, Hospital, Truck } from "lucide-react";
import { toast } from "sonner";

export default function AuthLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    hospitalName: "",
    hospitalType: "government",
    ambulanceId: "",
    experienceYears: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get("role");
    if (roleParam) {
      setRole(roleParam);
    }
  }, []);

  const roleConfig = {
    authority: { icon: Building2, color: "from-violet-500 to-purple-600", title: "Government Authority" },
    hospital: { icon: Hospital, color: "from-emerald-500 to-teal-600", title: "Hospital Portal" },
    driver: { icon: Truck, color: "from-rose-500 to-red-600", title: "Ambulance Driver" }
  };

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);

    try {
      if (role === "driver") {
        const drivers = await base44.entities.Driver.filter({ username: formData.username });
        if (drivers.length > 0 && drivers[0].password === formData.password) {
          localStorage.setItem("currentUser", JSON.stringify({
            id: drivers[0].id,
            username: drivers[0].username,
            role: "driver",
            name: drivers[0].name,
            ambulance_id: drivers[0].ambulance_id,
            is_approved: drivers[0].is_approved,
            experience_years: drivers[0].experience_years
          }));
          navigate(createPageUrl("DriverDashboard"));
        } else {
          toast.error("Invalid credentials");
        }
      } else if (role === "hospital") {
        const hospitals = await base44.entities.Hospital.filter({ username: formData.username });
        if (hospitals.length > 0 && hospitals[0].password === formData.password) {
          localStorage.setItem("currentUser", JSON.stringify({
            id: hospitals[0].id,
            username: hospitals[0].username,
            role: "hospital",
            name: hospitals[0].name,
            type: hospitals[0].type,
            is_approved: hospitals[0].is_approved
          }));
          navigate(createPageUrl("HospitalDashboard"));
        } else {
          toast.error("Invalid credentials");
        }
      } else if (role === "authority") {
        if (formData.username === "admin" && formData.password === "admin123") {
          localStorage.setItem("currentUser", JSON.stringify({
            id: "authority",
            username: "admin",
            role: "authority",
            name: "Government Authority"
          }));
          navigate(createPageUrl("AuthorityDashboard"));
        } else {
          toast.error("Invalid credentials");
        }
      }
    } catch (error) {
      toast.error("Login failed");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!formData.username || !formData.password) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);

    try {
      if (role === "driver") {
        if (!formData.name || !formData.ambulanceId) {
          toast.error("Please fill all fields");
          setLoading(false);
          return;
        }
        const existing = await base44.entities.Driver.filter({ username: formData.username });
        if (existing.length > 0) {
          toast.error("Username already exists");
          setLoading(false);
          return;
        }
        await base44.entities.Driver.create({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          ambulance_id: formData.ambulanceId,
          experience_years: parseInt(formData.experienceYears) || 0,
          is_approved: false,
          is_available: true
        });
        toast.success("Account created! Please login");
        setMode("login");
      } else if (role === "hospital") {
        if (!formData.hospitalName) {
          toast.error("Please fill hospital name");
          setLoading(false);
          return;
        }
        const existing = await base44.entities.Hospital.filter({ username: formData.username });
        if (existing.length > 0) {
          toast.error("Username already exists");
          setLoading(false);
          return;
        }
        const isGov = formData.hospitalType === "government";
        await base44.entities.Hospital.create({
          name: formData.hospitalName,
          username: formData.username,
          password: formData.password,
          type: formData.hospitalType,
          is_approved: isGov,
          corridor_access_count: 0
        });
        if (!isGov) {
          await base44.entities.Notification.create({
            recipient_id: "authority",
            recipient_type: "authority",
            title: "New Hospital Registration",
            message: `${formData.hospitalName} (Private) has registered and requires approval.`,
            type: "approval",
            is_read: false
          });
        }
        toast.success(isGov ? "Account created! Please login" : "Account created! Waiting for authority approval");
        setMode("login");
      }
    } catch (error) {
      toast.error("Signup failed");
    }
    setLoading(false);
  };

  const config = roleConfig[role] || roleConfig.hospital;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-2xl border-0">
          <Link 
            to={createPageUrl("Landing")}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center mx-auto mb-4`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{config.title}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "login" ? "Sign in to continue" : "Create your account"}
            </p>
          </div>

          <div className="space-y-4">
            {mode === "signup" && role === "driver" && (
              <>
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Ambulance ID</Label>
                  <Input
                    value={formData.ambulanceId}
                    onChange={(e) => setFormData({ ...formData, ambulanceId: e.target.value })}
                    placeholder="AMB_108_01"
                  />
                </div>
                <div>
                  <Label>Experience (Years)</Label>
                  <Input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </>
            )}

            {mode === "signup" && role === "hospital" && (
              <>
                <div>
                  <Label>Hospital Name</Label>
                  <Input
                    value={formData.hospitalName}
                    onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                    placeholder="City General Hospital"
                  />
                </div>
                <div>
                  <Label>Hospital Type</Label>
                  <Select
                    value={formData.hospitalType}
                    onValueChange={(val) => setFormData({ ...formData, hospitalType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government">Government Hospital</SelectItem>
                      <SelectItem value="private">Private Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>

            <Button
              onClick={mode === "login" ? handleLogin : handleSignup}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${config.color} hover:opacity-90`}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>

            {role !== "authority" && (
              <p className="text-center text-sm text-slate-500">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-emerald-600 font-medium ml-1 hover:underline"
                >
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            )}

            {role === "authority" && (
              <p className="text-center text-xs text-slate-400 mt-4">
                Default: admin / admin123
              </p>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
