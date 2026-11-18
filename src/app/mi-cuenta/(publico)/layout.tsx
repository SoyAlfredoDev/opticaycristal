import { ClientBrand } from "@/components/clients/ClientBrand";
import styles from "@/components/clients/ClientSpace.module.css";

export default function PublicClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.publicClient}>
      <ClientBrand prominent />
      <main id="contenido-principal">{children}</main>
    </div>
  );
}
