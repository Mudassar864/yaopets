import { useState, useEffect } from "react";

type GeoLocationPosition = {
  lat: number;
  lng: number;
  address?: string;
  error?: string;
};

export function useGeoLocation() {
  const [position, setPosition] = useState<GeoLocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada pelo seu navegador");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get address from coordinates
          // This is a simplified implementation
          // In a real app, you'd use a geocoding service API
          const address = await getAddressFromCoords(latitude, longitude);
          
          setPosition({
            lat: latitude,
            lng: longitude,
            address,
          });
        } catch (error) {
          setPosition({
            lat: latitude,
            lng: longitude,
            error: "Não foi possível obter o endereço",
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setError(getGeolocationErrorMessage(error));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Simple mock function for geocoding (in a real app, use a service API)
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    // This is a placeholder. In a real app, you would call a geocoding API
    return "São Paulo, SP";
  };

  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Permissão de localização negada pelo usuário";
      case error.POSITION_UNAVAILABLE:
        return "Informações de localização não disponíveis";
      case error.TIMEOUT:
        return "Tempo esgotado ao obter localização";
      default:
        return "Erro desconhecido ao obter localização";
    }
  };

  return { position, loading, error, getCurrentPosition };
}
