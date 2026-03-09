import Link from "next/link";
import { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";

type AppShellProps = {
  children: ReactNode;
  user: {
    email: string | null;
    fullName: string | null;
    role: string;
  };
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/companies", label: "Companies" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
  { href: "/emails", label: "Emails" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <span>CRM Food Trading</span>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="small">Signed in as {user.fullName ?? user.email ?? "User"}</p>
          <p className="small">Role: {user.role}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
