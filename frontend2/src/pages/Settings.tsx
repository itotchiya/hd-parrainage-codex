import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Phone,
  Building2,
  Save,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/api';
import { fetchSettings, updateBusinessSettings, updateOwnSettings } from '@/lib/live-data';
import type { UserRole } from '@/types';
import { toast } from 'sonner';

interface SettingsProps {
  role: UserRole;
}

const SETTINGS_STORAGE_KEY = 'frontend2-settings-preferences';

interface Frontend2LocalSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  accountName: string;
  iban: string;
  bic: string;
  bankName: string;
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export function SettingsPage({ role }: SettingsProps) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as Partial<Frontend2LocalSettings>;
      setEmailNotifications(parsed.emailNotifications ?? true);
      setSmsNotifications(parsed.smsNotifications ?? false);
      setMarketingEmails(parsed.marketingEmails ?? true);
      setAccountName(parsed.accountName ?? '');
      setIban(parsed.iban ?? '');
      setBic(parsed.bic ?? '');
      setBankName(parsed.bankName ?? '');
    } catch {
      // Ignore malformed local prototype settings.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchSettings();
        if (cancelled) {
          return;
        }

        const identity = splitDisplayName(payload.user.display_name);
        setFirstName(identity.firstName);
        setLastName(identity.lastName);
        setEmail(payload.user.email);
        setPhone(payload.business?.contact_phone ?? '');
        setCompany(payload.business?.display_name ?? '');
        setAvatarUrl(payload.user.avatar_url ?? '');
        setAccountName(payload.user.display_name);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Impossible de charger les parametres.');
        }
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => {
    const value = `${firstName} ${lastName}`.trim();
    if (!value) {
      return 'HD';
    }

    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [firstName, lastName]);

  const persistLocalPrototypeSettings = (nextValues: Frontend2LocalSettings) => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextValues));
  };

  const handleSaveProfile = async () => {
    const displayName = `${firstName} ${lastName}`.trim();
    if (!displayName) {
      toast.error('Le nom du profil est requis.');
      return;
    }

    setSavePending(true);

    try {
      await updateOwnSettings({
        displayName,
        avatarUrl: avatarUrl.trim() || null,
      });

      if (role === 'business-owner') {
        await updateBusinessSettings({
          displayName: company.trim() || displayName,
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
        });
      }

      toast.success(
        role === 'business-owner'
          ? 'Profil et entreprise mis a jour.'
          : 'Profil mis a jour. Les champs email et telephone restent informatifs.'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d enregistrer les modifications.');
    } finally {
      setSavePending(false);
    }
  };

  const handleSaveNotificationPreferences = () => {
    persistLocalPrototypeSettings({
      emailNotifications,
      smsNotifications,
      marketingEmails,
      accountName,
      iban,
      bic,
      bankName,
    });

    toast.success('Preferences de notification enregistrees pour ce prototype.');
  };

  const handleSendPasswordReset = async () => {
    if (!email.trim()) {
      toast.error('Aucun email de compte n est disponible.');
      return;
    }

    try {
      await apiRequest('/auth/password/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      toast.success('Email de reinitialisation envoye.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d envoyer l email de reinitialisation.');
    }
  };

  const handleSavePaymentSettings = () => {
    persistLocalPrototypeSettings({
      emailNotifications,
      smsNotifications,
      marketingEmails,
      accountName,
      iban,
      bic,
      bankName,
    });

    toast.success('Coordonnees enregistrees localement pour ce prototype.');
  };

  if (settingsLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
        Chargement des parametres...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User size={16} />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell size={16} />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield size={16} />
            <span className="hidden sm:inline">Securite</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard size={16} />
            <span className="hidden sm:inline">Paiement</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Mettez a jour vos informations de profil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] text-white text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatarUrl" className="mb-2 block">URL de la photo</Label>
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-2">Utilisez une image publique. Sinon, les initiales restent affichees.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenom</Label>
                  <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
              </div>

              {role === 'business-owner' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} className="pl-10" />
                  </div>
                </div>
              )}

              <Button
                className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 gap-2"
                onClick={() => void handleSaveProfile()}
                disabled={savePending}
              >
                <Save size={16} />
                {savePending ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferences de notification</CardTitle>
              <CardDescription>Choisissez comment vous souhaitez etre notifie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center">
                    <Mail size={20} className="text-[hsl(var(--myhd-primary))]" />
                  </div>
                  <div>
                    <p className="font-medium">Notifications par email</p>
                    <p className="text-sm text-gray-500">Recevez les mises a jour importantes par email</p>
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-cyan))]/10 flex items-center justify-center">
                    <Phone size={20} className="text-[hsl(var(--myhd-cyan))]" />
                  </div>
                  <div>
                    <p className="font-medium">Notifications SMS</p>
                    <p className="text-sm text-gray-500">Recevez les alertes urgentes par SMS</p>
                  </div>
                </div>
                <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Bell size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">Emails marketing</p>
                    <p className="text-sm text-gray-500">Recevez nos actualites et offres promotionnelles</p>
                  </div>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
              </div>

              <Button variant="outline" onClick={handleSaveNotificationPreferences}>
                Sauvegarder les preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Securite du compte</CardTitle>
              <CardDescription>Gerez la securite de votre compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button
                className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 gap-2"
                onClick={() => void handleSendPasswordReset()}
              >
                <Save size={16} />
                Envoyer le lien de reinitialisation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations de paiement</CardTitle>
              <CardDescription>Gerez vos coordonnees bancaires pour les retraits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Nom du titulaire</Label>
                  <Input id="accountName" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input id="iban" value={iban} onChange={(event) => setIban(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC/SWIFT</Label>
                  <Input id="bic" value={bic} onChange={(event) => setBic(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nom de la banque</Label>
                  <Input id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                </div>
              </div>
              <Button
                className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 gap-2"
                onClick={handleSavePaymentSettings}
              >
                <Save size={16} />
                Enregistrer les coordonnees
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
