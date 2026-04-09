import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { compressAvatarFile, validateAvatarFile } from '@/lib/avatar-upload';
import {
  fetchSettings,
  resendOwnEmailVerification,
  updateBusinessSettings,
  updateOwnPassword,
  updateOwnSettings,
  uploadOwnAvatar,
} from '@/lib/live-data';
import { useAuthSession } from '@/lib/auth-session';
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
  const { refreshSession } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        setPhone(payload.user.phone_number ?? '');
        setCompany(payload.business?.display_name ?? '');
        setAvatarUrl(payload.user.avatar_url ?? '');
        setEmailVerifiedAt(payload.user.email_verified_at ?? null);
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

  useEffect(() => {
    if (searchParams.get('emailVerified') !== '1') {
      return;
    }

    toast.success('Adresse email verifiee.');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('emailVerified');
    setSearchParams(nextParams, { replace: true });
    setEmailVerifiedAt(new Date().toISOString());
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl !== null) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

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

  const resolvedAvatarPreview = avatarPreviewUrl ?? (avatarUrl.trim() || null);
  const emailVerified = emailVerifiedAt !== null;

  const persistLocalPrototypeSettings = (nextValues: Frontend2LocalSettings) => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextValues));
  };

  const handleSaveProfile = async () => {
    const displayName = `${firstName} ${lastName}`.trim();
    if (!displayName) {
      toast.error('Le nom du profil est requis.');
      return;
    }

    if (!email.trim()) {
      toast.error('L email est requis.');
      return;
    }

    setSavePending(true);

    try {
      let nextAvatarUrl = avatarUrl.trim() || null;

      if (avatarFile !== null) {
        const compressedAvatar = await compressAvatarFile(avatarFile);
        const avatarPayload = await uploadOwnAvatar(compressedAvatar);
        nextAvatarUrl = avatarPayload.user.avatar_url;
      }

      const ownSettings = await updateOwnSettings({
        displayName,
        email: email.trim(),
        phoneNumber: phone.trim() || null,
        avatarUrl: nextAvatarUrl,
      });

      if (role === 'business-owner' && company.trim()) {
        await updateBusinessSettings({
          displayName: company.trim(),
        });
      }

      await refreshSession();

      setAvatarFile(null);
      if (avatarPreviewUrl !== null) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarPreviewUrl(null);
      setAvatarUrl(ownSettings.user.avatar_url ?? '');
      setEmail(ownSettings.user.email);
      setPhone(ownSettings.user.phone_number ?? '');
      setEmailVerifiedAt(ownSettings.user.email_verified_at ?? null);
      setAccountName(ownSettings.user.display_name);

      if (ownSettings.user.email_verified_at === null) {
        toast.success('Profil mis a jour. Verifiez votre nouvelle adresse email via le message Resend.');
      } else {
        toast.success(role === 'business-owner' ? 'Profil et entreprise mis a jour.' : 'Profil mis a jour.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d enregistrer les modifications.');
    } finally {
      setSavePending(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationPending(true);

    try {
      await resendOwnEmailVerification();
      toast.success('Email de verification renvoye.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de renvoyer l email de verification.');
    } finally {
      setVerificationPending(false);
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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Tous les champs de mot de passe sont requis.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setPasswordPending(true);

    try {
      const response = await updateOwnPassword({
        currentPassword,
        password: newPassword,
        passwordConfirmation: confirmPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(response.message ?? 'Mot de passe mis a jour.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre a jour le mot de passe.');
    } finally {
      setPasswordPending(false);
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
              <CardDescription>Mettez a jour votre profil, votre email, votre telephone et votre avatar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {resolvedAvatarPreview ? <AvatarImage src={resolvedAvatarPreview} alt={`${firstName} ${lastName}`.trim() || 'Avatar'} /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] text-2xl text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatarFile" className="mb-2 block">Photo de profil</Label>
                  <Input
                    id="avatarFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;

                      if (nextFile === null) {
                        return;
                      }

                      try {
                        validateAvatarFile(nextFile);
                        if (avatarPreviewUrl !== null) {
                          URL.revokeObjectURL(avatarPreviewUrl);
                        }
                        setAvatarFile(nextFile);
                        setAvatarPreviewUrl(URL.createObjectURL(nextFile));
                        toast.success('Nouvelle photo prete. Enregistrez le profil pour l envoyer vers R2.');
                      } catch (error) {
                        setAvatarFile(null);
                        event.currentTarget.value = '';
                        toast.error(error instanceof Error ? error.message : 'Image invalide.');
                      }
                    }}
                  />
                  <p className="mt-2 text-xs text-gray-500">JPG, PNG ou WebP. L image est compressee en WebP 512x512 avant l envoi vers R2.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenom</Label>
                  <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="email">Email</Label>
                    <span className={`text-xs font-medium ${emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {emailVerified ? 'Verifie' : 'Verification requise'}
                    </span>
                  </div>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  {!emailVerified ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <span>Validez votre email pour securiser le compte. Un message Resend est envoye apres changement.</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleResendVerification()} disabled={verificationPending}>
                        {verificationPending ? 'Envoi...' : 'Renvoyer'}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                  <p className="text-xs text-gray-500">Aucune verification SMS n est requise pour le moment.</p>
                </div>
              </div>

              {role === 'business-owner' ? (
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} className="pl-10" />
                  </div>
                </div>
              ) : null}

              <Button
                className="gap-2 bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90"
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--myhd-primary))]/10">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--myhd-cyan))]/10">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
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
              <CardDescription>Modifiez directement votre mot de passe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
              <Button
                className="gap-2 bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90"
                onClick={() => void handleChangePassword()}
                disabled={passwordPending}
              >
                <Save size={16} />
                {passwordPending ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                className="gap-2 bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90"
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
