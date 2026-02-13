import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (email: string, alias?: string) => void;
}

export function NewRecipientDialog({ open, onOpenChange, onAdd }: NewRecipientDialogProps) {
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter an email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!trimmedEmail.endsWith("@gmail.com")) {
      setError("Only Gmail addresses are supported");
      return;
    }
    setError("");
    onAdd(trimmedEmail, alias.trim() || undefined);
    setEmail("");
    setAlias("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Recipient</DialogTitle>
          <DialogDescription>
            Enter the recipient's email address and an optional display name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="recipient-email">Email Address *</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="recipient@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
          <div>
            <Label htmlFor="recipient-alias">Display Name (optional)</Label>
            <Input
              id="recipient-alias"
              placeholder="e.g. John Smith"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>
            Add Recipient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
