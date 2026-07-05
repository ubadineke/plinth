import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  // jade = the accent; actions are the only place it gets to be loud
  default: 'bg-jade text-white hover:bg-jade-deep shadow-[0_1px_2px_rgba(10,10,10,0.12)]',
  outline: 'border border-line bg-card text-body hover:border-faint hover:text-ink',
  ghost: 'text-mid hover:bg-soft hover:text-ink',
  destructive: 'bg-danger-bar text-white hover:brightness-95',
  secondary: 'bg-soft text-body hover:bg-line hover:text-ink',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-[13.5px]',
  lg: 'h-10 px-5 text-sm',
};

export function Button({ variant = 'default', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,transform,filter] duration-150',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
