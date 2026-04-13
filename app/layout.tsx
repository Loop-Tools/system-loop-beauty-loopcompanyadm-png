import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clínica de Estética — Agendamento Online",
  description: "Agende seu horário na nossa clínica de estética. Serviços de depilação laser, tratamentos faciais, corporais e massagens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
