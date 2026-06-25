import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

export default function ReferralCapture() {
  const { code } = useParams<{ code: string }>();
  useEffect(() => {
    if (code) {
      localStorage.setItem("viufoto_referral_code", code);
      // Captura sinais leves de fingerprint (IP é resolvido server-side)
      try {
        localStorage.setItem(
          "viufoto_referral_meta",
          JSON.stringify({ ua: navigator.userAgent, ts: Date.now() })
        );
      } catch {}
    }
  }, [code]);
  return <Navigate to="/cadastro/fotografo" replace />;
}