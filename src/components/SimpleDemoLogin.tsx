import { useState } from "react";
import { simpleLogin, ALT_API_BASE } from "@/lib/altApi";
import BrandLogo from "@/components/BrandLogo";
import { BRAND_LOGO_USAGE } from "@/lib/brand";

interface Props {
  onSuccess: () => void;
}

export default function SimpleDemoLogin({ onSuccess }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await simpleLogin(id);
      if (!data.ok) {
        setError(data.message || "Falha na autenticação. Tente novamente.");
        return;
      }
      const token = data.sessionToken || data.session || "";
      localStorage.setItem("singulai_session", token);
      localStorage.setItem("singulai_user", JSON.stringify(data.user ?? {}));
      localStorage.setItem("singulai_wallet", JSON.stringify(data.wallet ?? {}));
      localStorage.setItem("singulai_auth_source", "simple_backend");
      localStorage.setItem("singulai_api_base", ALT_API_BASE);
      onSuccess();
    } catch {
      setError("Erro de conexão. Verifique sua rede e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slogin-overlay">
      <div className="slogin-shell">
        <div className="slogin-brand">
          <BrandLogo {...BRAND_LOGO_USAGE.modal} />
        </div>
        <h2 className="slogin-title">Modo Demonstração</h2>
        <p className="slogin-sub">
          Acesse com e-mail ou celular para explorar os avatares
        </p>
        <form className="slogin-form" onSubmit={handleSubmit} noValidate>
          <input
            className="f-input slogin-input"
            type="text"
            placeholder="E-mail ou celular"
            autoComplete="off"
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
          />
          {error && <p className="slogin-error">{error}</p>}
          <button
            className="btn-primary slogin-btn"
            type="submit"
            disabled={loading || !identifier.trim()}
          >
            {loading ? (
              <span className="slogin-loading">
                <span className="tdot" />
                <span className="tdot" />
                <span className="tdot" />
              </span>
            ) : (
              "Entrar no modo demonstração"
            )}
          </button>
        </form>
        <p className="slogin-footer">SingulAI v2.0 · Demonstração segura</p>
      </div>
    </div>
  );
}
