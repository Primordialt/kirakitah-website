import { getDataSource } from "@/config/data-source";
import { MockEventService } from "./events/mock";
import { MockFAQService } from "./faqs/mock";
import { MockInitiativeService } from "./initiatives/mock";
import { ApiRegistrationService } from "./registration/api";
import { MockRegistrationService } from "./registration/mock";
import { MockStoryService } from "./stories/mock";
import { MockTournamentService } from "./tournaments/mock";
import { mockContactService } from "./contact/mock";

function createServices() {
  const dataSource = getDataSource();

  return {
    initiatives: new MockInitiativeService(),
    events: new MockEventService(),
    stories: new MockStoryService(),
    faqs: new MockFAQService(),
    registration:
      dataSource === "api"
        ? new ApiRegistrationService()
        : new MockRegistrationService(),
    tournaments: new MockTournamentService(),
    contact: mockContactService,
  };
}

export const services = createServices();

export type { IEventService } from "./events/types";
export type { IFAQService } from "./faqs/types";
export type { IInitiativeService } from "./initiatives/types";
export type { IRegistrationService } from "./registration/types";
export type { IStoryService } from "./stories/types";
export type { ITournamentService } from "./tournaments/types";
export type { IContactService } from "./contact/types";
