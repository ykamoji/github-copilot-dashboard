import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
