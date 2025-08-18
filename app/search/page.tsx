// app/search/page.tsx
import dynamic from "next/dynamic";

// Load the client component from /app/components
const CollegeSearch = dynamic(() => import("../components/CollegeSearch"), {
  ssr: false, // keeps this page simple since the child is client-only
});

export default function SearchPage() {
  return <CollegeSearch />;
}
