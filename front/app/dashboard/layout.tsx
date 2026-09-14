import DashboardLayout from "@/layouts/DashboardLayout";
import { ResourcesProvider } from "@/lib/resources-context";
import { QuestionsProvider } from "@/lib/questions-context";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ResourcesProvider>
        <QuestionsProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </QuestionsProvider>
      </ResourcesProvider>
    </ProtectedRoute>
  );
}
