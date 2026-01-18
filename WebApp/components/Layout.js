import React from "react";
import Navbar from "./Navbar"; // Assuming Navbar is the Main Logo & Nav
import Link from "next/link";
import { useRouter } from "next/router";

const Layout = ({ children, breadcrumbs }) => {
  const router = useRouter();
  const { debateId } = router.query;
  
  // Determine the discussions list page URL based on debateId
  const discussionsListPageHref = debateId ? `/debate/${debateId}/discussions` : "/";

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Level 2: Main Logo & Nav (White or Light Blue) */}
      <Navbar />

      {/* Level 3: Breadcrumb/Context Bar (Vibrant Yellow) */}
      <nav className="bg-[#F1E123] py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-900">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            {breadcrumbs &&
              breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  <span className="mx-2">/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              ))}
          </ol>
        </div>
      </nav>

      <main className="pb-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
