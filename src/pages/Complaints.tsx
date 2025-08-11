import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Wifi, Zap, Droplets, Flame, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import linkierLogo from "@/assets/linkier-logo.png";
import { useToast } from "@/hooks/use-toast";

const Complaints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    property: "",
    urgency: "",
    description: ""
  });

  // Basic SEO handling
  useEffect(() => {
    document.title = "Complaints & Issues | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Report and track amenity issues including wifi, water, gas, and power problems.");
    if (!meta.parentElement) document.head.appendChild(meta);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    if (!canonical.parentElement) document.head.appendChild(canonical);
  }, []);

  // Mock complaints data
  const complaints = [
    {
      id: 1,
      type: "wifi",
      property: "Sunny View Boarding House",
      room: "Room 204",
      tenant: "Maria Santos",
      description: "Internet connection has been very slow for the past 3 days. Unable to attend online classes properly.",
      status: "in-progress",
      urgency: "high",
      date: "2024-08-09",
      lastUpdate: "2024-08-10"
    },
    {
      id: 2,
      type: "water",
      property: "Green Valley Dormitory",
      room: "Room 101",
      tenant: "John Cruz",
      description: "Water pressure is very low in the shower. Sometimes no water comes out at all.",
      status: "pending",
      urgency: "medium",
      date: "2024-08-08",
      lastUpdate: "2024-08-08"
    },
    {
      id: 3,
      type: "power",
      property: "Sunset Apartments",
      room: "Room 305",
      tenant: "Lisa Rodriguez",
      description: "Power keeps going out in the room. Circuit breaker trips every few hours.",
      status: "resolved",
      urgency: "high",
      date: "2024-08-06",
      lastUpdate: "2024-08-07"
    },
    {
      id: 4,
      type: "gas",
      property: "Sunny View Boarding House",
      room: "Kitchen",
      tenant: "Multiple tenants",
      description: "Gas stove is not working properly. Low gas pressure affecting cooking.",
      status: "pending",
      urgency: "medium",
      date: "2024-08-05",
      lastUpdate: "2024-08-05"
    }
  ];

  const getAmenityIcon = (type: string) => {
    switch (type) {
      case "wifi": return <Wifi className="h-4 w-4" />;
      case "water": return <Droplets className="h-4 w-4" />;
      case "power": return <Zap className="h-4 w-4" />;
      case "gas": return <Flame className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "in-progress": return "default";
      case "resolved": return "outline";
      default: return "secondary";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const handleSubmit = () => {
    if (!formData.type || !formData.property || !formData.urgency || !formData.description) {
      toast({
        title: "Please fill all fields",
        description: "All fields are required to submit a complaint.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Complaint submitted",
      description: "Your complaint has been submitted and will be reviewed soon.",
    });
    
    setIsDialogOpen(false);
    setFormData({ type: "", property: "", urgency: "", description: "" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-hero">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={linkierLogo} alt="Linkier logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-white">Complaints & Issues</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Report New Issue</DialogTitle>
                <DialogDescription>
                  Report an amenity issue or problem with your property.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Issue Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wifi">WiFi/Internet</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="power">Electricity/Power</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="property">Property</Label>
                  <Input
                    id="property"
                    placeholder="Property/Room location"
                    value={formData.property}
                    onChange={(e) => setFormData(prev => ({ ...prev, property: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={formData.urgency} onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue in detail..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Submit Complaint</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Amenity Status Overview */}
        <section aria-label="Amenity status overview" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wifi className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">WiFi</p>
                <p className="text-sm text-muted-foreground">1 issue</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Droplets className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Water</p>
                <p className="text-sm text-muted-foreground">1 issue</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Power</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Flame className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Gas</p>
                <p className="text-sm text-muted-foreground">1 issue</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Complaints List */}
        <section aria-label="Recent complaints">
          <h2 className="text-xl font-semibold mb-4">Recent Complaints</h2>
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getAmenityIcon(complaint.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg capitalize">{complaint.type} Issue</CardTitle>
                        <CardDescription>
                          {complaint.property} • {complaint.room} • {complaint.tenant}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getUrgencyColor(complaint.urgency)}>
                        {complaint.urgency} priority
                      </Badge>
                      <Badge variant={getStatusColor(complaint.status)}>
                        {complaint.status === "in-progress" ? (
                          <><Clock className="h-3 w-3 mr-1" />In Progress</>
                        ) : complaint.status === "resolved" ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Resolved</>
                        ) : (
                          <><AlertTriangle className="h-3 w-3 mr-1" />Pending</>
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{complaint.description}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Reported: {complaint.date}</span>
                    <span>Last updated: {complaint.lastUpdate}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Complaints;