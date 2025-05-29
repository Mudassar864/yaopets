import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MapView from "@/components/map/MapView";
import { useGeoLocation } from "@/hooks/useGeoLocation";

export default function MapPage() {
  const [, setLocation] = useLocation();
  const { position, getCurrentPosition } = useGeoLocation();
  const [mapItems, setMapItems] = useState<any[]>([]);
  
  // Fetch pets
  const { data: pets } = useQuery({
    queryKey: ["/api/pets?isActive=true"],
  });

  // Fetch donations
  const { data: donations } = useQuery({
    queryKey: ["/api/donations?isActive=true"],
  });

  // Fetch vet help requests
  const { data: vetHelps } = useQuery({
    queryKey: ["/api/vet-help"],
  });

  // Get current location when component mounts
  useEffect(() => {
    getCurrentPosition();
  }, []);

  // Process data for map
  useEffect(() => {
    const items: any[] = [];
    
    // Process pets
    if (pets && Array.isArray(pets)) {
      pets.forEach(pet => {
        if (pet.lastLocation && pet.lastLocation.lat && pet.lastLocation.lng) {
          items.push({
            id: pet.id,
            type: 'pet',
            name: pet.name,
            status: pet.status,
            location: pet.lastLocation,
            photos: pet.photos,
            ownerId: pet.ownerId,
            foundById: pet.foundById
          });
        }
      });
    }
    
    // Process donations
    if (donations && Array.isArray(donations)) {
      donations.forEach(donation => {
        if (donation.location && donation.location.lat && donation.location.lng) {
          items.push({
            id: donation.id,
            type: 'donation',
            title: donation.title,
            status: 'donation',
            location: donation.location,
            photos: donation.photos,
            donorId: donation.donorId
          });
        }
      });
    }
    
    // Process vet help
    if (vetHelps && Array.isArray(vetHelps)) {
      vetHelps.forEach(vetHelp => {
        if (vetHelp.location && vetHelp.location.lat && vetHelp.location.lng) {
          items.push({
            id: vetHelp.id,
            type: 'vet_help',
            title: vetHelp.title,
            status: 'vet_help',
            location: vetHelp.location,
            photos: vetHelp.photos,
            requesterId: vetHelp.requesterId
          });
        }
      });
    }
    
    setMapItems(items);
  }, [pets, donations, vetHelps]);

  // Handle back button click
  const handleBack = () => {
    setLocation('/');
  };

  // Handle map item click
  const handleItemClick = (item: any) => {
    if (item.type === 'pet') {
      // Navigate to pet details page
      setLocation(`/pets/${item.id}`);
    } else if (item.type === 'donation') {
      // Navigate to donation details page
      setLocation(`/donations/${item.id}`);
    } else if (item.type === 'vet_help') {
      // Navigate to vet help details page
      setLocation(`/vet-help/${item.id}`);
    }
  };

  return (
    <div className="h-screen">
      <MapView
        items={mapItems}
        center={position || undefined}
        onItemClick={handleItemClick}
        onBack={handleBack}
      />
    </div>
  );
}
