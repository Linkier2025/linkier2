import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type RoomConfiguration = {
  room_number: string;
  capacity: number;
};

export default function AddProperty() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [roomConfigurations, setRoomConfigurations] = useState<RoomConfiguration[]>([
    { room_number: "1", capacity: 1 }
  ]);
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
        if (data.room_configurations && Array.isArray(data.room_configurations) && data.room_configurations.length > 0) {
          setRoomConfigurations(data.room_configurations as RoomConfiguration[]);
        }
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

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !user) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      setImages(prev => [...prev, ...uploadedUrls]);
      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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

  const addRoomConfiguration = () => {
    setRoomConfigurations(prev => [
      ...prev,
      { room_number: (prev.length + 1).toString(), capacity: 1 }
    ]);
  };

  const removeRoomConfiguration = (index: number) => {
    if (roomConfigurations.length > 1) {
      setRoomConfigurations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateRoomConfiguration = (index: number, field: keyof RoomConfiguration, value: string | number) => {
    setRoomConfigurations(prev => prev.map((config, i) => 
      i === index ? { ...config, [field]: value } : config
    ));
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
        room_configurations: roomConfigurations,
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Room Configurations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Specify how many students can occupy each room. You can add multiple configurations if rooms have different capacities.
              </p>
              
              {roomConfigurations.map((config, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`room-${index}`}>Room Number/Name</Label>
                    <Input
                      id={`room-${index}`}
                      value={config.room_number}
                      onChange={(e) => updateRoomConfiguration(index, 'room_number', e.target.value)}
                      placeholder="e.g. Room 1 or A1"
                      required
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`capacity-${index}`}>Students Per Room</Label>
                    <Select 
                      value={config.capacity.toString()} 
                      onValueChange={(value) => updateRoomConfiguration(index, 'capacity', parseInt(value))}
                    >
                      <SelectTrigger id={`capacity-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Student</SelectItem>
                        <SelectItem value="2">2 Students</SelectItem>
                        <SelectItem value="3">3 Students</SelectItem>
                        <SelectItem value="4">4 Students</SelectItem>
                        <SelectItem value="5">5 Students</SelectItem>
                        <SelectItem value="6">6 Students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {roomConfigurations.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeRoomConfiguration(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addRoomConfiguration}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Room Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

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
                  disabled={uploading}
                />
                <label htmlFor="property-images">
                  <Button type="button" variant="outline" className="cursor-pointer" disabled={uploading} asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Images"}
                    </span>
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