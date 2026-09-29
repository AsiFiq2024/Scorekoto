import Icon from "./Icon";
import BrandLogo from "./BrandLogo";

const featureItems = [
  { icon: "bolt", label: "Live scores", copy: "Follow every goal as it happens" },
  { icon: "star", label: "Your favorites", copy: "Keep clubs and leagues close" },
  { icon: "bell", label: "Match alerts", copy: "Never miss the moments that matter" },
];

export default function AuthShowcase({ variant = "login" }) {
  const isRegister = variant === "register";

  return (
    <section className="auth-showcase" aria-label="Scorekoto matchday features">
      <div className="auth-showcase-glow" aria-hidden="true" />
      <div className="auth-showcase-topline">
        <BrandLogo />
      </div>
      <div className="auth-showcase-copy">
        <span className="auth-kicker">Your football. Your way.</span>
        <h2>{isRegister ? "Build your perfect matchday." : "Everything you follow, in one place."}</h2>
        <p>{isRegister
          ? "Create your free account and turn every fixture into a more personal experience."
          : "Pick up where you left off with scores, favorites, news, and match reactions."}</p>
      </div>
      <div className="auth-feature-list">
        {featureItems.map((item) => (
          <div className="auth-feature-item" key={item.label}>
            <span><Icon name={item.icon} /></span>
            <div><strong>{item.label}</strong><small>{item.copy}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}
