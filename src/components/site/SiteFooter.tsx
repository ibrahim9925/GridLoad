import { Link } from "react-router-dom";
import Logo from "./Logo";
import { Mail, Phone, MapPin } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="bg-gridload-navy text-white mt-20">
      <div className="gridload-container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Logo variant="white" heightClass="h-8" />
          <p className="mt-3 text-sm text-white/70 max-w-xs">
            Authorized Solar Distribution. Built for Scale.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider">Company</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/about" className="hover:text-gridload-yellow">About</Link></li>
            <li><Link to="/projects" className="hover:text-gridload-yellow">Projects</Link></li>
            <li><Link to="/contact" className="hover:text-gridload-yellow">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider">Products</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/products?category=inverter" className="hover:text-gridload-yellow">Inverters</Link></li>
            <li><Link to="/products?category=panel" className="hover:text-gridload-yellow">Panels</Link></li>
            <li><Link to="/products?category=battery" className="hover:text-gridload-yellow">Batteries</Link></li>
            <li><Link to="/products?category=accessory" className="hover:text-gridload-yellow">Accessories</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider">Contact</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> info@gridload.com</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +970 000 000 000</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Palestine</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="gridload-container py-4 text-xs text-white/60 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} GridLoad Energy. All rights reserved.</span>
          <span>Authorized Solar Distribution. Built for Scale.</span>
        </div>
      </div>
    </footer>
  );
}
