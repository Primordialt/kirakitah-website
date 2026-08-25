import { homepageStories } from "@/config/homepage";
import type { Story } from "@/domain/story";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";
import Link from "next/link";

function formatStoryDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function StoryCard({ story }: { story: Story }) {
  return (
    <Card variant="interactive" className="flex h-full flex-col">
      <CardHeader>
        <Badge variant="outline" className="w-fit capitalize">
          {story.category}
        </Badge>
        <CardTitle className="mt-2">
          <Link
            href={`/stories/${story.slug}`}
            className="transition-standard hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 rounded-sm"
          >
            {story.title}
          </Link>
        </CardTitle>
        <CardDescription>{formatStoryDate(story.publishedAt)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <p className="text-body-sm text-text-secondary">{story.excerpt}</p>
        {story.cta ? (
          <Button href={story.cta.href} variant="ghost" size="sm" className="mt-4 w-fit">
            {story.cta.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface StoriesProps {
  stories: Story[];
}

export function Stories({ stories }: StoriesProps) {
  const preview = stories.slice(0, 3);

  return (
    <SectionShell ariaLabelledby="stories-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Reveal>
          <h2 id="stories-heading" className="text-h2 text-text-primary">
            {homepageStories.heading}
          </h2>
        </Reveal>
        {homepageStories.viewAllHref ? (
          <Reveal delay={50}>
            <Button href={homepageStories.viewAllHref} variant="ghost" size="sm">
              View all stories
            </Button>
          </Reveal>
        ) : null}
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {preview.map((story, index) => (
          <Reveal key={story.id} delay={index * 70}>
            <StoryCard story={story} />
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
