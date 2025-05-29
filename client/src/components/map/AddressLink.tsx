import { Link } from "wouter";
import { cn } from "@/lib/utils";

type AddressLinkProps = {
  address: string;
  lat?: number;
  lng?: number;
  className?: string;
};

export default function AddressLink({ address, lat, lng, className }: AddressLinkProps) {
  // Se temos latitude e longitude, usamos elas no link do mapa
  // Caso contrário, usamos o endereço como texto para pesquisa
  const mapUrl = lat && lng 
    ? `/map?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}`
    : `/map?address=${encodeURIComponent(address)}`;
  
  return (
    <Link href={mapUrl}>
      <a 
        className={cn(
          "inline-flex items-center text-primary hover:underline", 
          className
        )}
      >
        <span>{address}</span>
      </a>
    </Link>
  );
}