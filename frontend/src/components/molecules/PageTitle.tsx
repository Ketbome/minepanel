import Image from "next/image";

interface PageTitleProps {
  readonly icon: string;
  readonly title: string;
  readonly description?: React.ReactNode;
}

// One-line page title: the breadcrumb bar already names the page, so this stays small.
export function PageTitle({ icon, title, description }: PageTitleProps) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Image src={icon} alt="" width={22} height={22} className="pixelated shrink-0" />
      <h1 className="text-lg sm:text-xl font-minecraft text-white leading-tight shrink-0">{title}</h1>
      {description && <p className="hidden sm:block text-xs text-gray-400 truncate min-w-0">{description}</p>}
    </div>
  );
}
