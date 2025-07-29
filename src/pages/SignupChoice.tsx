import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Home } from "lucide-react";
import linkierLogo from "@/assets/linkier-logo.png";

const SignupChoice = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center justify-center gap-3 flex-1 mr-10">
          <img src={linkierLogo} alt="Linkier" className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-white">Linkier</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-md space-y-8">
          {/* Title */}
          <div className="text-center text-white mb-8">
            <h2 className="text-2xl font-bold mb-2">Join Linkier</h2>
            <p className="text-white/90">Choose your account type</p>
          </div>

          {/* Choice Cards */}
          <div className="space-y-4">
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-strong hover:shadow-strong cursor-pointer transition-all duration-200"
                  onClick={() => navigate('/student-signup')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">I'm a Student</h3>
                  <p className="text-muted-foreground text-sm">Looking for accommodation</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-strong hover:shadow-strong cursor-pointer transition-all duration-200"
                  onClick={() => navigate('/landlord-signup')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-secondary/10 rounded-full">
                  <Home className="h-8 w-8 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">I'm a Landlord</h3>
                  <p className="text-muted-foreground text-sm">I have properties to rent</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Already have account */}
          <div className="text-center pt-4">
            <p className="text-white/90 text-sm">
              Already have an account?{" "}
              <Button 
                variant="link" 
                className="text-white underline-offset-4 hover:text-white/80 p-0 h-auto font-normal"
                onClick={() => navigate('/')}
              >
                Sign in
              </Button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupChoice;