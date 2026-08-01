import { App } from "@/components/App";
import { I18nProvider } from "@/lib/i18n";

export default function Home() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}
