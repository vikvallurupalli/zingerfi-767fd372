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

interface SaveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSave: (name: string) => void;
}

export function SaveContactDialog({ open, onOpenChange, email, onSave }: SaveContactDialogProps) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    onOpenChange(false);
  };

  const handleSkip = () => {
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Contact</DialogTitle>
          <DialogDescription>
            Would you like to save <strong>{email}</strong> for future use? You can select them from a dropdown next time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="contact-name">Display Name</Label>
            <Input
              id="contact-name"
              placeholder="e.g. John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="text-sm font-medium">{email}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
