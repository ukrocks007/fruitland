'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
    {
        id: 1,
        name: "Priya Kulkarni",
        role: "Home Cook",
        content: "Hazare's full-cream milk tastes like it just came from the farm — rich, fresh and pure. Our tea and kheer have never been better!",
        avatar: "PK"
    },
    {
        id: 2,
        name: "Rahul Mehta",
        role: "Nutritionist",
        content: "I rely on Hazare Dairy for consistent, high-quality milk. The delivery is punctual and the products are always fresh.",
        avatar: "RM"
    },
    {
        id: 3,
        name: "Anita Malusare",
        role: "Mother of two",
        content: "My kids love the milk and curd — always creamy and wholesome. Excellent taste and reliable service.",
        avatar: "AM"
    }
];

export function Testimonials() {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Loved by Families</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Don't just take our word for it. Here's what our community has to say about the Hazare Dairy Farm experience.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            viewport={{ once: true }}
                        >
                            <Card className="h-full bg-gray-50 border-none relative overflow-visible">
                                <div className="absolute -top-6 left-8 bg-green-500 text-white p-3 rounded-xl shadow-lg">
                                    <Quote className="w-6 h-6" />
                                </div>
                                <CardContent className="pt-12 pb-8 px-8">
                                    <p className="text-gray-700 italic mb-6 leading-relaxed">"{t.content}"</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                                            {t.avatar}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{t.name}</h4>
                                            <p className="text-sm text-gray-500">{t.role}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
