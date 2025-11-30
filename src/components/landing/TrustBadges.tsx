'use client';

import { Truck, ShieldCheck, Leaf, Clock } from 'lucide-react';

const features = [
    {
        icon: Leaf,
        title: "100% Organic",
        desc: "Certified organic farms"
    },
    {
        icon: Clock,
        title: "Same Day Delivery",
        desc: "Order by 2 PM"
    },
    {
        icon: ShieldCheck,
        title: "Quality Guarantee",
        desc: "No questions asked returns"
    },
    {
        icon: Truck,
        title: "Free Shipping",
        desc: "On orders above ₹499"
    }
];

export function TrustBadges() {
    return (
        <section className="py-12 bg-green-900 text-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-white/10 rounded-full mb-2">
                                <feature.icon className="w-8 h-8 text-green-300" />
                            </div>
                            <h3 className="font-bold text-lg">{feature.title}</h3>
                            <p className="text-green-200 text-sm">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
