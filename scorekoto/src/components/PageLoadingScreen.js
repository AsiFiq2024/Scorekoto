"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

export default function PageLoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVisible(false), 850);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div
      className={`entry-loading-screen${visible ? "" : " entry-loading-screen-dismissed"}`}
      role={visible ? "status" : undefined}
      aria-label={visible ? "Loading ScoreKoto" : undefined}
      aria-hidden={!visible}
    >
      <div className="entry-loading-content">
        <BrandLogo className="entry-loading-brand" />
        <p>Loading your matchday</p>
        <span className="entry-loading-progress" aria-hidden="true">
          <span />
        </span>
      </div>
    </div>
  );
}