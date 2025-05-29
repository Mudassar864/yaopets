import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import CreatePostModal from "@/components/modals/CreatePostModal";
import { Home, Search, PlusSquare, Heart, User, PawPrint, Gift, Stethoscope } from "lucide-react";

export default function BottomNavigation() {
  const [location] = useLocation();
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);

  // Itens de navegação melhorados com labels e navegação correta
  const navItems = [
    { icon: Home, path: "/", label: "Início" },
    { icon: PawPrint, path: "/pets", label: "Pets" },
    { icon: PlusSquare, path: "/create-post", isAddButton: true, label: "Criar" },
    { icon: Heart, path: "/donations", label: "Doações" },
    { icon: User, path: "/profile", label: "Perfil" },
  ];

  return (
    <>
      {/* Menu inferior fixo com design melhorado */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
        <div className="flex justify-around items-center px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path === "/" && location === "/home");
            
            return (
              <Link
                key={item.path}
                href={item.isAddButton ? "#" : item.path}
                onClick={(e) => {
                  if (item.isAddButton) {
                    e.preventDefault();
                    setCreatePostModalOpen(true);
                  }
                }}
                className="flex-1"
              >
                <div className="flex flex-col items-center justify-center py-2 px-1 min-h-[50px]">
                  {item.isAddButton ? (
                    <div className="bg-gradient-to-r from-[#F5821D] to-[#0BDEC2] p-2 rounded-full">
                      <Icon 
                        size={20} 
                        className="text-white"
                      />
                    </div>
                  ) : (
                    <Icon 
                      size={22} 
                      className={cn(
                        "transition-colors mb-1",
                        isActive
                          ? "text-[#F5821D]" 
                          : "text-gray-500"
                      )}
                    />
                  )}
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    isActive && !item.isAddButton
                      ? "text-[#F5821D]" 
                      : item.isAddButton 
                        ? "text-gray-700"
                        : "text-gray-500"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Modal de criação de post */}
      <CreatePostModal 
        open={createPostModalOpen} 
        onOpenChange={setCreatePostModalOpen} 
      />
    </>
  );
}