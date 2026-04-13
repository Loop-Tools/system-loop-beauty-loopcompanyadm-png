import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          {/* Decorative element */}
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-[1px] bg-primary/40" />
            <div className="w-2 h-2 rounded-full bg-primary/60 mx-3 -mt-[3px]" />
            <div className="w-16 h-[1px] bg-primary/40" />
          </div>

          {/* Clinic Name */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground mb-4">
            [NOME DA CLINICA]
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-2 italic">
            Beleza, cuidado e bem-estar
          </p>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-md mx-auto mb-12 leading-relaxed">
            Descubra tratamentos exclusivos pensados para realcar a sua beleza
            natural. Agende online de forma rapida e pratica.
          </p>

          {/* CTA Button */}
          <Link href="/agendar">
            <Button
              size="lg"
              className="h-12 px-8 text-base rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              Agende seu horario
            </Button>
          </Link>

          {/* Secondary info */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span>Agendamento online 24h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span>Confirmacao instantanea</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span>Atendimento personalizado</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground/50">
        <p>[NOME DA CLINICA] &mdash; Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
