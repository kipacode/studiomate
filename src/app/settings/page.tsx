"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Location } from "@/lib/types";
import { mockLocations } from "@/lib/mock-data";

// ── Location Settings ─────────────────────────────────────────────────

function LocationTab() {
  const [location, setLocation] = useState<Location>(mockLocations[0]);
  const [editing, setEditing] = useState(false);

  function handleSave() {
    setEditing(false);
    toast.success("Location updated successfully");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Office Location</h2>
          <p className="text-sm text-muted-foreground">
            Register and manage your studio location
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} size="sm" variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={location.label}
                onChange={(e) =>
                  setLocation((l) => ({ ...l, label: e.target.value }))
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={location.address}
                onChange={(e) =>
                  setLocation((l) => ({ ...l, address: e.target.value }))
                }
                disabled={!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={location.lat}
                  onChange={(e) =>
                    setLocation((l) => ({
                      ...l,
                      lat: parseFloat(e.target.value),
                    }))
                  }
                  disabled={!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={location.lng}
                  onChange={(e) =>
                    setLocation((l) => ({
                      ...l,
                      lng: parseFloat(e.target.value),
                    }))
                  }
                  disabled={!editing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in Radius (meters)</Label>
              <Input
                type="number"
                value={location.radiusMeters}
                onChange={(e) =>
                  setLocation((l) => ({
                    ...l,
                    radiusMeters: parseInt(e.target.value),
                  }))
                }
                disabled={!editing}
              />
            </div>
            {editing && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave}>Save Changes</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setLocation(mockLocations[0]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map Placeholder */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full min-h-[320px] relative bg-muted/30">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{location.label}</p>
                <p className="text-sm mt-1">{location.address}</p>
                <p className="text-xs mt-2 font-mono">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  Radius: {location.radiusMeters}m
                </Badge>
              </div>
            </div>
            {/* Decorative grid lines */}
            <div className="absolute inset-0 opacity-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute w-full border-t border-foreground"
                  style={{ top: `${(i + 1) * 10}%` }}
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
          </CardContent>
        </Card>
      </div>
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
