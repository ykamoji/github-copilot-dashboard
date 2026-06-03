import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";

export const metadata = {
  title: "Copilot Dashboard — AI Credit Usage Analytics",
  description:
    "Track and visualize your GitHub Copilot AI credit consumption across models, sessions, and time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
