import { useState } from "react";
import { simpleLogin, ALT_API_BASE } from "@/lib/altApi";
import BrandLogo from "@/components/BrandLogo";
import { BRAND_LOGO_USAGE } from "@/lib/brand";

interface Props {
  onSuccess: () => void;
}

export default function SimpleDemoLogin({ onSuccess }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [userPlanTier, setUserPlanTier] = useState<"essential" | "professional" | "curator_digital">("essential");
  const [activePlanId, setActivePlanId] = useState("plan-essential");
  const [preferredModelId, setPreferredModelId] = useState("native-ollama");
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
      localStorage.setItem("singulai_active_plan_id", activePlanId);
      localStorage.setItem("singulai_user_plan_tier", userPlanTier);
      localStorage.setItem("singulai_preferred_model_id", preferredModelId);
      localStorage.setItem("singulai_model_choice_enabled", "false");
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

          <div className="slogin-section">
            <label className="f-label">Plano SingulAI</label>
            <select
              className="f-input slogin-select"
              value={activePlanId}
              onChange={(e) => {
                const next = e.target.value;
                setActivePlanId(next);
                if (next === "plan-professional") setUserPlanTier("professional");
                else if (next === "plan-curator") setUserPlanTier("curator_digital");
                else setUserPlanTier("essential");
              }}
              disabled={loading}
            >
              <option value="plan-essential">Essencial</option>
              <option value="plan-professional">Profissional</option>
              <option value="plan-curator">Curador Digital</option>
            </select>
          </div>

          <div className="slogin-section">
            <label className="f-label">Modelo de IA</label>
            <select
              className="f-input slogin-select"
              value={preferredModelId}
              onChange={(e) => setPreferredModelId(e.target.value)}
              disabled
            >
              <option value="native-ollama">Nativo (Ollama) - Padrão</option>
              <option value="premium-gpt-4o">Premium (pendente contratação)</option>
              <option value="premium-claude">Premium (pendente contratação)</option>
            </select>
            <p className="slogin-note">
              Escolha de modelo desabilitada até contratação dos planos premium.
            </p>
          </div>

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
