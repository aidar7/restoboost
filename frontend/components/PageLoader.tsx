import { Loader2, AlertCircle } from 'lucide-react';

interface PageLoaderProps {
  loading: boolean;
  error: string;
  children: React.ReactNode;
}

export function PageLoader({ loading, error, children }: PageLoaderProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <span className="text-destructive">{error}</span>
      </div>
    );
  }

  return <>{children}</>;
}
