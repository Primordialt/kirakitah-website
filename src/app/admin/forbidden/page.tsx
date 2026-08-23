export default function AdminForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <h1 className="text-h2">Forbidden</h1>
      <p className="mt-3 text-body text-text-secondary">
        Your account is authenticated but does not have permission for this
        resource.
      </p>
      <a href="/admin" className="mt-6 text-accent underline">
        Back to dashboard
      </a>
    </div>
  );
}
