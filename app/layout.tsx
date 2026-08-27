import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, EB_Garamond } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cinzel-var",
  display: "swap",
});

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel-decorative-var",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wiki Sorting Portal — Open Source Day",
  description:
    "Join the Wiki Tech Club's Open Source Day! Get sorted into your house by the ancient Sorting Hat and embark on your tech journey.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cinzelDecorative.variable} ${ebGaramond.variable} h-full`}
    >
      <body className="min-h-dvh font-[family-name:var(--font-garamond)]">
        {children}
      </body>
    </html>
  );
}
