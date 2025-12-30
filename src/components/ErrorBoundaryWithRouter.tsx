import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

const ErrorBoundaryWithRouter = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  return <ErrorBoundary navigate={(to) => navigate(to)}>{children}</ErrorBoundary>;
};

export default ErrorBoundaryWithRouter;
