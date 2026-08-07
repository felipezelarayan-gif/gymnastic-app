"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIdioma } from "@/lib/i18n-context";

type TipoUsuario = "atleta" | "entrenador" | null;

const initialAtletaForm = {
  nombre: "",
  email: "",
  telefono: "",
  edad: "",
  sexo: "",
  altura_cm: "",
  peso_kg: "",
  objetivo: "",
  experiencia: "",
  lesiones: "",
  disponibilidad: "",
  mensaje: "",
};

const initialEntrenadorForm = {
  nombre: "",
  email: "",
  telefono: "",
  tiene_gimnasio: "",
  uso_gimnasio: "",
  especialidad: "",
  experiencia: "",
  certificaciones: "",
  disponibilidad: "",
  mensaje: "",
};

export default function InscripcionPage() {
  const { t, idioma } = useIdioma();
  const router = useRouter();
  const [paso, setPaso] = useState<"tipo" | "atleta" | "entrenador">("tipo");
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>(null);
  const [atletaForm, setAtletaForm] = useState(initialAtletaForm);
  const [entrenadorForm, setEntrenadorForm] = useState(initialEntrenadorForm);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirigir a / después de 10 segundos cuando se envía el formulario
  useEffect(() => {
    if (!enviado) return;
    const timeout = setTimeout(() => {
      router.push("/");
    }, 10000);
    return () => clearTimeout(timeout);
  }, [enviado, router]);

  function actualizarAtleta(campo: keyof typeof initialAtletaForm, valor: string) {
    setAtletaForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarEntrenador(campo: keyof typeof initialEntrenadorForm, valor: string) {
    setEntrenadorForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function elegirTipo(tipo: "atleta" | "entrenador") {
    setTipoUsuario(tipo);
    setPaso(tipo);
  }

  const handleSubmitAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "atleta",
          idioma,
          ...atletaForm,
          edad: atletaForm.edad ? Number(atletaForm.edad) : null,
          altura_cm: atletaForm.altura_cm ? Number(atletaForm.altura_cm) : null,
          peso_kg: atletaForm.peso_kg ? Number(atletaForm.peso_kg) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar el formulario");
        setEnviando(false);
        return;
      }
      setEnviado(true);
    } catch {
      setError("Error de conexión al enviar el formulario");
    } finally {
      setEnviando(false);
    }
  };

  const handleSubmitEntrenador = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "entrenador",
          idioma,
          ...entrenadorForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar el formulario");
        setEnviando(false);
        return;
      }
      setEnviado(true);
    } catch {
      setError("Error de conexión al enviar el formulario");
    } finally {
      setEnviando(false);
    }
  };

  const inputClass =
    "w-full bg-[#1E1E1E] border border-white/[0.07] rounded-xl p-3 text-sm outline-none text-[#F0F0F0] placeholder:text-[#4a4a4a] focus:border-[#08A66C]/50 focus:shadow-[0_0_0_3px_rgba(8,166,108,0.1)] transition-all";

  return (
    <main className="min-h-screen bg-[#0E0E0E] text-[#F0F0F0] overflow-x-hidden">
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

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[600px] mx-auto">
          {!enviado && (
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                {t("inscripcion.titulo")}
              </h1>
              <p className="text-base text-[#7a7a7a] font-light">
                {t("inscripcion.subtitulo")}
              </p>
            </div>
          )}

          {enviado ? (
            <div className="bg-[#161616] border border-[#08A66C]/30 rounded-xl p-8 text-center">
              <div className="w-12 h-12 bg-[#08A66C] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E0E0E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold mb-2">{t("inscripcion.exito")}</h2>
              <p className="text-sm text-[#7a7a7a] font-light">
                {t("inscripcion.exitoDesc")}
              </p>
              <p className="text-xs text-[#4a4a4a] mt-4">
                {t("inscripcion.redirigiendo")}
              </p>
            </div>
          ) : paso === "tipo" ? (
            /* ─── PASO 1: ELEGIR TIPO ─── */
            <div>
              <h2 className="text-2xl font-bold text-center mb-8">
                {t("inscripcion.elegirTipo")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => elegirTipo("atleta")}
                  className="bg-[#161616] border border-white/[0.07] rounded-xl p-8 hover:bg-[#1E1E1E] hover:border-[#08A66C]/20 transition-all group text-center"
                >
                  <div className="text-4xl mb-4">🏋️</div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-[#08A66C] transition-colors">
                    {t("inscripcion.soyAtleta")}
                  </h3>
                  <p className="text-sm text-[#7a7a7a] font-light">
                    {t("inscripcion.soyAtletaDesc")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => elegirTipo("entrenador")}
                  className="bg-[#161616] border border-white/[0.07] rounded-xl p-8 hover:bg-[#1E1E1E] hover:border-[#08A66C]/20 transition-all group text-center"
                >
                  <div className="text-4xl mb-4">👨‍🏫</div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-[#08A66C] transition-colors">
                    {t("inscripcion.soyEntrenador")}
                  </h3>
                  <p className="text-sm text-[#7a7a7a] font-light">
                    {t("inscripcion.soyEntrenadorDesc")}
                  </p>
                </button>
              </div>
            </div>
          ) : paso === "atleta" ? (
            /* ─── PASO 2: FORMULARIO ATLETA ─── */
            <div>
              <button
                type="button"
                onClick={() => setPaso("tipo")}
                className="text-sm text-[#7a7a7a] hover:text-[#F0F0F0] mb-6 no-underline"
              >
                ← {t("inscripcion.volver")}
              </button>
              <h2 className="text-2xl font-bold mb-6">
                {t("inscripcion.formAtleta")}
              </h2>
              <form onSubmit={handleSubmitAtleta} className="space-y-4">
                <input className={inputClass} placeholder={t("inscripcion.nombre")} value={atletaForm.nombre} onChange={(e) => actualizarAtleta("nombre", e.target.value)} required />
                <input className={inputClass} type="email" placeholder={t("inscripcion.email")} value={atletaForm.email} onChange={(e) => actualizarAtleta("email", e.target.value)} required />
                <input className={inputClass} placeholder={t("inscripcion.telefono")} value={atletaForm.telefono} onChange={(e) => actualizarAtleta("telefono", e.target.value)} />
                <input className={inputClass} type="number" placeholder={t("inscripcion.edad")} value={atletaForm.edad} onChange={(e) => actualizarAtleta("edad", e.target.value)} />

                <select className={inputClass} value={atletaForm.sexo} onChange={(e) => actualizarAtleta("sexo", e.target.value)}>
                  <option value="">{t("inscripcion.sexoSelect")}</option>
                  <option value="Masculino">{t("inscripcion.masculino")}</option>
                  <option value="Femenino">{t("inscripcion.femenino")}</option>
                  <option value="Prefiero no decirlo">{t("inscripcion.prefieroNoDecir")}</option>
                </select>

                <input className={inputClass} type="number" placeholder={t("inscripcion.altura")} value={atletaForm.altura_cm} onChange={(e) => actualizarAtleta("altura_cm", e.target.value)} />
                <input className={inputClass} type="number" placeholder={t("inscripcion.peso")} value={atletaForm.peso_kg} onChange={(e) => actualizarAtleta("peso_kg", e.target.value)} />

                <select className={inputClass} value={atletaForm.objetivo} onChange={(e) => actualizarAtleta("objetivo", e.target.value)} required>
                  <option value="">{t("inscripcion.objetivoSelect")}</option>
                  <option>{t("inscripcion.objetivo1")}</option>
                  <option>{t("inscripcion.objetivo2")}</option>
                  <option>{t("inscripcion.objetivo3")}</option>
                  <option>{t("inscripcion.objetivo4")}</option>
                </select>

                <select className={inputClass} value={atletaForm.experiencia} onChange={(e) => actualizarAtleta("experiencia", e.target.value)}>
                  <option value="">{t("inscripcion.experienciaSelect")}</option>
                  <option>{t("inscripcion.experiencia1")}</option>
                  <option>{t("inscripcion.experiencia2")}</option>
                  <option>{t("inscripcion.experiencia3")}</option>
                </select>

                <textarea className={inputClass} placeholder={t("inscripcion.lesiones")} rows={3} value={atletaForm.lesiones} onChange={(e) => actualizarAtleta("lesiones", e.target.value)} />

                <select className={inputClass} value={atletaForm.disponibilidad} onChange={(e) => actualizarAtleta("disponibilidad", e.target.value)} required>
                  <option value="">{t("inscripcion.disponibilidadSelect")}</option>
                  <option>{t("inscripcion.disp1")}</option>
                  <option>{t("inscripcion.disp2")}</option>
                  <option>{t("inscripcion.disp3")}</option>
                </select>

                <textarea className={inputClass} placeholder={t("inscripcion.mensaje")} rows={3} value={atletaForm.mensaje} onChange={(e) => actualizarAtleta("mensaje", e.target.value)} />

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-[#08A66C] text-[#0E0E0E] py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {enviando ? t("inscripcion.enviando") : t("inscripcion.enviar")}
                </button>
              </form>
            </div>
          ) : (
            /* ─── PASO 2: FORMULARIO ENTRENADOR ─── */
            <div>
              <button
                type="button"
                onClick={() => setPaso("tipo")}
                className="text-sm text-[#7a7a7a] hover:text-[#F0F0F0] mb-6 no-underline"
              >
                ← {t("inscripcion.volver")}
              </button>
              <h2 className="text-2xl font-bold mb-6">
                {t("inscripcion.formEntrenador")}
              </h2>
              <form onSubmit={handleSubmitEntrenador} className="space-y-4">
                <input className={inputClass} placeholder={t("inscripcion.nombre")} value={entrenadorForm.nombre} onChange={(e) => actualizarEntrenador("nombre", e.target.value)} required />
                <input className={inputClass} type="email" placeholder={t("inscripcion.email")} value={entrenadorForm.email} onChange={(e) => actualizarEntrenador("email", e.target.value)} required />
                <input className={inputClass} placeholder={t("inscripcion.telefono")} value={entrenadorForm.telefono} onChange={(e) => actualizarEntrenador("telefono", e.target.value)} />

                {/* ¿Tenés gimnasio? */}
                <div>
                  <p className="text-sm text-[#7a7a7a] mb-2">{t("inscripcion.tieneGimnasio")}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setEntrenadorForm((prev) => ({ ...prev, tiene_gimnasio: "si", uso_gimnasio: "" })); }}
                      className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition-all ${
                        entrenadorForm.tiene_gimnasio === "si"
                          ? "bg-[#08A66C] text-[#0E0E0E] border-[#08A66C]"
                          : "bg-[#1E1E1E] border-white/[0.07] text-[#F0F0F0] hover:border-[#08A66C]/50"
                      }`}
                    >
                      {t("common.si")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEntrenadorForm((prev) => ({ ...prev, tiene_gimnasio: "no", uso_gimnasio: "individual" })); }}
                      className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition-all ${
                        entrenadorForm.tiene_gimnasio === "no"
                          ? "bg-[#08A66C] text-[#0E0E0E] border-[#08A66C]"
                          : "bg-[#1E1E1E] border-white/[0.07] text-[#F0F0F0] hover:border-[#08A66C]/50"
                      }`}
                    >
                      {t("common.no")}
                    </button>
                  </div>
                </div>

                {/* Si tiene gimnasio: ¿uso del gym o solo él? */}
                {entrenadorForm.tiene_gimnasio === "si" && (
                  <div>
                    <p className="text-sm text-[#7a7a7a] mb-2">{t("inscripcion.usoGimnasio")}</p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => actualizarEntrenador("uso_gimnasio", "gym")}
                        className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition-all ${
                          entrenadorForm.uso_gimnasio === "gym"
                            ? "bg-[#08A66C] text-[#0E0E0E] border-[#08A66C]"
                            : "bg-[#1E1E1E] border-white/[0.07] text-[#F0F0F0] hover:border-[#08A66C]/50"
                        }`}
                      >
                        {t("inscripcion.gimnasioMultiple")}
                      </button>
                      <button
                        type="button"
                        onClick={() => actualizarEntrenador("uso_gimnasio", "individual")}
                        className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition-all ${
                          entrenadorForm.uso_gimnasio === "individual"
                            ? "bg-[#08A66C] text-[#0E0E0E] border-[#08A66C]"
                            : "bg-[#1E1E1E] border-white/[0.07] text-[#F0F0F0] hover:border-[#08A66C]/50"
                        }`}
                      >
                        {t("inscripcion.gimnasioIndividual")}
                      </button>
                    </div>
                  </div>
                )}

                <input className={inputClass} placeholder={t("inscripcion.especialidad")} value={entrenadorForm.especialidad} onChange={(e) => actualizarEntrenador("especialidad", e.target.value)} />
                <input className={inputClass} placeholder={t("inscripcion.experienciaEntrenador")} value={entrenadorForm.experiencia} onChange={(e) => actualizarEntrenador("experiencia", e.target.value)} />
                <input className={inputClass} placeholder={t("inscripcion.certificaciones")} value={entrenadorForm.certificaciones} onChange={(e) => actualizarEntrenador("certificaciones", e.target.value)} />

                <select className={inputClass} value={entrenadorForm.disponibilidad} onChange={(e) => actualizarEntrenador("disponibilidad", e.target.value)}>
                  <option value="">{t("inscripcion.disponibilidadSelect")}</option>
                  <option>{t("inscripcion.disp1")}</option>
                  <option>{t("inscripcion.disp2")}</option>
                  <option>{t("inscripcion.disp3")}</option>
                </select>

                <textarea className={inputClass} placeholder={t("inscripcion.mensaje")} rows={3} value={entrenadorForm.mensaje} onChange={(e) => actualizarEntrenador("mensaje", e.target.value)} />

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-[#08A66C] text-[#0E0E0E] py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {enviando ? t("inscripcion.enviando") : t("inscripcion.enviar")}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}