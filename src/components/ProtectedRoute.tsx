import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Array<"user" | "photographer" | "organizer">;
  redirectTo?: string;
}

export default function ProtectedRoute({ children, requiredRoles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to={redirectTo} replace />;

  // If specific roles are required, check them
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAny = requiredRoles.some((role) => hasRole(role));
    if (!hasAny) {
      return <Navigate to="/meus-pedidos" replace />;
    }
  }

  return <>{children}</>;
}
