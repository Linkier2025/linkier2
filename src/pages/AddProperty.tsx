import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function AddProperty() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    rent: "",
    location: "",
    university: "",
    rooms: "",
    gender: "",
    description: "",
    amenities: [] as string[],
    houseNumber: "",
    boardingHouseName: "",
    totalRooms: ""
  });

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || "",
          rent: data.rent_amount?.toString() || "",
          location: data.location || "",
          university: data.university || "",
          rooms: data.rooms?.toString() || "",
          gender: data.gender_preference || "",
          description: data.description || "",
          amenities: data.amenities || [],
          houseNumber: data.house_number || "",
          boardingHouseName: data.boarding_house_name || "",
          totalRooms: data.total_rooms?.toString() || ""
        });
        setImages(data.images || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load property",
        variant: "destructive",
      });
    }
  };

  const amenitiesList = [
    "WiFi", "Parking", "Security", "Laundry", "Kitchen", "Study Area", 
    "Garden", "Pool", "Gym", "Air Conditioning", "Heating", "Furnished"
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add a property",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const propertyData = {
        landlord_id: user.id,
        title: formData.title,
        rent_amount: parseFloat(formData.rent),
        location: formData.location,
        university: formData.university,
        rooms: parseInt(formData.rooms),
        gender_preference: formData.gender,
        description: formData.description,
        amenities: formData.amenities,
        images: images,
        house_number: formData.houseNumber,
        boarding_house_name: formData.boardingHouseName,
        total_rooms: formData.totalRooms ? parseInt(formData.totalRooms) : null,
        status: 'available'
      };

      if (id) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Property updated!",
          description: "Your property has been successfully updated.",
        });
      } else {
        // Insert new property
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);

        if (error) throw error;

        toast({
          title: "Property added!",
          description: "Your property has been successfully listed.",
        });
      }

      navigate("/my-properties");
    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: "Error",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/landlord-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{id ? 'Edit Property' : 'Add New Property'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Property Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Cozy Student Apartment"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent">Monthly Rent (USD)</Label>
                  <Input
                    id="rent"
                    type="number"
                    value={formData.rent}
                    onChange={(e) => setFormData({...formData, rent: e.target.value})}
                    placeholder="4500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rooms">Rooms Available</Label>
                  <Select value={formData.rooms} onValueChange={(value) => setFormData({...formData, rooms: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Room</SelectItem>
                      <SelectItem value="2">2 Rooms</SelectItem>
                      <SelectItem value="3">3 Rooms</SelectItem>
                      <SelectItem value="4">4 Rooms</SelectItem>
                      <SelectItem value="5">5+ Rooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Rondebosch, Cape Town"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">House Number</Label>
                  <Input
                    id="houseNumber"
                    value={formData.houseNumber}
                    onChange={(e) => setFormData({...formData, houseNumber: e.target.value})}
                    placeholder="e.g. 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boardingHouseName">Boarding House Name</Label>
                  <Input
                    id="boardingHouseName"
                    value={formData.boardingHouseName}
                    onChange={(e) => setFormData({...formData, boardingHouseName: e.target.value})}
                    placeholder="e.g. Sunrise Lodge"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalRooms">Total Rooms in Property</Label>
                <Input
                  id="totalRooms"
                  type="number"
                  value={formData.totalRooms}
                  onChange={(e) => setFormData({...formData, totalRooms: e.target.value})}
                  placeholder="Total number of rooms"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="university">Nearest University</Label>
                  <Select value={formData.university} onValueChange={(value) => setFormData({...formData, university: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uz">University of Zimbabwe</SelectItem>
                      <SelectItem value="nust">National University of Science and Technology</SelectItem>
                      <SelectItem value="msu">Midlands State University</SelectItem>
                      <SelectItem value="hit">Harare Institute of Technology</SelectItem>
                      <SelectItem value="cut">Chinhoyi University of Technology</SelectItem>
                      <SelectItem value="gzu">Great Zimbabwe University</SelectItem>
                      <SelectItem value="buse">Bindura University of Science Education</SelectItem>
                      <SelectItem value="lsu">Lupane State University</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender Preference</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boys">Boys Only</SelectItem>
                      <SelectItem value="girls">Girls Only</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your property, its features, and nearby amenities..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {amenitiesList.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={(checked) => handleAmenityChange(amenity, checked as boolean)}
                    />
                    <Label htmlFor={amenity} className="text-sm">{amenity}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  type="file"
                  id="property-images"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <label htmlFor="property-images">
                  <Button type="button" variant="outline" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : id ? 'Update Property' : 'Add Property'}
          </Button>
        </form>
      </div>
    </div>
  );
}