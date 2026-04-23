import {type ReactNode} from "react";

type BookingLayoutProps = {
  children: ReactNode;
};

export default function BookingLayout({children}: BookingLayoutProps) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
