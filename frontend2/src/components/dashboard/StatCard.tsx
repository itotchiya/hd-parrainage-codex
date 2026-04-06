// import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  helpText?: string;
  helpFormula?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ElementType;
  color?: 'primary' | 'cyan' | 'success' | 'warning';
  fullBackground?: boolean;
}

const colorVariants = {
  primary: 'from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-primary))]/70',
  cyan: 'from-[hsl(var(--myhd-cyan))] to-[hsl(var(--myhd-cyan))]/70',
  success: 'from-emerald-500 to-emerald-400',
  warning: 'from-amber-500 to-amber-400',
};

export function StatCard({ 
  title, 
  value, 
  description,
  helpText,
  helpFormula,
  // trend, 
  // trendValue, 
  icon: Icon,
  color = 'primary',
  fullBackground = false 
}: StatCardProps) {
  const card = (
    <Card className={cn(
      "overflow-hidden hover:shadow-lg transition-all duration-300 border-none",
      fullBackground ? cn("bg-gradient-to-br text-white", colorVariants[color]) : "bg-white"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium mb-1",
              fullBackground ? "text-white/80" : "text-gray-500"
            )}>{title}</p>
            <h3 className={cn(
              "text-2xl font-bold",
              fullBackground ? "text-white" : "text-[hsl(var(--myhd-dark))]"
            )}>{value}</h3>
            {description && (
              <p className={cn(
                "text-xs mt-1",
                fullBackground ? "text-white/70" : "text-gray-400"
              )}>{description}</p>
            )}
            {/* ... trend logic can be updated too if needed, but keeping it simple ... */}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
            fullBackground 
              ? "bg-white/20 text-white" 
              : cn("bg-gradient-to-br text-white", colorVariants[color])
          )}>
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!helpText && !helpFormula) {
    return card;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-xs rounded-xl px-4 py-3">
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {helpText && <p>{helpText}</p>}
          {helpFormula && <p className="text-[11px] opacity-90">Formule: {helpFormula}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
