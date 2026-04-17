"use client";

import { useEffect, useRef } from "react";
import type { LocationResult, HotelResult, AttractionResult } from "@/types/trip";

interface MapViewProps {
  location: LocationResult;
  hotels?: HotelResult[];
  attractions?: AttractionResult[];
}

export default function MapView({ location, hotels = [], attractions = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapRef.current) return;

      // Always tear down any previous instance first
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* already removed */ }
        mapInstanceRef.current = null;
      }

      // Extra safety: clear any Leaflet internal ID on the container
      // so L.map won't think it's already initialized
      const container = mapRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any)._leaflet_id;
      }

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (cancelled || !mapRef.current) return;

      const map = L.map(container).setView([location.lat, location.lon], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker([location.lat, location.lon])
        .addTo(map)
        .bindPopup(`<b>${location.name}</b><br/>${location.country || ""}`)
        .openPopup();

      const hotelIcon = L.divIcon({
        html: "🏨",
        className: "text-xl",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      hotels.slice(0, 10).forEach((h) => {
        if (h.lat && h.lon) {
          L.marker([h.lat, h.lon], { icon: hotelIcon })
            .addTo(map)
            .bindPopup(`<b>${h.name}</b><br/>Type: ${h.type}`);
        }
      });

      const attrIcon = L.divIcon({
        html: "📍",
        className: "text-xl",
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      attractions.slice(0, 10).forEach((a) => {
        if (a.lat && a.lon) {
          L.marker([a.lat, a.lon], { icon: attrIcon })
            .addTo(map)
            .bindPopup(`<b>${a.name}</b>${a.kind ? `<br/>${a.kind}` : ""}`);
        }
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* already removed */ }
        mapInstanceRef.current = null;
      }
    };
  }, [location, hotels, attractions]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200"
      style={{ zIndex: 0 }}
    />
  );
}
