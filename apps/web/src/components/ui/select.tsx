import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-line bg-card px-3 text-[13.5px] text-ink',
        'transition-[border-color,box-shadow] duration-150',
        'focus:outline-none focus:border-jade focus:ring-2 focus:ring-jade/25',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
