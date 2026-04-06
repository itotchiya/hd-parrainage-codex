import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Program } from '@/types';
import { toast } from 'sonner';

interface NewProspectModalProps {
  children?: ReactNode;
  program: Program;
  onSuccess?: () => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function NewProspectModal({ children, program, onSuccess, onCancel, embedded = false }: NewProspectModalProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Simulating API call
    toast.success('Prospect ajouté avec succès', {
      description: `Le prospect a été affecté au programme: ${program.name}`,
    });
    
    setOpen(false);
    if (onSuccess) onSuccess();
  };

  const formContent = (
    <form className="space-y-4 py-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="clientName">Nom de l'entreprise ou prospect *</Label>
        <Input id="clientName" name="clientName" placeholder="Ex: Entreprise ABC" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientEmail">Email *</Label>
          <Input id="clientEmail" name="clientEmail" type="email" placeholder="contact@entreprise.com" required />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientPhone">Téléphone</Label>
          <Input id="clientPhone" name="clientPhone" type="tel" placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Contexte (Optionnel)</Label>
        <Textarea 
          id="notes" 
          name="notes"
          placeholder="Ajoutez des détails sur les besoins du prospect..." 
          rows={3}
        />
      </div>

      <DialogFooter className="pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => { 
            setOpen(false); 
            if (onCancel) onCancel(); 
          }} 
          className="mt-2 sm:mt-0"
        >
          Annuler
        </Button>
        <Button type="submit" className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 text-white">
          Valider le prospect
        </Button>
      </DialogFooter>
    </form>
  );

  if (embedded) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">Formulaire de prospection</h3>
          <p className="text-sm text-gray-500">Saisissez les informations pour {program.name}</p>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un prospect</DialogTitle>
          <DialogDescription>
            Renseignez les informations de votre prospect pour le programme <span className="font-semibold text-[hsl(var(--myhd-dark))]">{program.name}</span>.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
