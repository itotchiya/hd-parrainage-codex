import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, Shield, ArrowRight } from 'lucide-react';
import { useAuthSession } from '@/lib/auth-session';
import { ApiError } from '@/lib/api';

const demoPassword = 'Password123!';

const demoAccounts = [
  {
    id: 'super-admin',
    label: 'Super administrateur',
    description: 'Gestion complete de la plateforme',
    email: 'superadmin@hd-parrainage.test',
    icon: Shield,
  },
  {
    id: 'business-owner',
    label: 'Responsable entreprise',
    description: "Gerez vos programmes d'affiliation",
    email: 'owner@havetdigital.test',
    icon: Building2,
  },
  {
    id: 'agent',
    label: 'Affilie',
    description: 'Suivez vos commissions et prospects',
    email: 'agent@havetdigital.test',
    icon: Users,
  },
] as const;

export function Login() {
  const { login, loginPending } = useAuthSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const [email, setEmail] = useState<string>(demoAccounts[0].email);
  const [password, setPassword] = useState<string>(demoPassword);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  const handleLogin = async (nextEmail = email, nextPassword = password) => {
    setSubmissionMessage(null);

    try {
      await login({
        email: nextEmail,
        password: nextPassword,
        remember: true,
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmissionMessage(error.errors?.email?.[0] ?? error.message);
        return;
      }

      setSubmissionMessage('La connexion au backend a echoue.');
    }
  };

  const handleDemoLogin = async (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(demoPassword);
    await handleLogin(account.email, demoPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--myhd-light))] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src="/logo.png" alt="Myhd Affiliation" className="h-16 w-auto" />
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-1 pt-6 text-center">
            <CardTitle className="text-2xl font-bold text-[hsl(var(--myhd-dark))]">
              Connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2.5">
              {demoAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                    email === account.email
                      ? 'border-[hsl(var(--myhd-primary))] bg-[hsl(var(--myhd-primary))]/5'
                      : 'border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30'
                  }`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] text-white">
                    <account.icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[hsl(var(--myhd-dark))]">{account.label}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">{account.email}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loginPending}
                    className="bg-[hsl(var(--myhd-primary))] text-white hover:bg-[hsl(var(--myhd-primary))]/90"
                    onClick={() => void handleDemoLogin(account)}
                  >
                    Connexion
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            {submissionMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submissionMessage}
              </div>
            )}

            <Button
              onClick={() => void handleLogin()}
              disabled={loginPending}
              className="mt-5 h-12 w-full bg-[hsl(var(--myhd-primary))] text-white hover:bg-[hsl(var(--myhd-primary))]/90"
            >
              {loginPending ? 'Connexion...' : 'Se connecter'}
              <ArrowRight size={18} className="ml-2" />
            </Button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Comptes de test backend precharges. Mot de passe de demonstration : <span className="font-medium">Password123!</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
