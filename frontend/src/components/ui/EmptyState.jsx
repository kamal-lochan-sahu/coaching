export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && <Icon size={48} className="text-gray-300" />}
      <p className="font-semibold text-gray-600">{title}</p>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
