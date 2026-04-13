import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link2, QrCode, ClipboardList, Copy, Check, ChevronLeft, Download } from 'lucide-react';
import { NewProspectModal } from './NewProspectModal';
import { toast } from 'sonner';
import type { Program } from '@/types';
import type { ReactNode } from 'react';
import { useAuthSession } from '@/lib/auth-session';

interface ProspectActionModalProps {
  program: Program;
  children: ReactNode;
}

type Step = 'choice' | 'link' | 'qr' | 'form';

export function ProspectActionModal({ program, children }: ProspectActionModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('choice');
  const [copied, setCopied] = useState(false);
  const { user } = useAuthSession();

  const agentCode = user?.agent_profile?.agent_code;
  const portalUrl = agentCode
    ? `${window.location.origin}/portal/${encodeURIComponent(agentCode)}/${encodeURIComponent(program.id)}`
    : '';
  
  const qrCodeUrl = portalUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(portalUrl)}`
    : '';

  const handleCopy = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Lien copié dans le presse-papier');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl || !portalUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `qr-${program.id}.png`;
    a.target = '_blank';
    a.click();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset to choice step after animation
      setTimeout(() => setStep('choice'), 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'choice' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2 hover:bg-gray-100 rounded-full" 
                onClick={() => setStep('choice')}
              >
                <ChevronLeft size={18} />
              </Button>
            )}
            <DialogTitle className="text-xl font-bold text-[hsl(var(--myhd-dark))]">
              {step === 'choice' && "Ajouter un prospect"}
              {step === 'link' && "Lien d'affiliation"}
              {step === 'qr' && "Code QR Partenaire"}
              {step === 'form' && "Formulaire Direct"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'choice' && (
          <div className="grid gap-4 py-6">
            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex-col items-center gap-3 border-2 hover:border-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/5 transition-all duration-300 group rounded-2xl"
              onClick={() => setStep('link')}
            >
              <div className="h-12 w-12 rounded-xl bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center text-[hsl(var(--myhd-primary))] group-hover:scale-110 transition-transform">
                <Link2 size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-[hsl(var(--myhd-dark))]">Obtenir mon lien d'affiliation</p>
                <p className="text-xs text-gray-500 font-normal">Partagez votre lien unique sur les réseaux</p>
              </div>
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 px-4 flex-col items-center gap-3 border-2 hover:border-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/5 transition-all duration-300 group rounded-2xl"
                onClick={() => setStep('qr')}
              >
                <div className="h-12 w-12 rounded-xl bg-[hsl(var(--myhd-cyan))]/10 flex items-center justify-center text-[hsl(var(--myhd-cyan))] group-hover:scale-110 transition-transform">
                  <QrCode size={24} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-[hsl(var(--myhd-dark))]">Code QR</p>
                  <p className="text-[10px] text-gray-500 font-normal">Présentation physique</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="h-auto py-4 px-4 flex-col items-center gap-3 border-2 hover:border-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/5 transition-all duration-300 group rounded-2xl"
                onClick={() => setStep('form')}
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <ClipboardList size={24} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-[hsl(var(--myhd-dark))]">Formulaire</p>
                  <p className="text-[10px] text-gray-500 font-normal">Saisie immédiate</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {step === 'link' && (
          <div className="space-y-6 py-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-sm text-gray-500 text-center px-4 leading-relaxed">
              Utilisez ce lien pour parrainer vos prospects. Toute inscription via cette URL sera automatiquement créditée à votre compte agent.
            </p>
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 group hover:border-[hsl(var(--myhd-primary))]/30 transition-colors">
              <code className="text-xs flex-1 truncate font-mono text-gray-600 font-medium">{portalUrl || 'Sélectionnez un agent...'}</code>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleCopy}
                disabled={!portalUrl}
                className="hover:bg-white rounded-full h-8 w-8"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-500 animate-in zoom-in" />
                ) : (
                  <Copy size={16} className="text-gray-400" />
                )}
              </Button>
            </div>
            <div className="flex justify-center">
              <Button className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 px-8 rounded-full" onClick={handleCopy} disabled={!portalUrl}>
                Copier le lien d'affiliation
              </Button>
            </div>
          </div>
        )}

        {step === 'qr' && (
          <div className="flex flex-col items-center gap-6 py-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
             <div className="p-4 bg-white border-4 border-gray-50 rounded-2xl shadow-2xl shadow-gray-100 relative group overflow-hidden">
                {portalUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR code du lien d'affiliation" 
                    width={180} 
                    height={180} 
                    className="block"
                  />
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-400 text-xs">
                    Aucun agent sélectionné
                  </div>
                )}
             </div>
             <div className="space-y-2 px-6">
                <p className="font-bold text-lg text-[hsl(var(--myhd-dark))]">{program.name}</p>
                <p className="text-sm text-gray-500">
                  Faites scanner ce code à votre prospect pour qu'il puisse accéder au formulaire sur son téléphone.
                </p>
             </div>
             <Button variant="outline" className="gap-2 rounded-xl" onClick={handleDownloadQr} disabled={!qrCodeUrl}>
                <Download size={16} />
                Télécharger le QR Code
             </Button>
          </div>
        )}

        {step === 'form' && (
           <NewProspectModal 
            program={program} 
            embedded={true} 
            onCancel={() => setStep('choice')} 
            onSuccess={() => setOpen(false)} 
           />
        )}
      </DialogContent>
    </Dialog>
  );
}
