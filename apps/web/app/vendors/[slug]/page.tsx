/* eslint-disable */
import React from "react";
import { BadgeCheck, Star, Clock, MapPin, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Since frontend shouldn't import from @kritva/db, we define the presentation type here
// matching the MVP architecture's requirements.
interface VendorProfile {
  id: string;
  businessName: string;
  slug: string;
  category: string[];
  cityId: string;
  description: string;
  yearsInBusiness: number;
  avgRating: number;
  ratingCount: number;
  bookingCount: number;
  responseTimeHours: number;
  verificationStatus: "pending_review" | "approved" | "rejected" | "suspended";
  services: {
    id: string;
    name: string;
    description: string;
    priceMin: number;
    priceMax: number;
    unit: string;
  }[];
  media: {
    id: string;
    url: string;
    type: "image" | "video";
    altText: string;
  }[];
  reviews: {
    id: string;
    authorName: string;
    rating: number;
    content: string;
    date: string;
    eventContext: string;
  }[];
}

const formatCurrency = (paisa: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paisa / 100);
};

// Hardcoded mock data per requirements
const mockVendor: VendorProfile = {
  id: "01HQ1234567890ABCDEF",
  businessName: "The Royal Catering Co.",
  slug: "the-royal-catering-co",
  category: ["Catering", "Event Management"],
  cityId: "Delhi NCR",
  description: "Specializing in premium North Indian and Mughlai cuisine, The Royal Catering Co. has been creating unforgettable culinary experiences for over a decade. We bring authentic flavors, impeccable service, and a touch of royalty to every event.",
  yearsInBusiness: 12,
  avgRating: 4.8,
  ratingCount: 124,
  bookingCount: 340,
  responseTimeHours: 1.5,
  verificationStatus: "approved",
  services: [
    {
      id: "srv_1",
      name: "Premium Wedding Buffet",
      description: "Includes 5 live counters, 10 main courses, and 8 desserts.",
      priceMin: 250000, // ₹2,500.00
      priceMax: 450000,
      unit: "per_plate",
    },
    {
      id: "srv_2",
      name: "Corporate High Tea",
      description: "Assorted sandwiches, artisanal teas, and fresh pastries.",
      priceMin: 80000, // ₹800.00
      priceMax: 150000,
      unit: "per_plate",
    },
  ],
  media: [
    { id: "m1", url: "https://images.unsplash.com/photo-1555244162-803834f87a4d?q=80&w=2070&auto=format&fit=crop", type: "image", altText: "Catering setup 1" },
    { id: "m2", url: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?q=80&w=2070&auto=format&fit=crop", type: "image", altText: "Catering setup 2" },
    { id: "m3", url: "https://images.unsplash.com/photo-1655195671755-d41938b81db1?q=80&w=2070&auto=format&fit=crop", type: "image", altText: "Catering setup 3" },
  ],
  reviews: [
    {
      id: "rev_1",
      authorName: "Nisha Sharma",
      rating: 5,
      content: "The food was incredible, and the presentation was exactly what we discussed. They arrived early and handled the 300+ guests effortlessly.",
      date: "March 2026",
      eventContext: "Booked for a 300-guest wedding",
    },
    {
      id: "rev_2",
      authorName: "Rajesh Kumar",
      rating: 4.5,
      content: "Excellent service for our corporate offsite. The high tea arrangements were much appreciated by the international delegates.",
      date: "January 2026",
      eventContext: "Booked for a Corporate Event",
    }
  ]
};

export default function VendorProfilePage() {
  const v = mockVendor;

  return (
    <div className="min-h-screen bg-background">
      {/* 1. Hero Image Gallery (Masonry style implied by grid) */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 h-[400px] md:h-[500px] rounded-[12px] overflow-hidden">
          <div className="md:col-span-2 h-full">
            <img 
              src={v.media[0]?.url || ""} 
              alt={v.media[0]?.altText || ""}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-400 ease-out" 
            />
          </div>
          <div className="hidden md:flex flex-col gap-4 h-full">
            <img 
              src={v.media[1]?.url || ""} 
              alt={v.media[1]?.altText || ""}
              className="w-full h-[calc(50%-8px)] object-cover hover:scale-[1.02] transition-transform duration-400 ease-out rounded-tr-[12px]" 
            />
            <img 
              src={v.media[2]?.url || ""} 
              alt={v.media[2]?.altText || ""}
              className="w-full h-[calc(50%-8px)] object-cover hover:scale-[1.02] transition-transform duration-400 ease-out rounded-br-[12px]" 
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-12">
        
        {/* Main Content Area */}
        <div className="flex-1 space-y-12">
          
          {/* Header Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <MapPin className="w-4 h-4" />
              <span>{v.cityId}</span>
              <span>•</span>
              <span>{v.category.join(", ")}</span>
            </div>
            
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {v.businessName}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1 font-medium">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="tabular-nums">{v.avgRating}</span>
                <span className="text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 cursor-pointer">
                  ({v.ratingCount} reviews)
                </span>
              </div>
              
              {v.verificationStatus === "approved" && (
                <Badge variant="outline" className="bg-kritva-green-bg/10 text-kritva-green border-kritva-green/20 gap-1 rounded-[4px] px-2 py-0.5 font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Kritva Verified
                </Badge>
              )}
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Responds in ~{v.responseTimeHours} hrs</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* Description */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">About</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[16px]">
              {v.description}
            </p>
          </section>

          <div className="h-px bg-border w-full" />

          {/* Pricing/Services Table */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Pricing & Services</h2>
            <div className="grid gap-4">
              {v.services.map((service) => (
                <div key={service.id} className="p-4 border border-border rounded-[12px] bg-card flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="font-semibold text-lg tabular-nums">
                      {formatCurrency(service.priceMin)} - {formatCurrency(service.priceMax)}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {service.unit.replace("_", " ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px bg-border w-full" />

          {/* Reviews */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              <span>{v.avgRating}</span>
              <span className="text-muted-foreground text-lg font-normal">({v.ratingCount} reviews)</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {v.reviews.map((review) => (
                <div key={review.id} className="space-y-3 p-5 rounded-[12px] bg-neutral-50 dark:bg-neutral-100/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-semibold text-accent-foreground">
                      {review.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{review.authorName}</div>
                      <div className="text-xs text-muted-foreground">{review.date}</div>
                    </div>
                  </div>
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(review.rating) ? 'fill-current' : 'opacity-30'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{review.content}</p>
                  <p className="text-xs text-muted-foreground italic">— {review.eventContext}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky Right Rail (Booking Card) */}
        <div className="w-full lg:w-[360px] flex-shrink-0">
          <div className="sticky top-24">
            <Card className="rounded-[12px] shadow-lg border-border">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="text-2xl font-bold tabular-nums">
                    {formatCurrency(v.services[0]?.priceMin ?? 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Starting price
                  </div>
                </div>

                <div className="space-y-4">
                  <Button className="w-full h-12 rounded-[4px] bg-kritva-blue hover:bg-kritva-blue-hover text-white font-medium text-base transition-colors">
                    Request Booking
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-[4px]">
                    Send Message
                  </Button>
                </div>

                {/* Trust markers */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <ShieldCheck className="w-5 h-5 text-kritva-green flex-shrink-0 mt-0.5" />
                    <p>Payments held securely in escrow until milestones are met.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50 flex items-center justify-between gap-4">
        <div>
          <div className="font-bold tabular-nums">{formatCurrency(v.services[0]?.priceMin ?? 0)}</div>
          <div className="text-xs text-muted-foreground">Starting price</div>
        </div>
        <Button className="h-12 px-8 rounded-[4px] bg-kritva-blue hover:bg-kritva-blue-hover text-white">
          Request
        </Button>
      </div>

    </div>
  );
}
