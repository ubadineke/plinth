import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-line bg-card px-3 text-[13.5px] text-ink placeholder:text-faint',
        'transition-[border-color,box-shadow] duration-150',
        'focus:outline-none focus:border-jade focus:ring-2 focus:ring-jade/25',
        className,
      )}
      {...props}
    />
  );
}
