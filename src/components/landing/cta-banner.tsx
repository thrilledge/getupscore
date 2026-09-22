"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CtaBanner() {
    const sectionRef = useRef<HTMLElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const section = sectionRef.current;

        if (!section) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {
                threshold: 0.15,
                rootMargin: "0px 0px -10% 0px",
            }
        );

        observer.observe(section);

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative overflow-hidden bg-[#F7FFFC] py-20 sm:py-24"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(circle at center, rgba(0,201,139,0.18) 0%, transparent 70%)",
                }}
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-40 top-0 size-[350px] rounded-full bg-[#00C98B]/10 blur-[120px]"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-40 top-0 size-[350px] rounded-full bg-[#00C98B]/10 blur-[120px]"
            />

            <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8 lg:px-12">
                <div

                    className={`flex flex-col items-center gap-5 transition-all duration-700 ease-out`}
                >
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#00C98B]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#00C98B]">
                        <span className="size-2 animate-ping rounded-full bg-[#00C98B] motion-reduce:animate-none" />
                        OVER 4,200 FREELANCERS ONBOARDED
                    </div>

                    <h2 className="max-w-2xl font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
                        Your next high-paying project is posted right now
                    </h2>

                    <p className="max-w-xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
                        Join leading independent engineers and agencies who bid before
                        the competition even notices the post.
                    </p>

                    <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row">
                        <Link
                            href="/signup"
                            className="inline-flex items-center justify-center rounded-xl bg-[#00C98B] px-7 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_32px_rgba(0,201,139,0.4)] transition-all hover:bg-[#00C98B]/90 hover:shadow-[0_0_40px_rgba(0,201,139,0.5)]"
                        >
                            Get started free
                        </Link>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1 text-sm font-bold text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A]"
                        >
                            I already have an account
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
