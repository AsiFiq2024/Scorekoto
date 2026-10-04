"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const mobileSidebarTriggerRef = useRef(null);
    const toggleMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen((isOpen) => !isOpen);
    }, []);
    const pathname = usePathname();
    const isAuthRoute = pathname === "/login" || pathname === "/register" || pathname === "/recover";

    if (isAuthRoute) {
        return <main className="auth-route-content">{children}</main>;
    }

    return (
        <>
            <Navbar
                isMobileSidebarOpen={isMobileSidebarOpen}
                mobileSidebarTriggerRef={mobileSidebarTriggerRef}
                onToggleMobileSidebar={toggleMobileSidebar}
            />

            <div className="page-layout">

                <Sidebar
                    isMobileOpen={isMobileSidebarOpen}
                    mobileTriggerRef={mobileSidebarTriggerRef}
                    onMobileOpenChange={setIsMobileSidebarOpen}
                />

                <main className="main-content">
                    {children}
                </main>

            </div>
        </>
    );
}
