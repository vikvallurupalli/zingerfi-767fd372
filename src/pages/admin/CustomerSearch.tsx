import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft, Loader2, CreditCard, UserX } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type PaymentFilter = "all" | "paid" | "not_paid";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  public_key: string;
  hasPaid: boolean;
}

const ITEMS_PER_PAGE = 10;

export default function CustomerSearch() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unregisteringUser, setUnregisteringUser] = useState<UserProfile | null>(null);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const { toast } = useToast();

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, paymentFilter]);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch all profiles first
    let profilesQuery = supabase
      .from("profiles")
      .select("id, email, created_at, public_key");

    if (searchQuery.trim()) {
      profilesQuery = profilesQuery.ilike("email", `%${searchQuery.trim()}%`);
    }

    const { data: profiles, error: profilesError } = await profilesQuery
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching users:", profilesError);
      setLoading(false);
      return;
    }

    // Fetch payment records
    const { data: payments, error: paymentsError } = await supabase
      .from("confide_unlocks")
      .select("user_id");

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
    }

    const paidUserIds = new Set(payments?.map((p) => p.user_id) || []);

    // Map payment status to users
    let usersWithPayment: UserProfile[] = (profiles || []).map((profile) => ({
      ...profile,
      hasPaid: paidUserIds.has(profile.id),
    }));

    // Apply payment filter
    if (paymentFilter === "paid") {
      usersWithPayment = usersWithPayment.filter((u) => u.hasPaid);
    } else if (paymentFilter === "not_paid") {
      usersWithPayment = usersWithPayment.filter((u) => !u.hasPaid);
    }

    // Apply pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = usersWithPayment.slice(from, from + ITEMS_PER_PAGE);

    setUsers(paginatedUsers);
    setTotalCount(usersWithPayment.length);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const handleUnregister = async () => {
    if (!unregisteringUser) return;
    
    setIsUnregistering(true);
    try {
      const { error } = await supabase.rpc("unregister_user", {
        target_user_id: unregisteringUser.id,
      });

      if (error) {
        console.error("Error unregistering user:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to unregister user",
          variant: "destructive",
        });
      } else {
        toast({
          title: "User Unregistered",
          description: `${unregisteringUser.email} has been successfully unregistered.`,
        });
        fetchUsers();
      }
    } catch (err) {
      console.error("Unregister exception:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUnregistering(false);
      setUnregisteringUser(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customer Search</h1>
            <p className="text-muted-foreground mt-1">
              Search and view all registered users ({totalCount} total)
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={paymentFilter}
            onValueChange={(value) => {
              setPaymentFilter(value as PaymentFilter);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="not_paid">Not Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Has Keys</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.hasPaid
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <CreditCard className="h-3 w-3" />
                        {user.hasPaid ? "Paid" : "Not Paid"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          user.public_key
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}
                      >
                        {user.public_key ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {user.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setUnregisteringUser(user)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Unregister
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <AlertDialog open={!!unregisteringUser} onOpenChange={(open) => !open && setUnregisteringUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unregister User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unregister <strong>{unregisteringUser?.email}</strong>?
              <br /><br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User profile and account</li>
                <li>All confides and confide requests</li>
                <li>Payment records</li>
                <li>Decrypted message history</li>
                <li>All roles and permissions</li>
              </ul>
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnregistering}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnregister}
              disabled={isUnregistering}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnregistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Unregistering...
                </>
              ) : (
                "Unregister"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
