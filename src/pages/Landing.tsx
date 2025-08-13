import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import linkierLogo from "@/assets/linkier-logo.png";

const Landing = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Redirect authenticated users to their respective dashboards
  const handleGetStarted = () => {
    if (user && profile) {
      if (profile.user_type === 'student') {
        navigate('/student-dashboard');
      } else if (profile.user_type === 'landlord') {
        navigate('/landlord-dashboard');
      }
    } else {
      navigate('/signup-choice');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={linkierLogo} alt="Linkier" className="w-12 h-12" />
          <h1 className="text-3xl font-bold text-white">Linkier</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-md space-y-8">
          {/* Hero Text */}
          <div className="text-center text-white mb-8">
            <h2 className="text-xl font-semibold leading-relaxed">
              Find your perfect match:<br />
              Students find accommodation,<br />
              landlords find tenants
            </h2>
          </div>

          {/* Sign In Buttons */}
          <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-strong">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center mb-6">Sign in to your account</h3>
              
              <Button 
                variant="student" 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/student-login')}
              >
                Sign in as Student
              </Button>
              
              <Button 
                variant="landlord" 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/landlord-login')}
              >
                Sign in as Landlord
              </Button>
            </div>
          </Card>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-white/90 mb-3">Don't have an account?</p>
            <Button 
              variant="outline" 
              size="lg" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={() => navigate('/signup-choice')}
            >
              Sign up
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;