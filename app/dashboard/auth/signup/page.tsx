import { useNotifications } from "@/components/notifications/NotificationProvider";

export default function SignUpPage() {
  const { notify } = useNotifications();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ... signup logic ...
      if (error) {
        notify({ type: "error", message: error.message || "Signup failed." });
        throw error;
      }
      notify({ type: "success", message: "Account created! Please check your email to verify." });
      router.push("/dashboard");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      notify({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };
} 