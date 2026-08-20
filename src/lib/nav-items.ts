import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Products", href: "/products", icon: Package },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];
