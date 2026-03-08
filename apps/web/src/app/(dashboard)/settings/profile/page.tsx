import type { Metadata } from "next";
import { ProfileForm } from "./_components/profile-form";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account settings.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
