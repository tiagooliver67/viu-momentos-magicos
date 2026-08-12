import React, { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const PageTransition = React.forwardRef<HTMLDivElement, { children: ReactNode }>(
  ({ children }, ref) => {
    const location = useLocation();
    const [show, setShow] = useState(false);

    useEffect(() => {
      setShow(false);
      const t = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(t);
    }, [location.pathname]);

    return (
      <div
        ref={ref}
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        {children}
      </div>
    );
  }
);

PageTransition.displayName = "PageTransition";

export default PageTransition;
