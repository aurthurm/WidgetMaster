import type { Metadata } from "next";
import { DbQaQueriesClient } from "./client-page";

export const metadata: Metadata = {
  title: "Database Quality Checks",
  description: "Manage and monitor the quality of your database with custom quality checks",
};

export default function DbQaQueriesPage() {
  return (
    <div className="container mx-auto py-10">
      <DbQaQueriesClient />
    </div>
  );
}