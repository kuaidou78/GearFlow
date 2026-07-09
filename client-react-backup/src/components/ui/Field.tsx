import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type WrapperProps = {
  label: string;
  children: ReactNode;
};

function FieldWrapper({ label, children }: WrapperProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <FieldWrapper label={label}>
      <input className="focus-ring min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" {...props} />
    </FieldWrapper>
  );
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <FieldWrapper label={label}>
      <select className="focus-ring min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}

export function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <FieldWrapper label={label}>
      <textarea className="focus-ring min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" {...props} />
    </FieldWrapper>
  );
}
