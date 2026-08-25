import { Reveal, SectionShell } from "@/components/sections/home";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { storiesPageContent } from "@/config/pages";
import { siteConfig } from "@/config/site";
import { services } from "@/services";
import type { Story } from "@/domain/story";
import type { Metadata } from "next";
import Link from "next/link";

const description =
  "Stories from KIRAKITAH — documenting the people, ideas, moments and experiences shaping the ecosystem.";

export const metadata: Metadata = {
  title: "Stories — KIRAKITAH",
  description,
  openGraph: {
    title: "Stories — KIRAKITAH",
    description,
    url: `${siteConfig.url}/stories`,
    siteName: siteConfig.name,
    type: "website",
  },
  alternates: { canonical: `${siteConfig.url}/stories` },
};

function formatStoryDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
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
        ) : (
          <Button href={`/stories/${story.slug}`} variant="ghost" size="sm" className="mt-4 w-fit">
            Read story
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default async function StoriesPage() {
  const stories = await services.stories.getAll();
  const sorted = [...stories].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const { hero } = storiesPageContent;

  return (
    <>
      <SectionShell className="border-b border-border pt-12 md:pt-16">
        <Reveal>
          <p className="text-label font-semibold tracking-[0.15em] text-accent">
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-display text-text-primary">
            {hero.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-body-lg text-text-secondary">
            {hero.supportingCopy}
          </p>
          <p className="mt-4 max-w-2xl text-body text-text-muted">{hero.detail}</p>
        </Reveal>
      </SectionShell>

      <SectionShell className="pb-20" ariaLabelledby="stories-grid-heading">
        <h2 id="stories-grid-heading" className="sr-only">
          All stories
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((story, index) => (
            <Reveal key={story.id} delay={index * 60}>
              <StoryCard story={story} />
            </Reveal>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
