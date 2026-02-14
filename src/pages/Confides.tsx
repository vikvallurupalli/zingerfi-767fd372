import { useState, useEffect, useCallback } from "react";
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
import { NewRecipientDialog } from "@/components/NewRecipientDialog";

interface Contact {
  id: string;
  email: string;
  name: string;
}

export default function Confides() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [showNewRecipient, setShowNewRecipient] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("fast_encrypt_contacts")
      .select("id, email, name")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      toast.error("Failed to load contacts");
      return;
    }
    setContacts(data || []);
  }, [user]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditName(contact.name);
  };

  const handleSaveName = async (contactId: string) => {
    if (!editName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("fast_encrypt_contacts")
        .update({ name: editName.trim() })
        .eq("id", contactId);
      if (error) throw error;
      toast.success("Name updated");
      setEditingId(null);
      loadContacts();
    } catch {
      toast.error("Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("fast_encrypt_contacts")
        .delete()
        .eq("id", contactToDelete.id);
      if (error) throw error;
      toast.success("Contact removed");
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      loadContacts();
    } catch {
      toast.error("Failed to remove contact");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async (email: string, alias?: string) => {
    if (!user) return;
    const exists = contacts.some((c) => c.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      toast.error("Contact already exists");
      return;
    }
    try {
      const { error } = await supabase.from("fast_encrypt_contacts").insert({
        user_id: user.id,
        email,
        name: alias || email,
      });
      if (error) throw error;
      toast.success("Contact added");
      loadContacts();
    } catch {
      toast.error("Failed to add contact");
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
          <h1 className="text-3xl font-bold">Your Contacts</h1>
          <p className="text-muted-foreground">
            Manage your saved recipients for encrypted messaging
          </p>
          <Button
            onClick={() => setShowNewRecipient(true)}
            className="gap-2 mt-4"
            size="lg"
          >
            <UserPlus className="h-5 w-5" />
            Add New Contact
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact List ({contacts.length})</CardTitle>
            <CardDescription>
              People you can send encrypted messages to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No contacts yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add a contact to start sending encrypted messages
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      {editingId === contact.id ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter display name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveName(contact.id)}
                          />
                          <p className="text-sm text-muted-foreground">
                            {contact.email}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">{contact.name}</p>
                          {contact.name !== contact.email && (
                            <p className="text-sm text-muted-foreground">
                              {contact.email}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingId === contact.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSaveName(contact.id)}
                            disabled={loading}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
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
                            onClick={() => handleEdit(contact)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(contact)}
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

      <NewRecipientDialog
        open={showNewRecipient}
        onOpenChange={setShowNewRecipient}
        onAdd={handleAddRecipient}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{contactToDelete?.name}</strong> from your contacts?
              This cannot be undone.
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
