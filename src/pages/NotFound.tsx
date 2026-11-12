import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <>
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={<Compass aria-hidden className="h-6 w-6" />}
        title="Page not found"
        description="That page doesn't exist in this prototype."
        action={<Link to="/" className="text-sm font-medium text-brand-800 underline dark:text-brand-300">Back to dashboard</Link>}
      />
    </>
  );
}
