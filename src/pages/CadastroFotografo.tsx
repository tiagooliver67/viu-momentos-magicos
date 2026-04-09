import { Navigate } from "react-router-dom";

// Redirect to unified registration with photographer role preselected
export default function CadastroFotografo() {
  return <Navigate to="/cadastro" state={{ role: "fotografo" }} replace />;
}
