import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Banknote, Gift } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExchangePack, Program } from '@/types';
import { toast } from 'sonner';

interface NewProgramModalProps {
  children: ReactNode;
  packs: ExchangePack[];
  onSaveProgram: (program: Program) => void;
  initialProgram?: Program;
  businessId?: string;
  businessName?: string;
  productOptions?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

const getPackIdFromProgram = (program: Program | undefined, packs: ExchangePack[]) => {
  if (program?.exchangePackId) {
    return program.exchangePackId;
  }

  if (!program?.redemptionOptions?.length) {
    return packs[0]?.id ?? '';
  }

  const matchedPack = packs.find(
    (pack) =>
      pack.items.length === program.redemptionOptions?.length &&
      pack.items.every((item) => program.redemptionOptions?.includes(item.label))
  );

  return matchedPack?.id ?? packs[0]?.id ?? '';
};

export function NewProgramModal({
  children,
  packs,
  onSaveProgram,
  initialProgram,
  businessId,
  businessName,
  productOptions = [],
}: NewProgramModalProps) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(productOptions[0]?.id ?? initialProgram?.id ?? '');
  const [commissionType, setCommissionType] = useState<'per-transaction' | 'revenue-tier'>(
    initialProgram?.commissionType || 'per-transaction'
  );
  const [exchangeMode, setExchangeMode] = useState<Program['exchangeMode']>(
    initialProgram?.exchangeMode || 'both'
  );
  const [exchangePackId, setExchangePackId] = useState(getPackIdFromProgram(initialProgram, packs));
  const [pointsPerEuro, setPointsPerEuro] = useState(String(initialProgram?.pointsPerEuro ?? '100'));

  const isEditMode = Boolean(initialProgram);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === exchangePackId) ?? packs[0],
    [exchangePackId, packs]
  );

  const effectiveProductOptions = useMemo(() => {
    if (productOptions.length > 0) {
      return productOptions;
    }

    if (initialProgram) {
      return [
        {
          id: initialProgram.id,
          name: initialProgram.name,
          category: initialProgram.businessName,
        },
      ];
    }

    return [];
  }, [initialProgram, productOptions]);

  useEffect(() => {
    if (!open) return;

    setProductId(effectiveProductOptions[0]?.id ?? initialProgram?.id ?? '');
    setCommissionType(initialProgram?.commissionType || 'per-transaction');
    setExchangeMode(initialProgram?.exchangeMode || 'both');
    setExchangePackId(getPackIdFromProgram(initialProgram, packs));
    setPointsPerEuro(String(initialProgram?.pointsPerEuro ?? '100'));
  }, [effectiveProductOptions, initialProgram, open, packs]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const nextProgram: Program = {
      id: initialProgram?.id ?? `prog-${Date.now()}`,
      name: formData.get('title') as string,
      description: formData.get('description') as string,
      businessId: initialProgram?.businessId ?? businessId ?? 'business-unassigned',
      businessName: initialProgram?.businessName ?? businessName ?? 'Entreprise',
      commissionType,
      exchangeMode,
      pointsPerTransaction: Number(formData.get('pointsPerTransaction')),
      pointsPerEuro:
        exchangeMode === 'cash' || exchangeMode === 'both' ? Number(pointsPerEuro) : undefined,
      exchangePackId:
        exchangeMode === 'reward' || exchangeMode === 'both' ? exchangePackId : undefined,
      redemptionOptions:
        exchangeMode === 'reward' || exchangeMode === 'both'
          ? selectedPack
              ? selectedPack.items.map((item) => item.label).filter(Boolean)
              : []
          : [],
      status: initialProgram?.status ?? 'active',
      eligibilityCriteria: ((formData.get('criteria') as string) || '').trim(),
      createdAt: initialProgram?.createdAt ?? new Date().toISOString(),
    };

    onSaveProgram(nextProgram);
    toast.success(isEditMode ? 'Programme mis a jour avec succes' : 'Programme cree avec succes');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifier le programme' : 'Creer un nouveau programme'}</DialogTitle>
          <DialogDescription>
            Configurez les details du programme, les points attribues et les options d echange disponibles.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6 py-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Nom du programme *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Partenaire Premium Plus"
              defaultValue={initialProgram?.name ?? ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Produit / Service (IACRM) *</Label>
            <Select value={productId} onValueChange={setProductId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selectionnez un produit/service synchronise" />
              </SelectTrigger>
              <SelectContent>
                {effectiveProductOptions.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="product" value={productId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description & Conditions *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Detaillez le fonctionnement de ce programme pour les affilies..."
              defaultValue={initialProgram?.description ?? ''}
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commissionType">Type de commission *</Label>
            <Select
              value={commissionType}
              onValueChange={(value) =>
                setCommissionType(value as 'per-transaction' | 'revenue-tier')
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per-transaction">Par transaction</SelectItem>
                <SelectItem value="revenue-tier">Par tranche de chiffre d affaire</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="commissionType" value={commissionType} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchangeMode">Voies d echange *</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  value: 'cash',
                  title: 'Argent',
                  description: 'Conversion en argent uniquement',
                  icon: Banknote,
                  iconClassName: 'text-emerald-600',
                  chipClassName: 'bg-emerald-100 text-emerald-700',
                },
                {
                  value: 'reward',
                  title: 'Recompenses',
                  description: 'Pack d avantages uniquement',
                  icon: Gift,
                  iconClassName: 'text-amber-600',
                  chipClassName: 'bg-amber-100 text-amber-700',
                },
                {
                  value: 'both',
                  title: 'Les deux',
                  description: 'Argent et recompenses disponibles',
                  icon: ArrowRightLeft,
                  iconClassName: 'text-[hsl(var(--myhd-primary))]',
                  chipClassName: 'bg-[hsl(var(--myhd-primary))]/10 text-[hsl(var(--myhd-primary))]',
                },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = exchangeMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setExchangeMode(option.value as Program['exchangeMode'])}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[hsl(var(--myhd-primary))] bg-[hsl(var(--myhd-primary))]/5 shadow-sm'
                        : 'border-gray-200 hover:border-[hsl(var(--myhd-primary))]/30 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                          <Icon size={18} className={option.iconClassName} />
                        </div>
                        <div>
                          <p className="font-semibold text-[hsl(var(--myhd-dark))]">{option.title}</p>
                          <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="exchangeMode" value={exchangeMode} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pointsPerTransaction">Points attribues *</Label>
              <Input
                id="pointsPerTransaction"
                name="pointsPerTransaction"
                type="number"
                placeholder="Ex: 750"
                defaultValue={initialProgram?.pointsPerTransaction ?? ''}
                required
              />
              <p className="text-xs text-gray-500">
                {commissionType === 'per-transaction'
                  ? 'Chaque transaction validee donnera ce volume de points a l affilie.'
                  : 'Chaque tranche de chiffre d affaire donnera ce volume de points a l affilie.'}
              </p>
            </div>

            {(exchangeMode === 'reward' || exchangeMode === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="exchangePack">Possibilites d echange *</Label>
                <Select value={exchangePackId} onValueChange={setExchangePackId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {packs.map((pack) => (
                      <SelectItem key={pack.id} value={pack.id}>
                        {pack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="exchangePack" value={exchangePackId} />
              </div>
            )}

            {(exchangeMode === 'cash' || exchangeMode === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="pointsPerEuro">Conversion en argent *</Label>
                <Input
                  id="pointsPerEuro"
                  name="pointsPerEuro"
                  type="number"
                  min="1"
                  placeholder="Ex: 100"
                  value={pointsPerEuro}
                  onChange={(event) => setPointsPerEuro(event.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Nombre de points necessaires pour 1 EUR. Ex: 100 points = 1 EUR.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-[hsl(var(--myhd-primary))]/30 bg-[hsl(var(--myhd-light))] p-4">
            <p className="text-sm font-semibold text-[hsl(var(--myhd-dark))] mb-2">
              Apercu des echanges proposes aux affilies
            </p>
            {(exchangeMode === 'cash' || exchangeMode === 'both') && (
              <p className="text-xs text-gray-500 mb-3">
                Argent : {Number(pointsPerEuro || 0).toLocaleString()} pts = 1 EUR
              </p>
            )}
            {(exchangeMode === 'reward' || exchangeMode === 'both') && (
              <div className="flex flex-wrap gap-2">
                {selectedPack?.items.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[hsl(var(--myhd-primary))] border border-[hsl(var(--myhd-primary))]/15"
                  >
                    {item.label} - {item.pointsCost} pts
                  </span>
                ))}
              </div>
            )}
            {exchangeMode === 'cash' && (
              <p className="text-xs text-gray-500">Ce programme autorise uniquement la conversion en argent.</p>
            )}
            {exchangeMode === 'reward' && !selectedPack?.items.length && (
              <p className="text-xs text-gray-500">Aucune recompense disponible dans le pack selectionne.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="criteria">Criteres d eligibilite (optionnel)</Label>
            <Input
              id="criteria"
              name="criteria"
              placeholder="Ex: Reserve aux experts du marketing"
              defaultValue={initialProgram?.eligibilityCriteria ?? ''}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mt-2 sm:mt-0">
              Annuler
            </Button>
            <Button type="submit" className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 text-white">
              {isEditMode ? 'Enregistrer les modifications' : 'Creer le programme'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
