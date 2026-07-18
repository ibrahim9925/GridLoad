import { Link } from "react-router-dom";
import SiteLayout from "@/components/site/SiteLayout";

export default function NotFound() {
  return (
    <SiteLayout>
      <div className="gridload-container py-24 text-center">
        <p className="text-gridload-green font-semibold">404</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-bold text-gridload-navy">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
        <Link
          to="/"
          className="mt-8 inline-flex px-6 py-3 rounded-md bg-gridload-green text-white font-semibold hover:bg-gridload-green/90"
        >
          Back to Home
        </Link>
      </div>
    </SiteLayout>
  );
}
