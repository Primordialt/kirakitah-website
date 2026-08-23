import { getDataSource } from "@/config/data-source";
import { MockEventService } from "./events/mock";
import { MockFAQService } from "./faqs/mock";
import { MockInitiativeService } from "./initiatives/mock";
import { MockRegistrationService } from "./registration/mock";
import { MockStoryService } from "./stories/mock";

function createServices() {
  const dataSource = getDataSource();

  if (dataSource === "api") {
    throw new Error(
      "API data source is not implemented yet. Set NEXT_PUBLIC_DATA_SOURCE=mock.",
    );
  }

  return {
    initiatives: new MockInitiativeService(),
    events: new MockEventService(),
    stories: new MockStoryService(),
    faqs: new MockFAQService(),
    registration: new MockRegistrationService(),
  };
}

export const services = createServices();

export type { IEventService } from "./events/types";
export type { IFAQService } from "./faqs/types";
export type { IInitiativeService } from "./initiatives/types";
export type { IRegistrationService } from "./registration/types";
export type { IStoryService } from "./stories/types";
