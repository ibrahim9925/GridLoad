import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/projects", label: "Projects" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gridload-lightgray">
      <div className="gridload-container flex items-center justify-between h-16">
        <Link to="/" aria-label="GridLoad home" className="flex items-center py-1">
          <Logo heightClass="h-8 md:h-9" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-gridload-green" : "text-gridload-navy hover:text-gridload-green"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <Link
            to="/contact"
            className="ml-2 inline-flex items-center px-4 py-2 rounded-md bg-gridload-green text-white text-sm font-semibold hover:bg-gridload-green/90 transition-colors"
          >
            Get a Quote
          </Link>
        </nav>

        <button
          onClick={() => setOpen((s) => !s)}
          aria-label="Toggle menu"
          className="md:hidden p-2 text-gridload-navy"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-30 animate-fade-in">
          <nav className="flex flex-col p-6 gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-md text-lg font-medium ${
                    isActive ? "bg-gridload-offwhite text-gridload-green" : "text-gridload-navy"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              className="mt-4 inline-flex items-center justify-center px-4 py-3 rounded-md bg-gridload-green text-white font-semibold"
            >
              Get a Quote
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
