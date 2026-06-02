import { useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

const MAP_STYLE = { width: "100%", height: "480px" };
const LIBRARIES: ("places")[] = ["places"];

export function PharmacyMapPage() {
  const [center, setCenter]       = useState({ lat: 17.385, lng: 78.4867 }); // Hyderabad default
  const [pharmacies, setPharmacies] = useState<google.maps.places.PlaceResult[]>([]);
  const [selected, setSelected]   = useState<google.maps.places.PlaceResult | null>(null);
  const [map, setMap]             = useState<google.maps.Map | null>(null);
  const [locating, setLocating]   = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);

  function searchNearby(location: { lat: number; lng: number }) {
    if (!map) return;
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
      location, radius: 3000, type: "pharmacy",
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPharmacies(results);
      }
    });
  }

  function locateMe() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setCenter(loc);
        map?.panTo(loc);
        searchNearby(loc);
        setLocating(false);
      },
      () => { alert("Could not get your location."); setLocating(false); }
    );
  }

  if (!isLoaded) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-text-secondary">Loading map…</p>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pharmacy Map</h1>
          <p className="text-text-secondary text-sm mt-0.5">Find pharmacies near you</p>
        </div>
        <button onClick={locateMe} disabled={locating}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60 flex items-center gap-2">
          📍 {locating ? "Locating…" : "Use My Location"}
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4">
        <GoogleMap mapContainerStyle={MAP_STYLE} center={center} zoom={14} onLoad={onLoad}>
          {pharmacies.map((p, i) => (
            <Marker key={i}
              position={{ lat: p.geometry!.location!.lat(), lng: p.geometry!.location!.lng() }}
              onClick={() => setSelected(p)}
              icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
            />
          ))}
          {selected?.geometry?.location && (
            <InfoWindow
              position={{ lat: selected.geometry.location.lat(), lng: selected.geometry.location.lng() }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="text-sm">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-gray-600 text-xs mt-0.5">{selected.vicinity}</p>
                {selected.opening_hours && (
                  <p className={`text-xs mt-1 font-medium ${selected.opening_hours.open_now ? "text-green-600" : "text-red-600"}`}>
                    {selected.opening_hours.open_now ? "Open now" : "Closed"}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {pharmacies.length > 0 && (
        <div>
          <h2 className="font-bold text-text-primary mb-3">{pharmacies.length} Pharmacies Nearby</h2>
          <div className="grid grid-cols-2 gap-3">
            {pharmacies.slice(0, 8).map((p, i) => (
              <div key={i} className="bg-card rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:border-primary transition-colors"
                onClick={() => { setSelected(p); map?.panTo({ lat: p.geometry!.location!.lat(), lng: p.geometry!.location!.lng() }); }}>
                <p className="font-medium text-sm text-text-primary">{p.name}</p>
                <p className="text-xs text-text-secondary mt-0.5">{p.vicinity}</p>
                {p.rating && <p className="text-xs text-orange mt-1">★ {p.rating}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
