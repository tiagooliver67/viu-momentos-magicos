import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

export default function ReferralCapture() {
  const { code } = useParams<{ code: string }>();
  useEffect(() => {
    if (code) localStorage.setItem("viufoto_referral_code", code);
  }, [code]);
  return <Navigate to="/cadastro/fotografo" replace />;
}