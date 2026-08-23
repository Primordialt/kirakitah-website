"use client";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="text-text-secondary hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
      onClick={() => {
        void fetch("/api/admin/auth/logout", { method: "POST" }).then(() => {
          window.location.href = "/admin/login";
        });
      }}
    >
      Log out
    </button>
  );
}
