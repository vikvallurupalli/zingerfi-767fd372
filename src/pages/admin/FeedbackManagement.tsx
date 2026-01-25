import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

type FeedbackStatus = "pending" | "in_progress" | "resolved" | "dismissed";

interface FeedbackItem {
  id: string;
  user_id: string;
  email: string;
  message: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<FeedbackStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-amber-500/20 text-amber-500 border-amber-500/30", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30", icon: CheckCircle },
  dismissed: { label: "Dismissed", color: "bg-gray-500/20 text-gray-500 border-gray-500/30", icon: XCircle },
};

const ITEMS_PER_PAGE = 10;

export default function FeedbackManagement() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<FeedbackStatus>("pending");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("feedback")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchEmail.trim()) {
        query = query.ilike("email", `%${searchEmail.trim()}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setFeedback(data as FeedbackItem[] || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [currentPage, statusFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchFeedback();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const openFeedbackDialog = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setAdminNotes(item.admin_notes || "");
    setNewStatus(item.status);
  };

  const closeFeedbackDialog = () => {
    setSelectedFeedback(null);
    setAdminNotes("");
    setNewStatus("pending");
  };

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("feedback")
        .update({
          status: newStatus,
          admin_notes: adminNotes.trim() || null,
        })
        .eq("id", selectedFeedback.id);

      if (error) throw error;

      toast({
        title: "Feedback Updated",
        description: "The feedback status has been updated successfully.",
      });

      closeFeedbackDialog();
      fetchFeedback();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Feedback Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and manage user feedback and support requests
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Reports</CardTitle>
            <CardDescription>
              {totalCount} total feedback {totalCount === 1 ? "item" : "items"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as "all" | FeedbackStatus);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : feedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feedback found
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedback.map((item) => {
                        const StatusIcon = statusConfig[item.status].icon;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {item.email}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {item.message}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${statusConfig[item.status].color} flex items-center gap-1 w-fit`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig[item.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(item.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openFeedbackDialog(item)}
                              >
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedFeedback} onOpenChange={() => closeFeedbackDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Feedback</DialogTitle>
              <DialogDescription>
                From: {selectedFeedback?.email}
              </DialogDescription>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedFeedback.message}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {format(new Date(selectedFeedback.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as FeedbackStatus)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    className="mt-1"
                    placeholder="Add internal notes about this feedback..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeFeedbackDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateFeedback} disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update Feedback"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
