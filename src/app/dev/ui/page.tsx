import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

/**
 * Development-only UI primitive preview.
 * Blocked in production via middleware.
 */
export default function DevUiPreviewPage() {
  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container-content flex flex-col gap-12">
        <header>
          <p className="text-caption text-text-muted">Development preview</p>
          <h1 className="text-display mt-2 text-text-primary">
            KIRAKITAH Design System
          </h1>
          <p className="text-body-lg mt-4 max-w-prose text-text-secondary">
            Internal preview of foundational UI primitives. Not a production
            page.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2 text-text-primary">Typography</h2>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-6">
            <p className="text-display">Display</p>
            <p className="text-h1">Heading 1</p>
            <p className="text-h2">Heading 2</p>
            <p className="text-h3">Heading 3</p>
            <p className="text-h4">Heading 4</p>
            <p className="text-body-lg">Body large — readable at every size.</p>
            <p className="text-body">Body — default paragraph text.</p>
            <p className="text-body-sm text-text-secondary">Body small</p>
            <p className="text-caption text-text-muted">Caption</p>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2 text-text-primary">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2 text-text-primary">Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="brand">Brand</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Surface with subtle border.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-text-secondary">
                Domain-agnostic card primitive for future content blocks.
              </p>
            </CardContent>
          </Card>
          <Card variant="featured">
            <CardHeader>
              <CardTitle>Featured Card</CardTitle>
              <CardDescription>Brand-accented elevation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="brand">Highlighted</Badge>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Input
            label="Email"
            placeholder="you@example.com"
            description="We will never share your email."
          />
          <Input
            label="Username"
            error="This field is required."
            defaultValue=""
          />
          <Textarea label="Message" placeholder="Write something..." />
          <Select
            label="Region"
            placeholder="Select a region"
            options={[
              { value: "af", label: "Africa" },
              { value: "eu", label: "Europe" },
              { value: "na", label: "North America" },
            ]}
          />
          <Checkbox
            label="Accept terms"
            description="Required for registration forms."
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2 text-text-primary">Accordion</h2>
          <Accordion type="single" collapsible defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is this page?</AccordionTrigger>
              <AccordionContent>
                A development-only preview of KIRAKITAH UI primitives.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Is this production content?</AccordionTrigger>
              <AccordionContent>
                No. This route is blocked in production builds.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </main>
  );
}
