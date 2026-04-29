import {type Metadata} from "next";
import {type ReactNode} from "react";

import {PRIVATE_ROUTE_METADATA} from "@/lib/seo";

export const metadata: Metadata = PRIVATE_ROUTE_METADATA;

type CheckoutLayoutProps = {
  children: ReactNode;
};

export default function CheckoutLayout({children}: CheckoutLayoutProps) {
  return children;
}
