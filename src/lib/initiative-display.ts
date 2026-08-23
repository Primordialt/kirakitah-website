import type { InitiativeCategory, InitiativeStatus } from "@/domain/initiative";
import type { BadgeVariant } from "@/components/ui/badge";

export function getInitiativeStatusLabel(status: InitiativeStatus): string {
  const labels: Record<InitiativeStatus, string> = {
    active: "Active",
    upcoming: "Upcoming",
    "coming-soon": "Coming Soon",
    archived: "Completed",
  };
  return labels[status];
}

export function getInitiativeStatusVariant(status: InitiativeStatus): BadgeVariant {
  const variants: Record<InitiativeStatus, BadgeVariant> = {
    active: "success",
    upcoming: "info",
    "coming-soon": "warning",
    archived: "outline",
  };
  return variants[status];
}

export function getInitiativeCategoryLabel(category: InitiativeCategory): string {
  const labels: Record<InitiativeCategory, string> = {
    competition: "Gaming & eSports",
    technology: "Innovation",
    creativity: "Creativity",
    community: "Community",
    experiences: "Experiences",
    culture: "Culture",
  };
  return labels[category];
}

export function isInitiativeNavigable(status: InitiativeStatus): boolean {
  return status === "active" || status === "upcoming" || status === "archived";
}
