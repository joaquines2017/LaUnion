import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const count = await prisma.empresa.count();
  if (count === 0) redirect("/setup");
  return <>{children}</>;
}
