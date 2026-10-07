import { ViewTransition } from "react";

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter="dashboard-page-enter"
      exit="dashboard-page-exit"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
