import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Home, MessageSquare, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "rental_request" | "message" | "booking" | "payment";
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  studentName?: string;
  propertyAddress?: string;
  amount?: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "rental_request",
      title: "New Rental Request",
      description: "Tinashe Mukamuri wants to rent your 2-bedroom apartment at Avondale Heights",
      time: "2 hours ago",
      isRead: false,
      studentName: "Tinashe Mukamuri",
      propertyAddress: "Avondale Heights, 2-bedroom apartment",
    },
    {
      id: "2",
      type: "rental_request",
      title: "New Rental Request",
      description: "Chipo Nyamande is interested in your studio apartment at Borrowdale",
      time: "5 hours ago",
      isRead: false,
      studentName: "Chipo Nyamande",
      propertyAddress: "Borrowdale, Studio apartment",
    },
    {
      id: "3",
      type: "message",
      title: "New Message",
      description: "Farai Mangwende sent you a message about property viewing",
      time: "1 day ago",
      isRead: true,
      studentName: "Farai Mangwende",
    },
    {
      id: "4",
      type: "rental_request",
      title: "New Rental Request",
      description: "Tafadzwa Moyo wants to rent your 3-bedroom house at Mount Pleasant",
      time: "2 days ago",
      isRead: true,
      studentName: "Tafadzwa Moyo",
      propertyAddress: "Mount Pleasant, 3-bedroom house",
    },
    {
      id: "5",
      type: "payment",
      title: "Payment Reminder",
      description: "Rent payment due for Property ID: P001",
      time: "3 days ago",
      isRead: true,
      amount: "$450",
    },
    {
      id: "6",
      type: "booking",
      title: "Property Viewing Scheduled",
      description: "Kudakwashe Sithole scheduled a viewing for tomorrow 2:00 PM",
      time: "1 week ago",
      isRead: true,
      studentName: "Kudakwashe Sithole",
    },
  ]);

  const handleAcceptRequest = (notificationId: string, studentName: string) => {
    toast({
      title: "Request Accepted",
      description: `You accepted ${studentName}'s rental request`,
    });
    markAsRead(notificationId);
  };

  const handleDeclineRequest = (notificationId: string, studentName: string) => {
    toast({
      title: "Request Declined",
      description: `You declined ${studentName}'s rental request`,
    });
    markAsRead(notificationId);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "rental_request":
        return <Home className="h-5 w-5 text-primary" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case "booking":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "payment":
        return <UserPlus className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case "rental_request":
        return "default";
      case "message":
        return "secondary";
      case "booking":
        return "outline";
      case "payment":
        return "destructive";
      default:
        return "outline";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/landlord-dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all hover:shadow-md ${
                !notification.isRead ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{notification.title}</CardTitle>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <Badge variant={getNotificationBadgeVariant(notification.type)} className="mb-2">
                        {notification.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{notification.time}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-muted-foreground mb-4">{notification.description}</p>
                
                {notification.studentName && (
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {notification.studentName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{notification.studentName}</span>
                  </div>
                )}

                {notification.propertyAddress && (
                  <div className="text-sm text-muted-foreground mb-4">
                    <strong>Property:</strong> {notification.propertyAddress}
                  </div>
                )}

                {notification.amount && (
                  <div className="text-sm text-muted-foreground mb-4">
                    <strong>Amount:</strong> {notification.amount}
                  </div>
                )}

                {notification.type === "rental_request" && !notification.isRead && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleAcceptRequest(notification.id, notification.studentName!)}
                    >
                      Accept Request
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeclineRequest(notification.id, notification.studentName!)}
                    >
                      Decline
                    </Button>
                  </div>
                )}

                {notification.type === "message" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/messages")}
                  >
                    View Message
                  </Button>
                )}

                {notification.isRead && notification.type === "rental_request" && (
                  <Badge variant="secondary">Processed</Badge>
                )}
              </CardContent>

              {notification.id !== notifications[notifications.length - 1].id && (
                <Separator className="mx-6" />
              )}
            </Card>
          ))}
        </div>

        {notifications.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                You'll see rental requests and messages from students here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Notifications;