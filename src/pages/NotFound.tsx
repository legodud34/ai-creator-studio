import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen gradient-surface flex items-center justify-center p-6">
      <section className="text-center glass rounded-2xl p-8">
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-4 text-base text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </section>
    </main>
  );
};

export default NotFound;

