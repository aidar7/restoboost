import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Orynbar - Бронирование ресторанов",
  description: "Найдите и забронируйте лучшие рестораны",
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
