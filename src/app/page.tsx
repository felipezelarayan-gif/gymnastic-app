"use client";

import { useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

export default function InfoPage() {
  const { t, idioma } = useIdioma();
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    mensaje: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, idioma }),
      });

      if (res.ok) {
        setEnviado(true);
        setFormData({ nombre: "", email: "", mensaje: "" });
      }
    } catch {
      // error silencioso
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0E0E0E] text-[#F0F0F0] overflow-x-hidden">
      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0E0E0E]/80 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <img src="/logo.jpg" alt="Forza Zone" className="w-8 h-8 rounded-lg" />
            <span className="text-xl tracking-tight">
              <span className="font-extrabold">FORZA</span>{" "}
              <span className="font-light text-[#7a7a7a]">ZONE</span>
            </span>
          </a>
          <a
            href="/login"
            className="bg-[#08A66C] text-[#0E0E0E] px-4 py-2 rounded-full text-sm font-bold hover:brightness-110 transition no-underline"
          >
            {t("landing.ingresar")}
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 px-6 text-center relative">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#08A66C]/10 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#08A66C]/8 blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-[700px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#08A66C] tracking-widest uppercase bg-[#08A66C]/10 border border-[#08A66C]/25 px-4 py-1.5 rounded-full mb-10">
            <span className="w-1.5 h-1.5 bg-[#08A66C] rounded-full animate-pulse" />
            {t("landing.badge")}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-7">
            {t("landing.heroTitulo1")}
            <br />
            <span className="text-[#08A66C]">{t("landing.heroTitulo2")}</span>
          </h1>

          <p className="text-base sm:text-lg text-[#7a7a7a] max-w-[540px] mx-auto leading-relaxed font-light mb-12">
            {t("landing.heroSubtitulo")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/inscripcion"
              className="bg-[#08A66C] text-[#0E0E0E] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 hover:scale-[1.02] transition-all no-underline w-full sm:w-auto text-center"
            >
              {t("landing.btnQuieroEmpezar")}
            </a>
            <a
              href="#atletas"
              className="border border-white/10 text-[#F0F0F0] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-white/5 transition-all no-underline w-full sm:w-auto text-center"
            >
              {t("landing.btnAtletas")}
            </a>
            <a
              href="#entrenadores"
              className="border border-white/10 text-[#F0F0F0] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-white/5 transition-all no-underline w-full sm:w-auto text-center"
            >
              {t("landing.btnEntrenadores")}
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-[#0E0E0E] bg-[#252525] flex items-center justify-center text-[10px] font-bold -ml-2 first:ml-0"
                >
                  {["🏋️", "📈", "🔥", "⚡"][i - 1]}
                </div>
              ))}
            </div>
            <span className="text-xs text-[#7a7a7a] font-light">
              <strong className="text-[#F0F0F0] font-semibold">
                {t("landing.socialProof")}
              </strong>{" "}
              {t("landing.socialProofDesc")}
            </span>
          </div>
        </div>
      </section>

      {/* ─── PARA ENTRENADORES ─── */}
      <section id="entrenadores" className="py-16 sm:py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-semibold text-[#08A66C] tracking-[0.15em] uppercase mb-4 block">
              {t("landing.coachesTitulo")}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {t("landing.coachesTitulo")}
            </h2>
            <p className="text-base text-[#7a7a7a] max-w-[480px] mx-auto leading-relaxed font-light">
              {t("landing.coachesDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: "📋",
                title: t("landing.coachesFeature1"),
                desc: t("landing.coachesFeature1Desc"),
              },
              {
                icon: "📏",
                title: t("landing.coachesFeature2"),
                desc: t("landing.coachesFeature2Desc"),
              },
              {
                icon: "👥",
                title: t("landing.coachesFeature3"),
                desc: t("landing.coachesFeature3Desc"),
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-[#161616] border border-white/[0.07] rounded-xl p-6 hover:bg-[#1E1E1E] hover:border-[#08A66C]/20 transition-all group"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-[#08A66C] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#7a7a7a] leading-relaxed font-light">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="/inscripcion"
              className="bg-[#08A66C] text-[#0E0E0E] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 hover:scale-[1.02] transition-all no-underline"
            >
              {t("landing.btnQuieroEmpezar")}
            </a>
            <a
              href="#contacto"
              className="border border-white/10 text-[#F0F0F0] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-white/5 transition-all no-underline"
            >
              {t("landing.btnContactarSeccion")}
            </a>
          </div>
        </div>
      </section>

      {/* ─── PARA ATLETAS ─── */}
      <section id="atletas" className="py-16 sm:py-20 px-6 bg-[#161616]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-semibold text-[#08A66C] tracking-[0.15em] uppercase mb-4 block">
              {t("landing.atletasTitulo")}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {t("landing.atletasTitulo")}
            </h2>
            <p className="text-base text-[#7a7a7a] max-w-[480px] mx-auto leading-relaxed font-light">
              {t("landing.atletasDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: "🏋️",
                title: t("landing.atletasFeature1"),
                desc: t("landing.atletasFeature1Desc"),
              },
              {
                icon: "📈",
                title: t("landing.atletasFeature2"),
                desc: t("landing.atletasFeature2Desc"),
              },
              {
                icon: "💬",
                title: t("landing.atletasFeature3"),
                desc: t("landing.atletasFeature3Desc"),
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-[#1E1E1E] border border-white/[0.07] rounded-xl p-6 hover:bg-[#252525] hover:border-[#08A66C]/20 transition-all group"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-[#08A66C] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#7a7a7a] leading-relaxed font-light">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="/inscripcion"
              className="bg-[#08A66C] text-[#0E0E0E] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 hover:scale-[1.02] transition-all no-underline"
            >
              {t("landing.btnQuieroEmpezar")}
            </a>
            <a
              href="#contacto"
              className="border border-white/10 text-[#F0F0F0] px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-white/5 transition-all no-underline"
            >
              {t("landing.btnContactarSeccion")}
            </a>
          </div>
        </div>
      </section>

      {/* ─── SERVICIO ─── */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <span className="text-[10px] font-semibold text-[#08A66C] tracking-[0.15em] uppercase mb-4 block">
            {t("landing.servicioTag")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            {t("landing.serviciotitulo1")}
            <br />
            <span className="text-[#08A66C]">{t("landing.serviciotitulo2")}</span>
          </h2>
          <p className="text-base sm:text-lg text-[#7a7a7a] leading-relaxed font-light mb-10 max-w-[600px] mx-auto">
            {t("landing.servicioDesc")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: t("landing.paso1Titulo"),
                desc: t("landing.paso1Desc"),
              },
              {
                step: "02",
                title: t("landing.paso2Titulo"),
                desc: t("landing.paso2Desc"),
              },
              {
                step: "03",
                title: t("landing.paso3Titulo"),
                desc: t("landing.paso3Desc"),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-[#161616] border border-white/[0.07] rounded-xl p-6 text-left"
              >
                <div className="text-[#08A66C] text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[#7a7a7a] leading-relaxed font-light">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACTO ─── */}
      <section id="contacto" className="py-16 sm:py-20 px-6 bg-[#161616]">
        <div className="max-w-[500px] mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-semibold text-[#08A66C] tracking-[0.15em] uppercase mb-4 block">
              {t("landing.footerContacto")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              {t("landing.contactoTitulo")}
            </h2>
            <p className="text-base text-[#7a7a7a] font-light">
              {t("landing.contactoDesc")}
            </p>
          </div>

          <a
            href="https://wa.me/3865201615"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-[#25D366] text-white px-6 py-4 rounded-xl text-sm font-bold hover:brightness-110 hover:scale-[1.02] transition-all mb-6 no-underline w-full"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t("landing.whatsapp")}
          </a>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-[#4a4a4a] font-light">o</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {enviado ? (
            <div className="bg-[#161616] border border-[#08A66C]/30 rounded-xl p-8 text-center">
              <div className="w-12 h-12 bg-[#08A66C] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E0E0E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">{t("landing.formularioExito")}</h3>
              <p className="text-sm text-[#7a7a7a] font-light">
                {t("landing.formularioExitoDesc")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-1.5 focus-within:border-[#08A66C]/50 focus-within:shadow-[0_0_0_3px_rgba(8,166,108,0.1)] transition-all">
                <input
                  type="text"
                  placeholder={t("landing.formularioNombre")}
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="w-full bg-transparent border-none outline-none text-[#F0F0F0] text-sm px-4 py-3 placeholder:text-[#4a4a4a] font-normal"
                />
              </div>
              <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-1.5 focus-within:border-[#08A66C]/50 focus-within:shadow-[0_0_0_3px_rgba(8,166,108,0.1)] transition-all">
                <input
                  type="email"
                  placeholder={t("landing.formularioEmail")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-transparent border-none outline-none text-[#F0F0F0] text-sm px-4 py-3 placeholder:text-[#4a4a4a] font-normal"
                />
              </div>
              <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-1.5 focus-within:border-[#08A66C]/50 focus-within:shadow-[0_0_0_3px_rgba(8,166,108,0.1)] transition-all">
                <textarea
                  placeholder={t("landing.formularioMensaje")}
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  required
                  rows={4}
                  className="w-full bg-transparent border-none outline-none text-[#F0F0F0] text-sm px-4 py-3 placeholder:text-[#4a4a4a] font-normal resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-[#08A66C] text-[#0E0E0E] py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {enviando ? t("landing.formularioEnviando") : t("landing.formularioEnviar")}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.07] py-10 px-6">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Forza Zone" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-bold">Forza Zone</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/login"
              className="text-xs text-[#7a7a7a] hover:text-[#F0F0F0] transition no-underline"
            >
              {t("landing.footerIngresar")}
            </a>
            <a
              href="#contacto"
              className="text-xs text-[#7a7a7a] hover:text-[#F0F0F0] transition no-underline"
            >
              {t("landing.footerContacto")}
            </a>
          </div>
          <p className="text-xs text-[#4a4a4a] font-light">
            © {new Date().getFullYear()} Forza Zone
          </p>
        </div>
      </footer>
    </main>
  );
}