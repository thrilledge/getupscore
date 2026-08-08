import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/lib/env";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "I used to refresh Upwork every 15 minutes. Now the alerts land before I even open the app — I've stopped missing the good posts entirely.",
    name: "Areeb K.",
    role: "Full-stack developer",
    initials: "AK",
  },
  {
    quote:
      "The AI scoring saves me connects. I used to bid on everything; now I only chase jobs the analysis flags as a strong fit.",
    name: "Sana M.",
    role: "UI/UX designer",
    initials: "SM",
  },
  {
    quote:
      "The proposal drafts are genuinely good. I take the draft, tweak two lines, and send. My response rate went way up.",
    name: "Bilal R.",
    role: "Content writer",
    initials: "BR",
  },
];

export function Testimonials() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-amber">
            Loved by freelancers
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Freelancers win more with {env.APP_NAME}
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border/50">
              <CardContent className="flex flex-col gap-4 py-6">
                <div className="flex items-center justify-between">
                  <Quote className="size-5 text-muted-foreground/40" />
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="size-3.5 fill-accent-amber text-accent-amber" />
                    ))}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{t.quote}</p>
                <div className="flex items-center gap-3 border-t border-border/40 pt-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
                    {t.initials}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
