import { Reveal, SectionShell } from "@/components/sections/home";
import { Badge, Button } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { services } from "@/services";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface StoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatStoryDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export async function generateMetadata({
  params,
}: StoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await services.stories.getBySlug(slug);

  if (!story) {
    return { title: "Story Not Found — KIRAKITAH" };
  }

  return {
    title: `${story.title} — KIRAKITAH Stories`,
    description: story.excerpt,
    openGraph: {
      title: `${story.title} — KIRAKITAH Stories`,
      description: story.excerpt,
      url: `${siteConfig.url}/stories/${slug}`,
      siteName: siteConfig.name,
      type: "article",
    },
    alternates: { canonical: `${siteConfig.url}/stories/${slug}` },
  };
}

export default async function StoryDetailPage({ params }: StoryDetailPageProps) {
  const { slug } = await params;
  const story = await services.stories.getBySlug(slug);

  if (!story) {
    notFound();
  }

  const paragraphs = story.content.split("\n\n").filter(Boolean);

  return (
    <>
      <SectionShell className="border-b border-border pt-12 md:pt-16">
        <Reveal>
          <Badge variant="outline" className="w-fit capitalize">
            {story.category}
          </Badge>
          <h1 className="mt-4 max-w-4xl text-display text-text-primary">
            {story.title}
          </h1>
          <p className="mt-4 text-caption text-text-muted">
            {formatStoryDate(story.publishedAt)}
          </p>
        </Reveal>
      </SectionShell>

      <SectionShell className="pb-20">
        <article className="mx-auto max-w-3xl space-y-6">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="text-body-lg text-text-secondary">
              {paragraph}
            </p>
          ))}
          {story.cta ? (
            <Button href={story.cta.href} className="mt-4">
              {story.cta.label}
            </Button>
          ) : null}
          <Button href="/stories" variant="outline" className="mt-8">
            ALL STORIES
          </Button>
        </article>
      </SectionShell>
    </>
  );
}
