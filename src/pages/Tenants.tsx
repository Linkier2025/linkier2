import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Star, User } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  room: string;
  moveInDate: string;
  status: string;
  avatar: string;
}

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTenants();
  }, [user]);

  const fetchTenants = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          id,
          room_number,
          lease_start,
          status,
          student_id,
          properties (
            title
          ),
          profiles!rentals_student_id_fkey (
            first_name,
            surname,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('landlord_id', user.id);

      if (error) throw error;

      const formattedTenants = (data || []).map((rental: any) => ({
        id: rental.id,
        name: `${rental.profiles?.first_name || ''} ${rental.profiles?.surname || ''}`.trim() || 'Unknown',
        email: rental.profiles?.email || '',
        phone: rental.profiles?.phone || '',
        property: rental.properties?.title || 'Unknown Property',
        room: rental.room_number || 'N/A',
        moveInDate: rental.lease_start || '',
        status: rental.status || 'active',
        avatar: rental.profiles?.avatar_url || ''
      }));

      setTenants(formattedTenants);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTenantStatus = async (tenantId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: newStatus })
        .eq('id', tenantId);

      if (error) throw error;

      setTenants(prev => prev.map(tenant => 
        tenant.id === tenantId ? { ...tenant, status: newStatus } : tenant
      ));
      
      const statusText = newStatus === 'moved_out' ? 'moved out' : newStatus === 'inactive' ? 'marked as inactive' : newStatus;
      toast({
        title: "Tenant status updated",
        description: `Tenant has been ${statusText}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tenant status",
        variant: "destructive",
      });
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    if (filter === "all") return true;
    return tenant.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "moved_out":
        return <Badge variant="outline">Moved Out</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <p>Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/landlord-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Tenants</h1>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="font-medium">Filter by status:</span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="moved_out">Moved Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tenants List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={tenant.avatar} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                     <div>
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    </div>
                  </div>
                  {getStatusBadge(tenant.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Property: </span>
                    <span className="text-sm text-muted-foreground">{tenant.property}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Room: </span>
                    <span className="text-sm text-muted-foreground">{tenant.room}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Move-in Date: </span>
                    <span className="text-sm text-muted-foreground">{tenant.moveInDate}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a href={`tel:${tenant.phone}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </a>
                  <a href={`mailto:${tenant.email}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </a>
                </div>

                {tenant.status === "active" && (
                  <div className="space-y-2">
                    <Select onValueChange={(value) => updateTenantStatus(tenant.id, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inactive">Mark as Inactive</SelectItem>
                        <SelectItem value="moved_out">Mark as Moved Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTenants.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No tenants found for the selected filter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}