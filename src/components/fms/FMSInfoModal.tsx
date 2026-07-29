"use client";

import { useEffect, useState } from "react";

import { FMS_INFO, type FMSInfo } from "@/lib/fms/fms-info";
import { useIdioma } from "@/lib/i18n-context";

type Props = {
  abierto: boolean;
  onClose: () => void;
  testNombre: string;
  tipo: "profesor" | "alumno";
};

type TabActiva = "descripcion" | "instrucciones" | "criterios";


export default function FMSInfoModal({
  abierto,
  onClose,
  testNombre,
  tipo,
}: Props) {
  const { t, idioma } = useIdioma();
  const [tabActiva, setTabActiva] = useState<TabActiva>("descripcion");

  useEffect(() => {
    if (abierto) setTabActiva("descripcion");
  }, [abierto, testNombre]);

  if (!abierto) return null;

  // Buscar por nombre traducido o por id
  let info: FMSInfo | null = FMS_INFO[testNombre] || null;
  if (!info) {
    // Fallback: buscar por id (deep-squat, hurdle-step, etc.)
    info = Object.values(FMS_INFO).find((item) => item.id === testNombre) || null;
  }
  if (!info) {
    // Fallback: buscar por nombre normalizado
    const testNormalized = testNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    info = Object.values(FMS_INFO).find((item) => {
      const itemNormalized = item.titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return itemNormalized === testNormalized;
    }) || null;
  }

  const es = idioma === "es";

  const TABS: { id: TabActiva; label: string }[] = [
    { id: "descripcion", label: t("fms.descripcion") },
    { id: "instrucciones", label: t("fms.instrucciones") },
    { id: "criterios", label: t("fms.criterios") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {info?.titulo ?? testNombre}
            </h2>
            <p className="text-sm text-zinc-400">{t("fms.infoTest")}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-800 transition"
          >
            <span className="text-xl leading-none text-zinc-400">×</span>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {!info ? (
            <p className="text-zinc-400 text-sm">
              {t("fms.sinInfo")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabActiva(tab.id)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      tabActiva === tab.id
                        ? "border-white bg-white text-zinc-950"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="min-h-[240px]">
                {tabActiva === "descripcion" && (
                  <section>
                    <h3 className="font-semibold text-white mb-2">{t("fms.descripcion")}</h3>
                    <p className="text-zinc-300 text-sm leading-6">
                      {(es ? info.descripcion : info.descripcion_en) || t("fms.descripcionPendiente")}
                    </p>
                  </section>
                )}

                {tabActiva === "instrucciones" && (
                  <section>
                    <h3 className="font-semibold text-white mb-2">
                      {tipo === "profesor" ? t("fms.instruccionesProfesor") : t("fms.instrucciones")}
                    </h3>

                    {(tipo === "profesor"
                      ? (es ? info.instruccionesProfesor : info.instruccionesProfesor_en)
                      : (es ? info.instruccionesAlumno : info.instruccionesAlumno_en)
                    ).length === 0 ? (
                      <p className="text-zinc-500 text-sm">{t("fms.instruccionesPendientes")}</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-zinc-300">
                        {(tipo === "profesor"
                          ? (es ? info.instruccionesProfesor : info.instruccionesProfesor_en)
                          : (es ? info.instruccionesAlumno : info.instruccionesAlumno_en)
                        ).map((item, index) => (
                          <li
                            key={index}
                            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                          >
                            {index + 1}. {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {tabActiva === "criterios" && (
                  <section>
                    <h3 className="font-semibold text-white mb-3">{t("fms.criterios")}</h3>
                    <div className="space-y-2 text-sm">
                      {([3, 2, 1, 0] as const).map((puntaje) => {
                        const estilos = {
                          3: { card: "border-green-700 bg-green-900/20", titulo: "text-green-300" },
                          2: { card: "border-yellow-700 bg-yellow-900/20", titulo: "text-yellow-300" },
                          1: { card: "border-orange-700 bg-orange-900/20", titulo: "text-orange-300" },
                          0: { card: "border-red-700 bg-red-900/20", titulo: "text-red-300" },
                        }[puntaje];

                        return (
                          <div key={puntaje} className={`rounded-lg border px-3 py-2 ${estilos.card}`}>
                            <p className={`font-semibold ${estilos.titulo}`}>
                              {puntaje} {t("fms.puntos")}
                            </p>
                            <p className="text-zinc-300 mt-1">
                              {(es ? info.criterios[puntaje] : info.criterios_en[puntaje]) || t("fms.criterioPendiente")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}