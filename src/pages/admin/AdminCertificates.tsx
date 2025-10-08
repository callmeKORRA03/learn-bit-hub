import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CertificateRequest {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  requested_at: string;
  users: {
    username: string;
  };
  courses: {
    title: string;
  };
}

const AdminCertificates = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          users (username),
          courses (title)
        `)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching certificate requests:", error);
      toast({
        title: "Error",
        description: "Failed to load certificate requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("certificates")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Certificate Approved",
        description: "The certificate has been approved successfully",
      });

      fetchRequests();
    } catch (error: any) {
      console.error("Error approving certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve certificate",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("certificates")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Certificate Rejected",
        description: "The certificate request has been rejected",
      });

      fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject certificate",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading certificate requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Certificate Management</h2>
        <p className="text-muted-foreground">Review and approve certificate requests</p>
      </div>

      <Card className="bg-gradient-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificate Requests
          </CardTitle>
          <CardDescription>
            Total requests: {requests.length} | Pending: {requests.filter(r => r.status === "pending").length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No certificate requests yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.users?.username}</TableCell>
                    <TableCell>{request.courses?.title}</TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {request.status === "pending" && (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {request.status === "approved" && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {request.status === "rejected" && (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            className="bg-success hover:bg-success/90"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCertificates;
