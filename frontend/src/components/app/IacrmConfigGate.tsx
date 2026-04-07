import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

interface IacrmConfigGateProps {
  /** Short description of the blocked action, e.g. "créer un programme" */
  action: string
  onClose: () => void
}

export function IacrmConfigGate({ action, onClose }: IacrmConfigGateProps) {
  const navigate = useNavigate()

  function goToConfigure(path: string) {
    onClose()
    navigate(path)
  }

  return (
    <>
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        {/* Icon */}
        <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <KeyRound className="size-7 text-amber-600" />
        </div>

        {/* Text */}
        <div className="max-w-xs space-y-2">
          <p className="text-base font-semibold text-foreground">
            Connexion IACRM requise
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Pour {action}, configurez d'abord la connexion à l'API IACRM.
            Cela prend moins d'une minute.
          </p>
        </div>

        {/* Primary CTA */}
        <Button type="button" onClick={() => goToConfigure('/iacrm')}>
          Configurer l'API IACRM
        </Button>

        {/* Secondary link */}
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          onClick={() => goToConfigure('/settings')}
        >
          Paramètres → API
        </button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </DialogFooter>
    </>
  )
}
