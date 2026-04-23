import {cn} from "@/lib/utils";

type FormFieldErrorProps = {
  id: string;
  message?: string;
  className?: string;
};

export function FormFieldError({id, message, className}: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className={cn("text-sm font-medium text-destructive", className)}>
      {message}
    </p>
  );
}
