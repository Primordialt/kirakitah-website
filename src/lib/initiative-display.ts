import type { InitiativeCategory, InitiativeStatus } from "@/domain/initiative";
import type { BadgeVariant } from "@/components/ui/badge";

export function getInitiativeStatusLabel(status: InitiativeStatus): string {
  const labels: Record<InitiativeStatus, string> = {
    active: "Active",
    "in-development": "In Development",
    exploring: "Exploring",
    "coming-next": "Coming Next",
    upcoming: "Upcoming",
    archived: "Completed",
  };
  return labels[status];
}

export function getInitiativeStatusVariant(status: InitiativeStatus): BadgeVariant {
  const variants: Record<InitiativeStatus, BadgeVariant> = {
    active: "success",
    "in-development": "info",
    exploring: "warning",
    "coming-next": "warning",
    upcoming: "info",
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
  return (
    status === "active" ||
    status === "in-development" ||
    status === "exploring" ||
    status === "coming-next" ||
    status === "upcoming" ||
    status === "archived"
  );
}
