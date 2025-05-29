import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import PetCard from "@/components/cards/PetCard";
import DonationCard from "@/components/cards/DonationCard";
import VetHelpCard from "@/components/cards/VetHelpCard";
import CreatePostModal from "@/components/modals/CreatePostModal";
import { useGeoLocation } from "@/hooks/useGeoLocation";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { getCurrentPosition } = useGeoLocation();
  
  // Fetch pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets?isActive=true"],
  });

  // Fetch donations
  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ["/api/donations?isActive=true"],
  });

  // Fetch vet help requests
  const { data: vetHelps, isLoading: vetHelpsLoading } = useQuery({
    queryKey: ["/api/vet-help"],
  });

  const isLoading = petsLoading || donationsLoading || vetHelpsLoading;

  // Get current location when component mounts
  useEffect(() => {
    getCurrentPosition();
  }, []);

  // Filter data based on search query and active tab
  const filteredPets = pets?.filter((pet: any) => {
    if (!searchQuery) return true;
    
    // Search in multiple fields
    return (
      (pet.name && pet.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.breed && pet.breed.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.color && pet.color.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.description && pet.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.lastLocation?.address && pet.lastLocation.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredDonations = donations?.filter((donation: any) => {
    if (!searchQuery) return true;
    
    // Search in multiple fields
    return (
      (donation.title && donation.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (donation.description && donation.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (donation.location?.address && donation.location.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredVetHelps = vetHelps?.filter((vetHelp: any) => {
    if (!searchQuery) return true;
    
    // Search in multiple fields
    return (
      (vetHelp.title && vetHelp.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (vetHelp.description && vetHelp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (vetHelp.location?.address && vetHelp.location.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleMessageClick = (item: any) => {
    if (item.ownerId || item.foundById || item.donorId || item.requesterId) {
      // Get the user ID to chat with
      const userId = item.ownerId || item.foundById || item.donorId || item.requesterId;
      
      // Navigate to chat
      setLocation(`/chat/${userId}`);
    }
  };

  const handleMapClick = (item: any) => {
    // Navigate to map
    setLocation("/map");
  };

  const handleDonateClick = (vetHelp: any) => {
    // In a real app, you would open a donation modal or form
    alert(`Donate to: ${vetHelp.title}`);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header 
        title="Buscar" 
        showFilters={false}
      />
      
      {/* Main Content */}
      <main className="pb-16">
        {/* Search Box */}
        <div className="p-4 bg-white border-b border-neutral-200">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
              <span className="material-icons text-xl">search</span>
            </span>
            <Input
              type="text"
              placeholder="Buscar pets, doações, ajuda veterinária..."
              className="pl-10 pr-12 py-2 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 px-3 py-0 h-full"
                onClick={handleClearSearch}
              >
                <span className="material-icons">close</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-neutral-200">
            <TabsList className="p-0 h-12 bg-transparent w-full grid grid-cols-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Todos
              </TabsTrigger>
              <TabsTrigger value="pets" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Pets
              </TabsTrigger>
              <TabsTrigger value="donations" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Doações
              </TabsTrigger>
              <TabsTrigger value="vet-help" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Ajuda Vet
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-neutral-600">Buscando em todas as categorias...</p>
              </div>
            ) : (
              <>
                {/* Display results count */}
                <div className="px-4 py-2 text-sm text-neutral-600 bg-neutral-50 border-b border-neutral-200">
                  {searchQuery ? (
                    <p>
                      {(filteredPets?.length || 0) + (filteredDonations?.length || 0) + (filteredVetHelps?.length || 0)} resultados para "{searchQuery}"
                    </p>
                  ) : (
                    <p>Digite algo para buscar</p>
                  )}
                </div>
                
                {/* Results */}
                <div className="divide-y divide-neutral-200">
                  {/* Pets */}
                  {filteredPets?.map((pet: any) => (
                    <PetCard 
                      key={`pet-${pet.id}`} 
                      pet={pet} 
                      onMessageClick={() => handleMessageClick(pet)}
                      onMapClick={() => handleMapClick(pet)}
                    />
                  ))}
                  
                  {/* Donations */}
                  {filteredDonations?.map((donation: any) => (
                    <DonationCard 
                      key={`donation-${donation.id}`} 
                      donation={donation} 
                      onMessageClick={() => handleMessageClick(donation)}
                    />
                  ))}
                  
                  {/* Vet Help */}
                  {filteredVetHelps?.map((vetHelp: any) => (
                    <VetHelpCard 
                      key={`vethelp-${vetHelp.id}`} 
                      vetHelp={vetHelp} 
                      onDonateClick={() => handleDonateClick(vetHelp)}
                    />
                  ))}
                  
                  {/* No results */}
                  {searchQuery && 
                    (filteredPets?.length === 0 && filteredDonations?.length === 0 && filteredVetHelps?.length === 0) && (
                    <div className="p-8 text-center">
                      <span className="material-icons text-4xl text-neutral-400 mb-2">search_off</span>
                      <p className="text-neutral-600">Nenhum resultado encontrado</p>
                      <p className="text-neutral-500 text-sm mt-1">
                        Tente com outros termos de busca
                      </p>
                    </div>
                  )}
                  
                  {/* No search query */}
                  {!searchQuery && (
                    <div className="p-8 text-center">
                      <span className="material-icons text-4xl text-neutral-400 mb-2">search</span>
                      <p className="text-neutral-600">O que você está procurando?</p>
                      <p className="text-neutral-500 text-sm mt-1">
                        Digite algo na busca acima
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="pets" className="mt-0">
            {petsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-neutral-600">Buscando pets...</p>
              </div>
            ) : (
              <>
                {/* Display results count */}
                <div className="px-4 py-2 text-sm text-neutral-600 bg-neutral-50 border-b border-neutral-200">
                  {searchQuery ? (
                    <p>
                      {filteredPets?.length || 0} pets encontrados para "{searchQuery}"
                    </p>
                  ) : (
                    <p>Todos os pets</p>
                  )}
                </div>
                
                {/* Results */}
                <div className="divide-y divide-neutral-200">
                  {filteredPets?.map((pet: any) => (
                    <PetCard 
                      key={`pet-${pet.id}`} 
                      pet={pet} 
                      onMessageClick={() => handleMessageClick(pet)}
                      onMapClick={() => handleMapClick(pet)}
                    />
                  ))}
                  
                  {/* No results */}
                  {searchQuery && filteredPets?.length === 0 && (
                    <div className="p-8 text-center">
                      <span className="material-icons text-4xl text-neutral-400 mb-2">pets</span>
                      <p className="text-neutral-600">Nenhum pet encontrado</p>
                      <p className="text-neutral-500 text-sm mt-1">
                        Tente com outros termos de busca
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="donations" className="mt-0">
            {donationsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-neutral-600">Buscando doações...</p>
              </div>
            ) : (
              <>
                {/* Display results count */}
                <div className="px-4 py-2 text-sm text-neutral-600 bg-neutral-50 border-b border-neutral-200">
                  {searchQuery ? (
                    <p>
                      {filteredDonations?.length || 0} doações encontradas para "{searchQuery}"
                    </p>
                  ) : (
                    <p>Todas as doações</p>
                  )}
                </div>
                
                {/* Results */}
                <div className="divide-y divide-neutral-200">
                  {filteredDonations?.map((donation: any) => (
                    <DonationCard 
                      key={`donation-${donation.id}`} 
                      donation={donation} 
                      onMessageClick={() => handleMessageClick(donation)}
                    />
                  ))}
                  
                  {/* No results */}
                  {searchQuery && filteredDonations?.length === 0 && (
                    <div className="p-8 text-center">
                      <span className="material-icons text-4xl text-neutral-400 mb-2">volunteer_activism</span>
                      <p className="text-neutral-600">Nenhuma doação encontrada</p>
                      <p className="text-neutral-500 text-sm mt-1">
                        Tente com outros termos de busca
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="vet-help" className="mt-0">
            {vetHelpsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-neutral-600">Buscando ajudas veterinárias...</p>
              </div>
            ) : (
              <>
                {/* Display results count */}
                <div className="px-4 py-2 text-sm text-neutral-600 bg-neutral-50 border-b border-neutral-200">
                  {searchQuery ? (
                    <p>
                      {filteredVetHelps?.length || 0} ajudas veterinárias encontradas para "{searchQuery}"
                    </p>
                  ) : (
                    <p>Todas as ajudas veterinárias</p>
                  )}
                </div>
                
                {/* Results */}
                <div className="divide-y divide-neutral-200">
                  {filteredVetHelps?.map((vetHelp: any) => (
                    <VetHelpCard 
                      key={`vethelp-${vetHelp.id}`} 
                      vetHelp={vetHelp} 
                      onDonateClick={() => handleDonateClick(vetHelp)}
                    />
                  ))}
                  
                  {/* No results */}
                  {searchQuery && filteredVetHelps?.length === 0 && (
                    <div className="p-8 text-center">
                      <span className="material-icons text-4xl text-neutral-400 mb-2">medical_services</span>
                      <p className="text-neutral-600">Nenhuma ajuda veterinária encontrada</p>
                      <p className="text-neutral-500 text-sm mt-1">
                        Tente com outros termos de busca
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation onNewPostClick={() => setCreatePostModalOpen(true)} />
      
      {/* Create Post Modal */}
      <CreatePostModal 
        open={createPostModalOpen} 
        onOpenChange={setCreatePostModalOpen} 
      />
    </div>
  );
}
