import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Users, 
  Calendar,
  Building,
  Hash,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

const mockRentals = [
  {
    id: 1,
    propertyTitle: "Cozy Student Apartment",
    houseNumber: "Block A, Unit 12",
    location: "Mount Pleasant, Harare",
    roomNumber: "Room 205",
    monthlyRent: 4500,
    leaseStart: "2024-01-15",
    leaseEnd: "2024-12-15",
    status: "Active",
    landlord: {
      name: "Sarah Johnson",
      phone: "+263 71 234 5678",
      email: "sarah.johnson@email.com",
      avatar: "/placeholder.svg",
      rating: 4.8
    },
    roommate: {
      name: "Chipo Mukamuri",
      course: "Computer Science",
      year: "3rd Year",
      avatar: "/placeholder.svg"
    },
    boardingHouse: {
      name: "Mount Pleasant Student Lodge",
      facilities: ["WiFi", "Security", "Parking", "Laundry", "Kitchen"],
      totalRooms: 48,
      occupancy: "85%"
    }
  },
  {
    id: 2,
    propertyTitle: "Modern Studio Near Campus",
    houseNumber: "Building C, Studio 8",
    location: "Avondale, Harare",
    roomNumber: "Studio 8",
    monthlyRent: 3800,
    leaseStart: "2024-02-01",
    leaseEnd: "2024-11-30",
    status: "Active",
    landlord: {
      name: "Mike Chen",
      phone: "+263 77 987 6543",
      email: "mike.chen@email.com",
      avatar: "/placeholder.svg",
      rating: 4.5
    },
    roommate: null, // Single studio
    boardingHouse: {
      name: "Avondale Student Residences",
      facilities: ["WiFi", "Gym", "Study Room", "24/7 Security"],
      totalRooms: 24,
      occupancy: "92%"
    }
  }
];

export default function Rentals() {
  const [selectedRental, setSelectedRental] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Rentals</h1>
          <Link to="/student-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockRentals.map((rental) => (
            <Card key={rental.id} className="overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    {rental.propertyTitle}
                  </CardTitle>
                  <Badge 
                    variant={rental.status === "Active" ? "default" : "secondary"}
                  >
                    {rental.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {/* Property Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Property Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">House:</span>
                      <span>{rental.houseNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Room:</span>
                      <span>{rental.roomNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span>{rental.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Rent:</span>
                      <span className="font-semibold text-primary">
                        ${rental.monthlyRent}/month
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Boarding House Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Boarding House: {rental.boardingHouse.name}</h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Rooms:</span>
                      <p className="font-medium">{rental.boardingHouse.totalRooms}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Occupancy:</span>
                      <p className="font-medium">{rental.boardingHouse.occupancy}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Facilities:</p>
                    <div className="flex flex-wrap gap-1">
                      {rental.boardingHouse.facilities.map((facility) => (
                        <Badge key={facility} variant="outline" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Landlord Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Landlord Contact</h3>
                  
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={rental.landlord.avatar} />
                      <AvatarFallback>
                        {rental.landlord.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{rental.landlord.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          ⭐ {rental.landlord.rating}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <a 
                            href={`tel:${rental.landlord.phone}`}
                            className="text-primary hover:underline"
                          >
                            {rental.landlord.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <a 
                            href={`mailto:${rental.landlord.email}`}
                            className="text-primary hover:underline"
                          >
                            {rental.landlord.email}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roommate Information */}
                {rental.roommate && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold">Roommate</h3>
                      
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={rental.roommate.avatar} />
                          <AvatarFallback>
                            {rental.roommate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <p className="font-medium">{rental.roommate.name}</p>
                          <div className="text-sm text-muted-foreground">
                            <p>{rental.roommate.course}</p>
                            <p>{rental.roommate.year}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!rental.roommate && (
                  <>
                    <Separator />
                    <div className="text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Single occupancy room</p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Lease Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Lease Period</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start:</span>
                      <p className="font-medium">
                        {new Date(rental.leaseStart).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End:</span>
                      <p className="font-medium">
                        {new Date(rental.leaseEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Contact Landlord
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    View Payment History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {mockRentals.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Rentals</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any active rental agreements at the moment.
              </p>
              <Link to="/properties">
                <Button>Browse Properties</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}