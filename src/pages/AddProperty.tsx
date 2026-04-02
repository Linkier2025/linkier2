import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SpaceConfigurator, SpaceConfiguration } from "@/components/SpaceConfigurator";

type RoomConfiguration = SpaceConfiguration;

function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

export default function AddProperty() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;
  const [editMode, setEditMode] = useState(!isEditing);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [roomConfigurations, setRoomConfigurations] = useState<RoomConfiguration[]>([
    { room_number: "Room 1", type: "bedroom", capacity: 1, gender_tag: null }
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
  const [savedFormData, setSavedFormData] = useState(formData);
  const [savedRoomConfigs, setSavedRoomConfigs] = useState(roomConfigurations);
  const [savedImages, setSavedImages] = useState(images);

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
        const fd = {
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
        };
        setFormData(fd);
        setSavedFormData(fd);
        setImages(data.images || []);
        setSavedImages(data.images || []);
        if (data.room_configurations && Array.isArray(data.room_configurations) && data.room_configurations.length > 0) {
          setRoomConfigurations(data.room_configurations as RoomConfiguration[]);
          setSavedRoomConfigs(data.room_configurations as RoomConfiguration[]);
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

  const MAX_IMAGES = 10;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !user) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({
        title: "Limit reached",
        description: `You can upload a maximum of ${MAX_IMAGES} images.`,
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = files.slice(0, remaining);
    if (filesToUpload.length < files.length) {
      toast({
        title: "Some images skipped",
        description: `Only ${remaining} more image(s) can be added (max ${MAX_IMAGES}).`,
      });
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const { validatePropertyImage } = await import("@/lib/validation");
        const validation = validatePropertyImage(file);
        if (!validation.valid) {
          toast({ title: "Invalid file", description: `${file.name}: ${validation.error}`, variant: "destructive" });
          continue;
        }

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

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);

      // Auto-save images to database if editing an existing property
      if (id) {
        const { error } = await supabase
          .from('properties')
          .update({ images: newImages })
          .eq('id', id);

        if (error) throw error;
      }

      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) uploaded and saved successfully.`,
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

  const removeImage = async (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);

    // Auto-save when editing an existing property
    if (id) {
      try {
        const { error } = await supabase
          .from('properties')
          .update({ images: newImages })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error removing image:', error);
        toast({
          title: "Error",
          description: "Failed to save image removal.",
          variant: "destructive",
        });
      }
    }
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

  const syncRoomsTable = async (propertyId: string, configs: RoomConfiguration[]) => {
    // Get existing rooms for this property
    const { data: existingRooms } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('property_id', propertyId);

    const existingRoomNumbers = new Set((existingRooms || []).map(r => r.room_number));
    const newRoomNumbers = new Set(configs.map(c => c.room_number));

    // Delete rooms that are no longer in configurations (only if they have no active assignments)
    const toDelete = (existingRooms || []).filter(r => !newRoomNumbers.has(r.room_number));
    for (const room of toDelete) {
      const { count } = await supabase
        .from('room_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .in('status', ['active', 'reserved']);
      if (!count || count === 0) {
        await supabase.from('rooms').delete().eq('id', room.id);
      }
    }

    // Insert new rooms that don't exist yet
    const toInsert = configs.filter(c => !existingRoomNumbers.has(c.room_number));
    if (toInsert.length > 0) {
      await supabase.from('rooms').insert(
        toInsert.map(c => ({
          property_id: propertyId,
          room_number: c.room_number,
          capacity: c.capacity,
        }))
      );
    }

    // Update capacity for existing rooms
    const toUpdate = configs.filter(c => existingRoomNumbers.has(c.room_number));
    for (const config of toUpdate) {
      const room = (existingRooms || []).find(r => r.room_number === config.room_number);
      if (room) {
        await supabase.from('rooms').update({ capacity: config.capacity }).eq('id', room.id);
      }
    }
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

        // Sync rooms table: delete old rooms (that have no assignments) and re-create
        await syncRoomsTable(id, roomConfigurations);

        toast({
          title: "Property updated!",
          description: "Property updated successfully.",
        });

        setSavedFormData(formData);
        setSavedRoomConfigs(roomConfigurations);
        setSavedImages(images);
        setEditMode(false);
      } else {
        // Insert new property
        const { data: newProperty, error } = await supabase
          .from('properties')
          .insert([propertyData])
          .select('id')
          .single();

        if (error) throw error;

        // Create room records in the rooms table
        if (newProperty) {
          await syncRoomsTable(newProperty.id, roomConfigurations);
        }

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

  const handleCancel = () => {
    setFormData(savedFormData);
    setRoomConfigurations(savedRoomConfigs);
    setImages(savedImages);
    setEditMode(false);
  };

  const handleStartEdit = () => {
    setSavedFormData(formData);
    setSavedRoomConfigs(roomConfigurations);
    setSavedImages(images);
    setEditMode(true);
  };

  const universityLabels: Record<string, string> = {
    uz: "University of Zimbabwe",
    nust: "National University of Science and Technology",
    msu: "Midlands State University",
    hit: "Harare Institute of Technology",
    cut: "Chinhoyi University of Technology",
    gzu: "Great Zimbabwe University",
    buse: "Bindura University of Science Education",
    lsu: "Lupane State University",
  };

  const genderLabels: Record<string, string> = {
    boys: "Boys Only",
    girls: "Girls Only",
    mixed: "Mixed",
  };

  // View mode for existing properties
  if (isEditing && !editMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/my-properties">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex-1">Property Details</h1>
            <Button onClick={handleStartEdit}>Edit Property</Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ViewField label="Property Title" value={formData.title} />
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Monthly Rent (USD)" value={formData.rent ? `$${formData.rent}` : "—"} />
                <ViewField label="Rooms Available" value={formData.rooms ? `${formData.rooms} Room(s)` : "—"} />
              </div>
              <ViewField label="Location" value={formData.location} />
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="House Number" value={formData.houseNumber} />
                <ViewField label="Boarding House Name" value={formData.boardingHouseName} />
              </div>
              <ViewField label="Total Rooms" value={formData.totalRooms} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Room Configurations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {roomConfigurations.map((config, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-md bg-muted/50">
                  <span className="text-sm font-medium">Room {config.room_number}</span>
                  <span className="text-sm text-muted-foreground">— {config.capacity} student(s)</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Nearest University" value={universityLabels[formData.university] || formData.university} />
                <ViewField label="Gender Preference" value={genderLabels[formData.gender] || formData.gender} />
              </div>
              <ViewField label="Description" value={formData.description} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
            <CardContent>
              {formData.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((a) => (
                    <Badge key={a} variant="secondary">{a}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No amenities listed</p>
              )}
            </CardContent>
          </Card>

          {images.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Property Images</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative flex-shrink-0 w-40">
                      <img src={image} alt={`Property ${index + 1}`} className="w-40 h-32 object-cover rounded-lg" />
                      {index === 0 && <Badge className="absolute bottom-2 left-2 text-xs">Main</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          {isEditing ? (
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Link to="/my-properties">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Property' : 'Add New Property'}</h1>
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
              <div className="flex justify-between items-center">
                <CardTitle>Property Images</CardTitle>
                <span className="text-sm text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.length === 0 ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm mb-3">No images uploaded yet</p>
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
              ) : (
                <>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {images.map((image, index) => (
                      <div key={index} className="relative group flex-shrink-0 w-40 snap-start">
                        <img
                          src={image}
                          alt={`Property ${index + 1}`}
                          className="w-40 h-32 object-cover rounded-lg"
                        />
                        {index === 0 && (
                          <Badge className="absolute bottom-2 left-2 text-xs">Main</Badge>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {images.length < MAX_IMAGES && (
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
                        <Button type="button" variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
                          <span>
                            <Plus className="h-4 w-4 mr-2" />
                            {uploading ? "Uploading..." : "Add More Images"}
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            {isEditing && (
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="lg" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Property'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}