import { useNotifications } from "@/components/notifications/NotificationProvider";

export default function SignInPage() {
  const { notify } = useNotifications();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ... login logic ...
      if (error) {
        notify({ type: "error", message: error.message || "Login failed." });
        throw error;
      }
      notify({ type: "success", message: "Welcome back!" });
      router.push("/dashboard");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      notify({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };
} 