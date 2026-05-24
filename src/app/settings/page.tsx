"use client";

import { useState, useEffect } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Location } from "@/lib/types";

// ── Location Settings ─────────────────────────────────────────────────

function LocationTab() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    address: "",
    lat: 0,
    lng: 0,
    radiusMeters: 100,
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations.filter((l: any) => l.isActive));
      }
    } catch (err) {
      toast.error("Failed to fetch locations");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditLocation(null);
    setFormData({
      label: "",
      address: "",
      lat: 0,
      lng: 0,
      radiusMeters: 100,
    });
    setDialogOpen(true);
  }

  function openEditDialog(loc: Location) {
    setEditLocation(loc);
    setFormData({
      label: loc.label,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      radiusMeters: loc.radiusMeters,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.label || !formData.address) {
      toast.error("Name and address are required");
      return;
    }

    try {
      const isEditing = !!editLocation;
      const url = isEditing ? `/api/locations/${editLocation.id}` : "/api/locations";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save location");

      toast.success(isEditing ? "Location updated" : "Location created");
      setDialogOpen(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete location");
      
      toast.success("Location deleted");
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading locations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Office Locations</h2>
          <p className="text-sm text-muted-foreground">
            Manage physical studio locations for check-in
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {locations.map((loc) => (
          <Card key={loc.id} className="relative overflow-hidden group">
            <CardContent className="p-0">
              <div className="h-32 relative bg-muted/30">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                </div>
                {/* Decorative grid lines */}
                <div className="absolute inset-0 opacity-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute w-full border-t border-foreground"
                      style={{ top: `${(i + 1) * 20}%` }}
                    />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={`v-${i}`}
                      className="absolute h-full border-l border-foreground"
                      style={{ left: `${(i + 1) * 10}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="p-5 border-t border-white/[0.04] bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{loc.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-[200px]">
                      {loc.address}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {loc.radiusMeters}m radius
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs font-mono text-muted-foreground">
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(loc)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={() => handleDelete(loc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {locations.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground text-sm border border-dashed border-white/[0.1] rounded-xl">
            No locations found. Add one to get started.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={formData.label}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g. Studio A"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.lat}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      lat: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.lng}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      lng: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in Radius (meters)</Label>
              <Input
                type="number"
                value={formData.radiusMeters}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    radiusMeters: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editLocation ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Settings Page ────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your studio configuration
        </p>
      </div>

      <LocationTab />
    </div>
  );
}
