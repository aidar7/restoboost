// frontend/app/(public)/layout.tsx

// Этот layout теперь отвечает только за то, чтобы "пробросить" дочерние элементы дальше.
// Он больше не добавляет никакой своей разметки.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
