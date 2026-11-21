import React from 'react';
import PageHeader from '../../components/ui/PageHeader';

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  gradient?: string;
  icon: React.ElementType;
}

/**
 * Encabezado de los módulos de inventario.
 * Reutiliza el mismo componente que el resto de módulos para mantener el
 * lenguaje visual (aurora, malla y glass) en toda la aplicación.
 */
export default function InventoryPageHeader({
  eyebrow,
  title,
  subtitle,
  gradient = 'from-cyan-600 via-teal-600 to-emerald-700',
  icon,
}: Props) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      gradient={gradient}
      icon={icon}
    />
  );
}
