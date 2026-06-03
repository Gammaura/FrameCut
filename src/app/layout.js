import { Inter } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata = {
  title: "FrameCut — Free AI-Powered PNG Frame Transparency Maker",
  description: "Meet the most intelligent platform to cut frames, isolate transparent assets and ship production-ready designs.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
