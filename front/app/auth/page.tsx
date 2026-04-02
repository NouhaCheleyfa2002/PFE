import AuthLayout from "@/layouts/AuthLayout";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata = {
  title: "Sign In - EduShare",
  description: "Sign in to your EduShare educator account",
};

export default function AuthPage() {
  return (
    <AuthLayout>
      <AuthScreen />
    </AuthLayout>
  );
}
