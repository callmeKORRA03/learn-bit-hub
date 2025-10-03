import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  username: string | null;
  wallet_address: string | null;
  xp: number;
  bitcred_balance: number;
  role: string;
}

interface UserRoles {
  role: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await fetchUserData(user.id);
    }
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    // Fetch user profile
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Check if user is admin
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!rolesData);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return {
    user,
    profile,
    isAdmin,
    loading,
    signOut,
    refetch: checkUser,
  };
};
