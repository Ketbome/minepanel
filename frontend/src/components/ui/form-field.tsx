import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import Image from "next/image";

interface FormFieldProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "number" | "password";
  placeholder?: string;
  description?: string;
  tooltip?: string;
  icon?: string;
  iconAlt?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
}

/**
 * Componente reutilizable para campos de formulario
 * Incluye label, input, descripción opcional, tooltip e icono
 */
export function FormField({ id, label, value, onChange, onBlur, type = "text", placeholder, description, tooltip, icon, iconAlt, className = "", inputClassName = "", disabled = false, required = false, min, max }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          {icon && iconAlt && <Image src={icon} alt={iconAlt} width={16} height={16} />}
          {label}
          {required && <span className="text-red-400">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50" type="button">
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} disabled={disabled} required={required} min={min} max={max} className={`bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 text-gray-200 ${inputClassName}`} />
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}

interface FormSwitchFieldProps {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  iconAlt?: string;
  className?: string;
  children: ReactNode; // Required since we expect the Switch component to be passed as children
}

export function FormSwitchField({ id, label, description, icon, iconAlt, className = "", children }: FormSwitchFieldProps) {
  return (
    <div className={`p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          {icon && iconAlt && <Image src={icon} alt={iconAlt} width={16} height={16} />}
          {label}
        </Label>
        {children}
      </div>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}
