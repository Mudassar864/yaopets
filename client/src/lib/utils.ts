import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
}

export function getStatusPillClass(status: string): string {
  switch (status.toLowerCase()) {
    case "lost":
    case "perdido":
      return "status-pill status-pill-lost";
    case "found":
    case "encontrado":
      return "status-pill status-pill-found";
    case "adoption":
    case "adoção":
      return "status-pill status-pill-adoption";
    case "donation":
    case "doação":
      return "status-pill status-pill-donation";
    case "vet_help":
    case "ajuda vet":
      return "status-pill status-pill-vet-help";
    default:
      return "status-pill bg-neutral-500";
  }
}

export function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "lost":
      return "PERDIDO";
    case "found":
      return "ENCONTRADO";
    case "adoption":
      return "ADOÇÃO";
    case "donation":
      return "DOAÇÃO";
    case "vet_help":
      return "AJUDA VET";
    default:
      return status.toUpperCase();
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function generateInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getLocationString(location: any): string {
  if (typeof location === "string") return location;
  if (location && location.address) return location.address;
  return "Localização não disponível";
}
