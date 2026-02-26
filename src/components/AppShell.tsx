import Sidebar from "./Sidebar";
import AuthGuard from "./AuthGuard";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-[#F8F6F1] lg:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
