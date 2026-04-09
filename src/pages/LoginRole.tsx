import { Navigate, useParams } from "react-router-dom";

// Redirect old role-specific login pages to unified login
export default function LoginRole() {
  const { role } = useParams<{ role: string }>();
  return <Navigate to="/login" replace />;
}
