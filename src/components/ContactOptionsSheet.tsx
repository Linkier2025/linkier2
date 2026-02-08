import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, ExternalLink } from "lucide-react";

interface ContactOptionsSheetProps {
  phone?: string | null;
  email?: string | null;
  name?: string;
  trigger?: React.ReactNode;
}

export function ContactOptionsSheet({ phone, email, name = "Contact", trigger }: ContactOptionsSheetProps) {
  const formatPhoneForWhatsApp = (phoneNumber: string) => {
    // Remove spaces, dashes, and parentheses, keep + for country code
    return phoneNumber.replace(/[\s\-()]/g, '');
  };

  const contactOptions = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: phone ? `https://wa.me/${formatPhoneForWhatsApp(phone)}` : null,
      color: "bg-green-500 hover:bg-green-600",
      disabled: !phone,
      description: phone || "No phone number available"
    },
    {
      label: "SMS",
      icon: Phone,
      href: phone ? `sms:${phone}` : null,
      color: "bg-blue-500 hover:bg-blue-600",
      disabled: !phone,
      description: phone || "No phone number available"
    },
    {
      label: "Phone Call",
      icon: Phone,
      href: phone ? `tel:${phone}` : null,
      color: "bg-purple-500 hover:bg-purple-600",
      disabled: !phone,
      description: phone || "No phone number available"
    },
    {
      label: "Email",
      icon: Mail,
      href: email ? `mailto:${email}` : null,
      color: "bg-orange-500 hover:bg-orange-600",
      disabled: !email,
      description: email || "No email available"
    },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Contact {name}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 pb-6">
          {contactOptions.map((option) => (
            <a
              key={option.label}
              href={option.href || "#"}
              target={option.href?.startsWith("http") ? "_blank" : undefined}
              rel={option.href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`flex flex-col items-center justify-center p-4 rounded-xl text-white transition-all ${
                option.disabled 
                  ? "bg-muted text-muted-foreground cursor-not-allowed pointer-events-none" 
                  : option.color
              }`}
              onClick={(e) => {
                if (option.disabled) {
                  e.preventDefault();
                }
              }}
            >
              <option.icon className="h-6 w-6 mb-2" />
              <span className="font-medium text-sm">{option.label}</span>
              <span className="text-xs opacity-80 mt-1 truncate max-w-full px-2 text-center">
                {option.description}
              </span>
            </a>
          ))}
        </div>
        {!phone && !email && (
          <p className="text-center text-sm text-muted-foreground pb-4">
            No contact information available for this user.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
