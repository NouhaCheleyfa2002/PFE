import DashboardLayout from "@/layouts/DashboardLayout";
import { ResourcesProvider } from "@/lib/resources-context";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ResourcesProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </ResourcesProvider>
  );
}
