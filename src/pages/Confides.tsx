import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/AuthContext";
import { Users, Trash2, Edit2, Save, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Confide {
  id: string;
  confide_user_id: string;
  alias: string | null;
  profiles: {
    email: string;
  };
}

export default function Confides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confides, setConfides] = useState<Confide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confideToDelete, setConfideToDelete] = useState<{ id: string; userId: string; displayName: string } | null>(null);

  useEffect(() => {
    loadConfides();
  }, [user]);

  const loadConfides = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("confides")
      .select(`
        id,
        confide_user_id,
        alias,
        profiles!confides_confide_user_id_fkey (
          email
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (error) {
      toast.error("Failed to load confides");
      return;
    }

    setConfides(data as any || []);
  };

  const handleEdit = (confide: Confide) => {
    setEditingId(confide.id);
    setEditAlias(confide.alias || "");
  };

  const handleSaveAlias = async (confideId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("confides")
        .update({ alias: editAlias || null })
        .eq("id", confideId);

      if (error) throw error;

      toast.success("Alias updated successfully");
      setEditingId(null);
      loadConfides();
    } catch (error) {
      toast.error("Failed to update alias");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAlias("");
  };

  const handleDeleteClick = (confide: Confide) => {
    setConfideToDelete({
      id: confide.id,
      userId: confide.confide_user_id,
      displayName: confide.alias || confide.profiles.email,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confideToDelete) return;

    setLoading(true);
    try {
      // Delete both directions of the confide relationship using database function
      const { error } = await supabase.rpc("delete_confide", {
        confide_user_id_param: confideToDelete.userId,
      });

      if (error) throw error;

      toast.success("Confide removed successfully for both users");
      setDeleteDialogOpen(false);
      setConfideToDelete(null);
      loadConfides();
    } catch (error) {
      toast.error("Failed to remove confidee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-[42rem] mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Your Confidees</h1>
          <p className="text-muted-foreground">
            Manage your trusted confidee list and set aliases
          </p>
          <Button 
            onClick={() => navigate("/send-request")} 
            className="gap-2 mt-4"
            size="lg"
          >
            <UserPlus className="h-5 w-5" />
            Add Confidee
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Confidee List ({confides.length})</CardTitle>
            <CardDescription>
              People you can exchange encrypted messages with
            </CardDescription>
          </CardHeader>
          <CardContent>
            {confides.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No confidees yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Send a request to add someone to your list
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {confides.map((confide) => (
                  <div
                    key={confide.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      {editingId === confide.id ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter alias (optional)"
                            value={editAlias}
                            onChange={(e) => setEditAlias(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground">
                            Email: {confide.profiles.email}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">
                            {confide.alias || confide.profiles.email}
                          </p>
                          {confide.alias && (
                            <p className="text-sm text-muted-foreground">
                              {confide.profiles.email}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingId === confide.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSaveAlias(confide.id)}
                            disabled={loading}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(confide)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(confide)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Confidee?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{confideToDelete?.displayName}</strong> from your confidee list? 
              This will remove the confidee relationship for both users and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
