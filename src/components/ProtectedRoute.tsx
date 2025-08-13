import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'student' | 'landlord';
}

export function ProtectedRoute({ children, userType }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signup-choice" replace />;
  }

  if (userType && profile?.user_type !== userType) {
    // Redirect to appropriate dashboard based on user type
    const redirectPath = profile?.user_type === 'student' ? '/student-dashboard' : '/landlord-dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}