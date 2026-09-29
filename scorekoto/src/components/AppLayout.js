"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }) {
    const pathname = usePathname();
    const isAuthRoute = pathname === "/login" || pathname === "/register";

    if (isAuthRoute) {
        return <main className="auth-route-content">{children}</main>;
    }

    return (
        <>
            <Navbar />

            <div className="page-layout">

                <Sidebar />

                <main className="main-content">
                    {children}
                </main>

            </div>
        </>
    );
}
