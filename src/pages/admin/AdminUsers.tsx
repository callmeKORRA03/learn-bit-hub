import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraduationCap, Search, ChevronLeft } from "lucide-react";

interface UserData {
  id: string;
  username: string | null;
  wallet_address: string | null;
  xp: number;
  bitcred_balance: number;
  created_at: string;
}

interface UserWithRole extends UserData {
  roles: string[];
}

const AdminUsers = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username, wallet_address, xp, bitcred_balance, created_at")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine users with their roles
      const usersWithRoles: UserWithRole[] = (usersData || []).map((user) => ({
        ...user,
        roles: (rolesData || [])
          .filter((role) => role.user_id === user.id)
          .map((role) => role.role),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserRole = (user: UserWithRole) => {
    if (user.roles.includes("admin")) return "admin";
    if (user.roles.includes("moderator")) return "moderator";
    return "user";
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              BitEdu Admin
            </span>
          </Link>
          <Link to="/admin">
            <Button variant="ghost">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">View and manage all platform users</p>
        </div>

        {/* Search */}
        <Card className="bg-gradient-card border-primary/20 shadow-card mb-6">
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-gradient-card border-primary/20 shadow-card">
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>BitCred</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username || "N/A"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {user.wallet_address
                            ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>{user.xp}</TableCell>
                        <TableCell>{user.bitcred_balance.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              getUserRole(user) === "admin"
                                ? "bg-destructive"
                                : "bg-primary/20 text-primary"
                            }
                          >
                            {getUserRole(user)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;
