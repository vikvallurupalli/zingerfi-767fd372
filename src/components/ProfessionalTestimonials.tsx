import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

const testimonials = [
  {
    profession: "Criminal Defense Lawyer",
    message: "Attorney-client privilege demands absolute confidentiality. ZingerFi ensures my clients' sensitive case discussions never fall into the wrong hands.",
  },
  {
    profession: "Political Campaign Manager",
    message: "Campaign strategies must stay secret until the right moment. With ZingerFi, our internal communications are truly private.",
  },
  {
    profession: "Investigative Journalist",
    message: "Protecting my sources is non-negotiable. ZingerFi lets whistleblowers share information without fear of exposure.",
  },
  {
    profession: "Healthcare Professional",
    message: "Patient confidentiality is the law. ZingerFi helps me discuss sensitive cases with colleagues securely.",
  },
  {
    profession: "Corporate Executive",
    message: "Trade secrets and M&A discussions require military-grade security. ZingerFi delivers exactly that.",
  },
  {
    profession: "Human Rights Activist",
    message: "In regions where privacy can mean life or death, ZingerFi protects our communications from surveillance.",
  },
  {
    profession: "University Student",
    message: "Personal conversations should stay personal. If my phone is ever lost or stolen, my private messages remain encrypted.",
  },
  {
    profession: "Financial Advisor",
    message: "Client financial data is extremely sensitive. ZingerFi ensures our discussions stay between us.",
  },
  {
    profession: "Family Law Attorney",
    message: "Divorce and custody cases involve deeply personal information. ZingerFi keeps my clients' matters confidential.",
  },
  {
    profession: "Startup Founder",
    message: "Investor talks and proprietary ideas need protection. ZingerFi is essential for secure founder communications.",
  },
];

export function ProfessionalTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        setIsAnimating(false);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const current = testimonials[currentIndex];

  return (
    <div className="w-full bg-primary/5 border-b border-primary/10">
      <div className="container mx-auto px-4 py-3">
        <div
          className={`flex items-center justify-center gap-3 transition-all duration-400 ${
            isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          <Quote className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm text-center">
            <span className="text-muted-foreground italic">"{current.message}"</span>
            <span className="text-primary font-medium ml-2">— {current.profession}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
