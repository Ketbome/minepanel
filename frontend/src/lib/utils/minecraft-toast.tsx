import { toast as sonnerToast } from "sonner";
import Image from "next/image";

interface MinecraftToastOptions {
  description?: string;
  duration?: number;
}

const ToastContent = ({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description?: string;
}) => (
  <div className="flex items-start gap-3">
    <Image
      src={icon}
      alt=""
      width={24}
      height={24}
      className="flex-shrink-0 mt-0.5 pixelated"
    />
    <div className="flex-1 min-w-0">
      <p className="font-minecraft text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
  </div>
);

export const mcToast = {
  success: (message: string, options?: MinecraftToastOptions) => {
    sonnerToast.custom(
      () => (
        <div className="bg-gray-900/95 border-2 border-emerald-600/50 rounded-lg p-3 shadow-lg shadow-emerald-900/20 backdrop-blur-sm">
          <ToastContent
            icon="/images/emerald.webp"
            title={message}
            description={options?.description}
          />
        </div>
      ),
      { duration: options?.duration ?? 3000 }
    );
  },

  error: (message: string, options?: MinecraftToastOptions) => {
    sonnerToast.custom(
      () => (
        <div className="bg-gray-900/95 border-2 border-red-600/50 rounded-lg p-3 shadow-lg shadow-red-900/20 backdrop-blur-sm">
          <ToastContent
            icon="/images/redstone.webp"
            title={message}
            description={options?.description}
          />
        </div>
      ),
      { duration: options?.duration ?? 4000 }
    );
  },

  warning: (message: string, options?: MinecraftToastOptions) => {
    sonnerToast.custom(
      () => (
        <div className="bg-gray-900/95 border-2 border-amber-600/50 rounded-lg p-3 shadow-lg shadow-amber-900/20 backdrop-blur-sm">
          <ToastContent
            icon="/images/gold.webp"
            title={message}
            description={options?.description}
          />
        </div>
      ),
      { duration: options?.duration ?? 3500 }
    );
  },

  info: (message: string, options?: MinecraftToastOptions) => {
    sonnerToast.custom(
      () => (
        <div className="bg-gray-900/95 border-2 border-blue-600/50 rounded-lg p-3 shadow-lg shadow-blue-900/20 backdrop-blur-sm">
          <ToastContent
            icon="/images/diamond.webp"
            title={message}
            description={options?.description}
          />
        </div>
      ),
      { duration: options?.duration ?? 3000 }
    );
  },

  loading: (message: string, options?: MinecraftToastOptions) => {
    return sonnerToast.custom(
      () => (
        <div className="bg-gray-900/95 border-2 border-purple-600/50 rounded-lg p-3 shadow-lg shadow-purple-900/20 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Image
              src="/images/ender-pearl.webp"
              alt=""
              width={24}
              height={24}
              className="flex-shrink-0 mt-0.5 pixelated animate-pulse"
            />
            <div className="flex-1 min-w-0">
              <p className="font-minecraft text-sm font-medium">{message}</p>
              {options?.description && (
                <p className="text-xs text-gray-400 mt-0.5">{options.description}</p>
              )}
            </div>
          </div>
        </div>
      ),
      { duration: options?.duration ?? Infinity }
    );
  },

  dismiss: sonnerToast.dismiss,
};

