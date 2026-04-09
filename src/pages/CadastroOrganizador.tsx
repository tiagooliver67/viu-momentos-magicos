import { Navigate } from "react-router-dom";

// Redirect to unified registration with organizer role preselected
export default function CadastroOrganizador() {
  return <Navigate to="/cadastro" state={{ role: "organizador" }} replace />;
}
