import { useServerOffline } from '@/store/storeStatus';
import { Alert } from './Field';

/** Aviso para funciones que necesitan la API cuando esta versión de la web no la tiene. */
export function OfflineNotice({ children }: { children: string }) {
  const offline = useServerOffline();
  if (!offline) return null;
  return (
    <Alert tone="info" title="No disponible en esta versión">
      <p>{children}</p>
    </Alert>
  );
}
