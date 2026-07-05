import { cn } from '@/lib/utils';

export function Table({ className, children }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-[13.5px]', className)}>{children}</table>;
}

export function Thead({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-soft/60">{children}</thead>;
}

export function Th({ className, children }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'label-mono h-9 px-4 text-left align-middle text-mid border-b border-line',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-line/70">{children}</tbody>;
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors duration-150 hover:bg-soft/50', className)} {...props}>
      {children}
    </tr>
  );
}

export function Td({ className, children }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-2.5 align-middle text-body', className)}>{children}</td>;
}
