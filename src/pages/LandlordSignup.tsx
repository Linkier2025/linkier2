import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import linkierLogo from "@/assets/linkier-logo.png";

const LandlordSignup = () => {
  const navigate = useNavigate();
  const { signUp, user, profile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    password: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile?.user_type === 'landlord') {
      navigate('/landlord-dashboard');
    } else if (user && profile?.user_type === 'student') {
      navigate('/student-dashboard');
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;
    
    const userData = {
      user_type: 'landlord',
      first_name: formData.firstName,
      last_name: formData.surname,
      phone: formData.phone
    };
    
    await signUp(formData.email, formData.password, userData);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: "", color: "" };
    if (password.length < 6) return { strength: "Weak", color: "text-destructive" };
    if (password.length < 10) return { strength: "Medium", color: "text-warning" };
    return { strength: "Strong", color: "text-success" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={() => navigate('/signup-choice')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center justify-center gap-3 flex-1 mr-10">
          <img src={linkierLogo} alt="Linkier" className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-white">Linkier</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-strong">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Landlord Sign Up</h2>
                <p className="text-muted-foreground mt-2">Create your account to list properties</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname</Label>
                    <Input
                      id="surname"
                      placeholder="Surname"
                      value={formData.surname}
                      onChange={(e) => handleInputChange('surname', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {formData.password && (
                    <p className={`text-sm ${passwordStrength.color}`}>
                      Password strength: {passwordStrength.strength}
                    </p>
                  )}
                </div>

                <Button type="submit" variant="landlord" size="lg" className="w-full">
                  Create Account
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="text-primary p-0 h-auto font-normal"
                  onClick={() => navigate('/landlord-login')}
                >
                  Sign in
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default LandlordSignup;