"use client";

/* eslint-disable react-hooks/set-state-in-effect -- el reset del formulario al abrir/cerrar el modal es intencional */

import { useEffect, useState } from "react";
import RutinaEjercicioModal from "@/components/rutinas/RutinaEjercicioModal";
import SelectorTiempo from "@/components/ui/SelectorTiempo";
import { campoBilingue } from "@/lib/utils/campoBilingue";
import { useIdioma } from "@/lib/i18n-context";

// ─────────────────────────────────────────────────────────────
// Tipos exportados (reutilizados por la página de rutina)
// ─────────────────────────────────────────────────────────────

export type TipoPrescripcion = "repeticiones" | "tiempo";
export type TipoConfiguracionSeries = "simple" | "avanzado";
export type ModoRutina = "ejercicio" | "amrap" | "circuito";
export type TipoTiempoCircuito = "descanso_entre_rondas" | "duracion_ronda";
export type TipoCarga = "peso_fijo" | "porcentaje_rm" | "peso_corporal";

export type EjercicioBanco = {
  id: string;
  nombre: string;
  nombre_es?: string | null;
  nombre_en?: string | null;
};

export type AmrapEjercicioFormulario = {
  _localId: string;
  ejercicioId: string;
  tipoPrescripcion: TipoPrescripcion;
  repeticiones: string;
  duracion: string;
  tipoCarga: TipoCarga;
  valorCarga: string;
};

// Datos normalizados que el modal devuelve al guardar
export type EjercicioFormData = {
  modo: ModoRutina;
  ejercicio_id: string | null;
  series: number | null;
  tipo_prescripcion: TipoPrescripcion | null;
  repeticiones: string;
  duracion: string;
  peso: string;
  porcentaje_rm: string;
  rir: string;
  descanso: string;
  observaciones: string;
  tipo_configuracion: TipoConfiguracionSeries;
  tiempo_limite: string | null;
  rondas_objetivo: number | null;
  descanso_entre_rondas: string | null;
  tipo_tiempo_circuito: TipoTiempoCircuito | null;
  duracion_ronda: string | null;
  bloque: AmrapEjercicioFormulario[];
};

// Datos de un ejercicio existente para modo edición
export type EjercicioParaEditar = {
  _localId: string;
  ejercicio_id?: string | null;
  nombre_ejercicio?: string | null;
  series?: number | null;
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
  peso?: string | null;
  porcentaje_rm?: string | null;
  rir?: string | null;
  descanso?: string | null;
  observaciones?: string | null;
  tipo_configuracion?: string | null;
  modo?: string | null;
  tiempo_limite?: string | null;
  rondas_objetivo?: number | null;
  descanso_entre_rondas?: string | null;
  tipo_tiempo_circuito?: string | null;
  duracion_ronda?: string | null;
  tipo_carga?: string | null;
  bloque_id?: string | null;
  bloque_orden?: number | null;
};

export type DestinoEjercicio = "entrada" | "principal";

type AgregarEjercicioModalProps = {
  open: boolean;
  destino: DestinoEjercicio;
  editando?: EjercicioParaEditar | null;
  bloqueExistente?: EjercicioParaEditar[];
  seriesExistentes?: Array<
    EjercicioParaEditar & {
      numero_serie?: number;
    }
  >;
  ejercicios: EjercicioBanco[];
  onCerrar: () => void;
  onCrearEjercicio: () => void;
  onVerHistorial: (ejercicioId: string) => void;
  onGuardar: (datos: EjercicioFormData) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const porcentajesRM = Array.from({ length: 21 }, (_, index) => index * 5);
const opcionesRIR = Array.from({ length: 6 }, (_, index) => index);
const opcionesSeries = ["1", "2", "3", "4", "5", "custom"];

function tiempoEnSegundos(valor: string) {
  const coincidencia = valor.trim().match(/^(?:(\d+)'\s*)?(?:(\d+)'')?$/);
  if (!coincidencia) return 0;
  return Number(coincidencia[1] || 0) * 60 + Number(coincidencia[2] || 0);
}

function formatearTiempoCorto(segundosTotales: number) {
  const minutos = Math.floor(segundosTotales / 60);
  const segundos = segundosTotales % 60;
  if (minutos === 0) return `${segundos}''`;
  if (segundos === 0) return `${minutos}'`;
  return `${minutos}'${String(segundos).padStart(2, "0")}''`;
}

function crearSeriesAvanzadasDefault(cantidad: number) {
  return Array.from({ length: Math.max(cantidad, 0) }, (_, index) => ({
    _localId: crypto.randomUUID(),
    numero_serie: index + 1,
    tipo_prescripcion: "repeticiones" as TipoPrescripcion,
    repeticiones: "",
    duracion: "",
    peso: "",
    porcentaje_rm: "",
    tipo_carga: "peso_fijo" as TipoCarga,
  }));
}

function nuevoAmrapEjercicio(): AmrapEjercicioFormulario {
  return {
    _localId: crypto.randomUUID(),
    ejercicioId: "",
    tipoPrescripcion: "repeticiones",
    repeticiones: "",
    duracion: "",
    tipoCarga: "peso_corporal",
    valorCarga: "",
  };
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function AgregarEjercicioModal({
  open,
  destino,
  editando = null,
  bloqueExistente = [],
  seriesExistentes = [],
  ejercicios,
  onCerrar,
  onCrearEjercicio,
  onVerHistorial,
  onGuardar,
  t,
}: AgregarEjercicioModalProps) {
  const { idioma } = useIdioma();

  // Estado del formulario
  const [ejercicioId, setEjercicioId] = useState("");
  const [series, setSeries] = useState("3");
  const [seriesCustom, setSeriesCustom] = useState("");
  const [tipoConfiguracionSeries, setTipoConfiguracionSeries] = useState<TipoConfiguracionSeries | null>(null);
  const [modoRutina, setModoRutina] = useState<ModoRutina>("ejercicio");
  const [tiempoLimite, setTiempoLimite] = useState("");
  const [rondasObjetivo, setRondasObjetivo] = useState("");
  const [descansoEntreRondas, setDescansoEntreRondas] = useState("");
  const [tipoTiempoCircuito, setTipoTiempoCircuito] = useState<TipoTiempoCircuito>("descanso_entre_rondas");
  const [duracionRonda, setDuracionRonda] = useState("");
  const [amrapEjercicios, setAmrapEjercicios] = useState<AmrapEjercicioFormulario[]>([]);
  const [seriesAvanzadas, setSeriesAvanzadas] = useState(crearSeriesAvanzadasDefault(3));
  const [rir, setRir] = useState("");
  const [descanso, setDescanso] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Cargar datos al abrir (nuevo o edición)
  useEffect(() => {
    if (!open) return;

    if (editando) {
      const esModoBloque = editando.modo === "amrap" || editando.modo === "circuito";
      const itemsBloque: EjercicioParaEditar[] =
        esModoBloque && bloqueExistente.length > 0 ? bloqueExistente : [editando];

      setModoRutina((editando.modo as ModoRutina) || "ejercicio");
      setTiempoLimite(editando.tiempo_limite || "");
      setRondasObjetivo(editando.rondas_objetivo ? String(editando.rondas_objetivo) : "");
       
      setDescansoEntreRondas(editando.descanso_entre_rondas || "");
      setTipoTiempoCircuito((editando.tipo_tiempo_circuito as TipoTiempoCircuito) || "descanso_entre_rondas");
      setDuracionRonda(editando.duracion_ronda || "");
      setObservaciones(editando.observaciones || "");
      setRir(editando.rir || "");
      setDescanso(editando.descanso || "");

      if (esModoBloque) {
        setAmrapEjercicios(
          itemsBloque.map((ejercicio) => ({
            _localId: crypto.randomUUID(),
            ejercicioId: ejercicio.ejercicio_id || "",
            tipoPrescripcion: ejercicio.tipo_prescripcion === "tiempo" ? "tiempo" : "repeticiones",
            repeticiones: ejercicio.repeticiones || "",
            duracion: ejercicio.duracion || "",
            tipoCarga:
              ejercicio.porcentaje_rm === "0"
                ? "peso_corporal"
                : ejercicio.porcentaje_rm
                  ? "porcentaje_rm"
                  : "peso_fijo",
            valorCarga:
              ejercicio.porcentaje_rm && ejercicio.porcentaje_rm !== "0"
                ? ejercicio.porcentaje_rm
                : ejercicio.peso || "",
          }))
        );
        setEjercicioId(itemsBloque[0]?.ejercicio_id || "");
      } else {
        setEjercicioId(editando.ejercicio_id || "");

        const cantidadSeries = editando.series || 1;
        if (cantidadSeries > 5) {
          setSeries("custom");
          setSeriesCustom(String(cantidadSeries));
        } else {
          setSeries(String(cantidadSeries));
          setSeriesCustom("");
        }

        const tipoConfig = editando.tipo_configuracion === "avanzado" ? "avanzado" : "simple";
        setTipoConfiguracionSeries(tipoConfig);

        const base = crearSeriesAvanzadasDefault(cantidadSeries);
        if (tipoConfig === "avanzado" && seriesExistentes.length > 0) {
          setSeriesAvanzadas(
            base.map((serie) => {
              const existente = seriesExistentes.find((s) => s.numero_serie === serie.numero_serie);
              if (!existente) return serie;
              return {
                ...serie,
                tipo_prescripcion: (existente.tipo_prescripcion as TipoPrescripcion) || "repeticiones",
                repeticiones: existente.repeticiones || "",
                duracion: existente.duracion || "",
                peso: existente.peso || "",
                porcentaje_rm: existente.porcentaje_rm || "",
                tipo_carga:
                  (existente.tipo_carga as TipoCarga) ||
                  (existente.porcentaje_rm === "0"
                    ? "peso_corporal"
                    : existente.porcentaje_rm
                      ? "porcentaje_rm"
                      : "peso_fijo"),
              };
            })
          );
        } else {
          // Modo simple: precargar valores planos en la primera serie
          const tipoPrescripcion = (editando.tipo_prescripcion as TipoPrescripcion) || "repeticiones";
          setSeriesAvanzadas(
            base.map((serie, index) =>
              index === 0
                ? {
                    ...serie,
                    tipo_prescripcion: tipoPrescripcion,
                    repeticiones: editando.repeticiones || "",
                    duracion: editando.duracion || "",
                    peso: editando.peso || "",
                    porcentaje_rm: editando.porcentaje_rm || "",
                    tipo_carga:
                      editando.porcentaje_rm === "0"
                        ? ("peso_corporal" as TipoCarga)
                        : editando.porcentaje_rm
                          ? ("porcentaje_rm" as TipoCarga)
                          : ("peso_fijo" as TipoCarga),
                  }
                : serie
            )
          );
        }
      }
    } else {
      // Nuevo: entrada en calor empieza con 1 serie, principal con 3
      setEjercicioId("");
      setSeries(destino === "entrada" ? "1" : "3");
      setSeriesCustom("");
      setTipoConfiguracionSeries(null);
      setModoRutina("ejercicio");
      setTiempoLimite("");
      setRondasObjetivo("");
      setDescansoEntreRondas("");
      setTipoTiempoCircuito("descanso_entre_rondas");
      setDuracionRonda("");
      setAmrapEjercicios([]);
      setRir("");
      setDescanso("");
      setObservaciones("");
      setSeriesAvanzadas(crearSeriesAvanzadasDefault(destino === "entrada" ? 1 : 3));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // ── Handlers ──

  function cambiarModo(modo: ModoRutina) {
    setModoRutina(modo);
    if (modo === "amrap" && amrapEjercicios.length === 0) {
      setAmrapEjercicios([nuevoAmrapEjercicio()]);
    }
  }

  function actualizarAmrapItem(localId: string, cambios: Partial<AmrapEjercicioFormulario>) {
    setAmrapEjercicios((prev) =>
      prev.map((item) => (item._localId === localId ? { ...item, ...cambios } : item))
    );
  }

  function cantidadSeriesActual() {
    const seriesFinal = series === "custom" ? seriesCustom : series;
    const cantidad = Number(seriesFinal || 0);
    return Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0;
  }

  function actualizarCantidadSeries(nuevaCantidad: number) {
    if (!Number.isFinite(nuevaCantidad) || nuevaCantidad <= 0) {
      setSeriesAvanzadas([]);
      return;
    }
    setSeriesAvanzadas((actuales) =>
      Array.from({ length: nuevaCantidad }, (_, index) => {
        const numeroSerie = index + 1;
        const existente = actuales.find((serie) => serie.numero_serie === numeroSerie);
        return existente || {
          _localId: crypto.randomUUID(),
          numero_serie: numeroSerie,
          tipo_prescripcion: "repeticiones" as TipoPrescripcion,
          repeticiones: "",
          duracion: "",
          peso: "",
          porcentaje_rm: "",
          tipo_carga: "peso_fijo" as TipoCarga,
        };
      })
    );
  }

  function actualizarSerie(numeroSerie: number, campo: string, valor: string) {
    setSeriesAvanzadas((actuales) =>
      actuales.map((serie) => {
        if (serie.numero_serie !== numeroSerie) return serie;
        const actualizado = { ...serie, [campo]: valor };
        if (campo === "peso" && valor.trim()) {
          actualizado.porcentaje_rm = "";
        } else if (campo === "porcentaje_rm" && valor !== "") {
          actualizado.peso = "";
        }
        return actualizado;
      })
    );
  }

  function actualizarSerieSimple(campo: string, valor: string) {
    setSeriesAvanzadas((actuales) =>
      actuales.map((serie) => {
        const actualizado = { ...serie, [campo]: valor };
        if (campo === "peso" && valor.trim()) {
          actualizado.porcentaje_rm = "";
        } else if (campo === "porcentaje_rm" && valor !== "") {
          actualizado.peso = "";
        }
        return actualizado;
      })
    );
  }

  function actualizarTipoCargaSerie(
    numeroSerie: number,
    tipoCarga: TipoCarga,
    simple: boolean
  ) {
    setSeriesAvanzadas((actuales) =>
      actuales.map((serie) => {
        if (!simple && serie.numero_serie !== numeroSerie) return serie;
        return {
          ...serie,
          tipo_carga: tipoCarga,
          peso: tipoCarga === "peso_corporal" || tipoCarga === "porcentaje_rm" ? "" : serie.peso || "",
          porcentaje_rm:
            tipoCarga === "peso_corporal"
              ? "0"
              : tipoCarga === "porcentaje_rm"
                ? serie.porcentaje_rm === "0"
                  ? ""
                  : serie.porcentaje_rm || ""
                : "",
        };
      })
    );
  }

  function seleccionarEjercicio(idSeleccionado: string) {
    if (idSeleccionado === "crear_nuevo") {
      onCrearEjercicio();
      return;
    }
    setEjercicioId(idSeleccionado);
  }

  function guardar() {
    const primeraSerie = seriesAvanzadas[0];

    if (modoRutina === "amrap" || modoRutina === "circuito") {
      const amrapInvalido = amrapEjercicios.some((item) => {
        const prescripcionInvalida =
          item.tipoPrescripcion === "tiempo"
            ? tiempoEnSegundos(item.duracion) <= 0
            : !Number.isInteger(Number(item.repeticiones)) || Number(item.repeticiones) <= 0;
        if (!item.ejercicioId || prescripcionInvalida) return true;
        return item.tipoCarga !== "peso_corporal" && (!item.valorCarga || Number(item.valorCarga) < 0);
      });

      if (amrapEjercicios.length === 0 || amrapInvalido) {
        alert(t("rutinas.errorBloqueInvalido"));
        return;
      }

      if (modoRutina === "amrap" && tiempoEnSegundos(tiempoLimite) <= 0) {
        alert(t("rutinas.errorTiempoAmrap"));
        return;
      }

      const rondas = Number(rondasObjetivo);
      if (modoRutina === "circuito") {
        if (!Number.isInteger(rondas) || rondas <= 0) {
          alert(t("rutinas.errorRondas"));
          return;
        }
        if (
          tipoTiempoCircuito === "descanso_entre_rondas"
            ? tiempoEnSegundos(descansoEntreRondas) <= 0
            : tiempoEnSegundos(duracionRonda) <= 0
        ) {
          alert(t("rutinas.errorDescansoCircuito"));
          return;
        }
      }

      onGuardar({
        modo: modoRutina,
        ejercicio_id: null,
        series: null,
        tipo_prescripcion: null,
        repeticiones: "",
        duracion: "",
        peso: "",
        porcentaje_rm: "",
        rir: "",
        descanso: "",
        observaciones,
        tipo_configuracion: "simple",
        tiempo_limite: modoRutina === "amrap" ? tiempoLimite : null,
        rondas_objetivo: Number.isInteger(rondas) && rondas > 0 ? rondas : null,
        descanso_entre_rondas:
          modoRutina === "circuito" && tipoTiempoCircuito === "descanso_entre_rondas"
            ? descansoEntreRondas
            : null,
        tipo_tiempo_circuito: modoRutina === "circuito" ? tipoTiempoCircuito : null,
        duracion_ronda:
          modoRutina === "circuito" && tipoTiempoCircuito === "duracion_ronda" ? duracionRonda : null,
        bloque: amrapEjercicios,
      });
      return;
    }

    // Modo ejercicio
    if (!ejercicioId) {
      alert(t("rutinas.errorSeleccionarEjercicio"));
      return;
    }

    if (!tipoConfiguracionSeries) {
      alert(t("rutinas.errorTipoSeries"));
      return;
    }

    const cantidadSeries = cantidadSeriesActual();
    if (!Number.isInteger(cantidadSeries) || cantidadSeries <= 0) {
      alert(t("rutinas.errorSeries"));
      return;
    }

    const prescripcionFinal = primeraSerie?.tipo_prescripcion || "repeticiones";

    onGuardar({
      modo: "ejercicio",
      ejercicio_id: ejercicioId,
      series: cantidadSeries,
      tipo_prescripcion: prescripcionFinal,
      repeticiones: prescripcionFinal !== "tiempo" ? primeraSerie?.repeticiones || "" : "",
      duracion: prescripcionFinal === "tiempo" ? primeraSerie?.duracion || "" : "",
      peso: tipoConfiguracionSeries === "simple" ? primeraSerie?.peso || "" : "",
      porcentaje_rm: tipoConfiguracionSeries === "simple" ? primeraSerie?.porcentaje_rm || "" : "",
      rir,
      descanso,
      observaciones,
      tipo_configuracion: tipoConfiguracionSeries,
      tiempo_limite: null,
      rondas_objetivo: null,
      descanso_entre_rondas: null,
      tipo_tiempo_circuito: null,
      duracion_ronda: null,
      bloque: [],
      _seriesAvanzadas: [...seriesAvanzadas],
    } as EjercicioFormData & { _seriesAvanzadas?: typeof seriesAvanzadas });
  }

  // ── Render ──

  return (
    <RutinaEjercicioModal
      open={open}
      title={
        editando
          ? t("rutinas.editarEjercicioTitulo")
          : t("rutinas.agregarEjercicioTitulo")
      }
      onClose={onCerrar}
      onSave={guardar}
      cancelLabel={t("rutinas.cancelar")}
      saveLabel={t("rutinas.guardar")}
      savingLabel={t("rutinas.guardando")}
    >
      <div className="space-y-2">
          <>
            {/* Formulario completo de ejercicio principal */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-800 p-1">
              {(["ejercicio", "amrap", "circuito"] as ModoRutina[]).map((modo) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => cambiarModo(modo)}
                  className={`h-11 rounded-lg text-[0.9rem] font-semibold capitalize transition ${
                    modoRutina === modo
                      ? "bg-emerald-500 text-white"
                      : "text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {modo === "ejercicio" ? t("rutinas.modoEjercicio") : modo === "amrap" ? t("rutinas.modoAmrap") : t("rutinas.modoCircuito")}
                </button>
              ))}
            </div>

            <p className="text-[0.825rem] text-zinc-500">
              {modoRutina === "ejercicio"
                ? t("rutinas.ayudaEjercicio")
                : modoRutina === "amrap"
                  ? t("rutinas.ayudaAmrap")
                  : t("rutinas.ayudaCircuito")}
            </p>

            {modoRutina === "amrap" || modoRutina === "circuito" ? (
              <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
                <p className="text-[0.825rem] font-semibold text-zinc-300">{t("rutinas.ejerciciosBloque")}</p>

                {amrapEjercicios.map((item, index) => (
                  <div key={item._localId} className="space-y-2 rounded-xl bg-zinc-950/50 p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[0.825rem] text-zinc-500">{index + 1}.</span>
                      <select
                        value={item.ejercicioId}
                        onChange={(e) => {
                          if (e.target.value === "crear_nuevo") {
                            onCrearEjercicio();
                            return;
                          }
                          actualizarAmrapItem(item._localId, { ejercicioId: e.target.value });
                        }}
                        className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-800 px-3 text-[0.825rem]"
                      >
                        <option value="">{t("rutinas.seleccionarEjercicio")}</option>
                        {ejercicios.map((ejercicio) => (
                          <option key={ejercicio.id} value={ejercicio.id}>
                            {campoBilingue(ejercicio, "nombre", idioma)}
                          </option>
                        ))}
                        <option value="crear_nuevo">{t("rutinas.crearNuevo")}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setAmrapEjercicios((prev) => prev.filter((actual) => actual._localId !== item._localId))}
                        disabled={amrapEjercicios.length === 1}
                        className="h-10 rounded-xl border border-red-800 px-3 text-[0.825rem] text-red-300 disabled:opacity-40"
                      >
                        ×
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pl-7">
                      <select
                        value={item.tipoPrescripcion}
                        onChange={(e) =>
                          actualizarAmrapItem(item._localId, {
                            tipoPrescripcion: e.target.value as TipoPrescripcion,
                            repeticiones: "",
                            duracion: "",
                          })
                        }
                        className="h-10 rounded-xl bg-zinc-800 px-2 text-[0.825rem]"
                      >
                        <option value="repeticiones">{t("rutinas.repsShort")}</option>
                        <option value="tiempo">{t("rutinas.duracion")}</option>
                      </select>
                      {item.tipoPrescripcion === "tiempo" ? (
                        <input
                          type="text"
                          value={item.duracion}
                          onChange={(e) => actualizarAmrapItem(item._localId, { duracion: e.target.value })}
                          placeholder="10''"
                          className="h-10 rounded-xl bg-zinc-800 px-3 text-[0.825rem]"
                        />
                      ) : (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.repeticiones}
                          onChange={(e) => actualizarAmrapItem(item._localId, { repeticiones: e.target.value })}
                          placeholder={t("rutinas.repsShort")}
                          className="h-10 rounded-xl bg-zinc-800 px-3 text-[0.825rem]"
                        />
                      )}
                      <select
                        value={item.tipoCarga}
                        onChange={(e) =>
                          actualizarAmrapItem(item._localId, {
                            tipoCarga: e.target.value as TipoCarga,
                            valorCarga: "",
                          })
                        }
                        className="h-10 rounded-xl bg-zinc-800 px-2 text-[0.825rem]"
                      >
                        <option value="peso_fijo">{t("rutinas.pesoFijo")}</option>
                        <option value="porcentaje_rm">%RM</option>
                        <option value="peso_corporal">{t("rutinas.pesoCorporal")}</option>
                      </select>
                      {item.tipoCarga === "peso_corporal" ? (
                        <div className="h-10 rounded-xl bg-zinc-800 px-3 text-[0.825rem] leading-10 text-zinc-400">{t("rutinas.corporal")}</div>
                      ) : item.tipoCarga === "porcentaje_rm" ? (
                        <select
                          value={item.valorCarga}
                          onChange={(e) => actualizarAmrapItem(item._localId, { valorCarga: e.target.value })}
                          className="h-10 min-w-0 w-full rounded-xl bg-zinc-800 px-2 text-[0.825rem]"
                        >
                          <option value="">%RM</option>
                          {porcentajesRM.filter((valor) => valor > 0).map((valor) => (
                            <option key={valor} value={String(valor)}>{valor}%</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={item.valorCarga}
                          onChange={(e) => actualizarAmrapItem(item._localId, { valorCarga: e.target.value })}
                          placeholder={item.tipoCarga === "peso_fijo" ? "kg" : "%"}
                          className="h-10 rounded-xl bg-zinc-800 px-3 text-[0.825rem]"
                        />
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setAmrapEjercicios((prev) => [...prev, nuevoAmrapEjercicio()])}
                  className="h-10 rounded-xl border border-zinc-700 px-3 text-[0.825rem] text-emerald-300 hover:bg-zinc-800"
                >
                  {t("rutinas.agregarEjercicio")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={ejercicioId}
                  onChange={(e) => seleccionarEjercicio(e.target.value)}
                  className="h-10 flex-1 bg-zinc-800 rounded-xl px-3 text-[0.825rem]"
                >
                  <option value="">{t("rutinas.seleccionarEjercicio")}</option>
                  {ejercicios.map((ejercicio) => (
                    <option key={ejercicio.id} value={ejercicio.id}>
                      {campoBilingue(ejercicio, "nombre", idioma)}
                    </option>
                  ))}
                  <option value="crear_nuevo">{t("rutinas.crearNuevo")}</option>
                </select>
                <button
                  type="button"
                  onClick={() => onVerHistorial(ejercicioId)}
                  disabled={!ejercicioId}
                  className="h-10 shrink-0 rounded-xl border border-blue-700 px-3 text-[0.825rem] text-blue-300 hover:bg-blue-950 disabled:opacity-50"
                >
                  {t("rutinas.historialCorto")}
                </button>
              </div>
            )}

            {(modoRutina === "amrap" || modoRutina === "circuito") && (
              <div className={modoRutina === "circuito" ? "grid min-w-0 grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
                {modoRutina === "amrap" && (
                  <SelectorTiempo
                    value={tiempoLimite}
                    onChange={setTiempoLimite}
                    label={t("rutinas.tiempoLimiteAmrap")}
                    maxMinutos={60}
                  />
                )}

                <div className={modoRutina === "circuito" ? "min-w-0 space-y-1 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3" : "space-y-1"}>
                  <label className="block text-[0.825rem] font-medium text-zinc-300">
                    {modoRutina === "amrap" ? t("rutinas.rondasObjetivoOpcional") : t("rutinas.rondasCircuito")}
                  </label>
                  <div className={modoRutina === "circuito" ? "pt-0" : "pt-[1.700rem]"}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={rondasObjetivo}
                      onChange={(e) => setRondasObjetivo(e.target.value)}
                      className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-3 text-[0.825rem]"
                      placeholder=""
                    />
                    {tipoTiempoCircuito === "duracion_ronda" && (
                      <p className="mt-2 text-[0.625rem] text-zinc-500">
                        {t("selectorTiempo.duracionTotal")}{" "}
                        <span className="font-semibold text-zinc-300">
                          {formatearTiempoCorto((Number(rondasObjetivo) || 0) * tiempoEnSegundos(duracionRonda))}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {modoRutina === "circuito" && (
                  <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-3 col-span-2">
                    <label className="block text-[0.825rem] font-medium text-zinc-300">
                      {t("rutinas.configuracionTiempoCircuito")}
                    </label>
                    <select
                      value={tipoTiempoCircuito}
                      onChange={(e) => setTipoTiempoCircuito(e.target.value as TipoTiempoCircuito)}
                      className="h-10 w-full rounded-xl bg-zinc-800 px-3 text-[0.825rem]"
                    >
                      <option value="descanso_entre_rondas">{t("rutinas.descansoEntreRondas")}</option>
                      <option value="duracion_ronda">{t("rutinas.duracionCadaRonda")}</option>
                    </select>

                    {tipoTiempoCircuito === "descanso_entre_rondas" ? (
                      <SelectorTiempo
                        value={descansoEntreRondas}
                        onChange={setDescansoEntreRondas}
                        label={t("rutinas.descansoEntreRondas")}
                        compacto
                      />
                    ) : (
                      <SelectorTiempo
                        value={duracionRonda}
                        onChange={setDuracionRonda}
                        label={t("rutinas.duracionCadaRonda")}
                        compacto
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {modoRutina === "ejercicio" && (
              <>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-800 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setTipoConfiguracionSeries(tipoConfiguracionSeries === "simple" ? null : "simple")
                    }
                    className={`h-11 rounded-lg text-[0.9rem] font-semibold transition ${
                      tipoConfiguracionSeries === "simple"
                        ? "bg-emerald-500 text-white"
                        : "text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {t("rutinas.seriesSimples")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (tipoConfiguracionSeries === "avanzado") {
                        setTipoConfiguracionSeries(null);
                      } else {
                        setTipoConfiguracionSeries("avanzado");
                        actualizarCantidadSeries(cantidadSeriesActual() || 1);
                      }
                    }}
                    className={`h-11 rounded-lg text-[0.9rem] font-semibold transition ${
                      tipoConfiguracionSeries === "avanzado"
                        ? "bg-emerald-500 text-white"
                        : "text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {t("rutinas.seriesAvanzadas")}
                  </button>
                </div>

                {tipoConfiguracionSeries && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center text-[0.825rem] font-medium text-zinc-300">
                      Selecciona la cantidad de series:
                    </label>
                    <select
                      value={series}
                      onChange={(e) => {
                        setSeries(e.target.value);
                        const nuevaCantidad = e.target.value === "custom" ? Number(seriesCustom || 0) : Number(e.target.value || 0);
                        actualizarCantidadSeries(nuevaCantidad);
                      }}
                      className="h-10 w-full bg-zinc-800 rounded-xl px-3 text-[0.825rem]"
                    >
                      <option value="">{t("rutinas.series")}</option>
                      {opcionesSeries.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion === "custom" ? t("rutinas.custom") : opcion}
                        </option>
                      ))}
                    </select>

                    {series === "custom" && (
                      <input
                        type="number"
                        value={seriesCustom}
                        onChange={(e) => {
                          setSeriesCustom(e.target.value);
                          actualizarCantidadSeries(Number(e.target.value || 0));
                        }}
                        className="h-10 w-full bg-zinc-800 rounded-xl px-3 text-[0.825rem]"
                        placeholder={t("rutinas.seriesCustom")}
                      />
                    )}
                  </div>
                )}

                {tipoConfiguracionSeries && (
                  <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
                    <p className="text-[0.825rem] leading-4 font-semibold text-zinc-300">
                      {tipoConfiguracionSeries === "simple" ? "Configurar series" : t("rutinas.configurarCadaSerie")}
                    </p>

                    <div className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.9fr)] gap-2 px-1 text-[0.825rem] leading-4 font-semibold text-zinc-500">
                      <span></span>
                      <span>{t("rutinas.prescripcion")}</span>
                      <span>
                        {(tipoConfiguracionSeries === "simple" && seriesAvanzadas[0]?.tipo_prescripcion === "tiempo")
                          ? t("rutinas.duracion")
                          : t("rutinas.repsShort")}
                      </span>
                      <span>{t("rutinas.tipoCarga")}</span>
                      <span>{t("rutinas.valorCarga")}</span>
                    </div>

                    {(tipoConfiguracionSeries === "simple" ? seriesAvanzadas.slice(0, 1) : seriesAvanzadas).map((serie) => (
                      <div key={serie._localId} className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.9fr)] gap-2 items-center">
                        <span className="text-[0.825rem] leading-4 text-zinc-400">
                          {tipoConfiguracionSeries === "simple" ? "Series" : `Serie ${serie.numero_serie}`}
                        </span>

                        <select
                          value={serie.tipo_prescripcion || "repeticiones"}
                          onChange={(e) =>
                            tipoConfiguracionSeries === "simple"
                              ? actualizarSerieSimple("tipo_prescripcion", e.target.value)
                              : actualizarSerie(serie.numero_serie, "tipo_prescripcion", e.target.value)
                          }
                          className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-2 text-[0.825rem] leading-4"
                        >
                          <option value="repeticiones">{t("rutinas.repsShort")}</option>
                          <option value="tiempo">{t("rutinas.duracion")}</option>
                        </select>

                        {serie.tipo_prescripcion === "tiempo" ? (
                          <input
                            type="text"
                            value={serie.duracion || ""}
                            onChange={(e) =>
                              tipoConfiguracionSeries === "simple"
                                ? actualizarSerieSimple("duracion", e.target.value)
                                : actualizarSerie(serie.numero_serie, "duracion", e.target.value)
                            }
                            className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-2 text-[0.825rem] leading-4"
                            placeholder="10''"
                          />
                        ) : (
                          <input
                            type="number"
                            value={serie.repeticiones || ""}
                            onChange={(e) =>
                              tipoConfiguracionSeries === "simple"
                                ? actualizarSerieSimple("repeticiones", e.target.value)
                                : actualizarSerie(serie.numero_serie, "repeticiones", e.target.value)
                            }
                            className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-2 text-[0.825rem]"
                            placeholder={t("rutinas.repsShort")}
                          />
                        )}

                        <select
                          value={serie.tipo_carga || (serie.porcentaje_rm === "0" ? "peso_corporal" : serie.porcentaje_rm ? "porcentaje_rm" : "peso_fijo")}
                          onChange={(e) =>
                            actualizarTipoCargaSerie(
                              serie.numero_serie,
                              e.target.value as TipoCarga,
                              tipoConfiguracionSeries === "simple"
                            )
                          }
                          className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-2 text-[0.825rem]"
                        >
                          <option value="peso_fijo">{t("rutinas.pesoFijo")}</option>
                          <option value="porcentaje_rm">%RM</option>
                          <option value="peso_corporal">{t("rutinas.pesoCorporal")}</option>
                        </select>

                        {serie.tipo_carga === "peso_corporal" || (!serie.tipo_carga && serie.porcentaje_rm === "0") ? (
                          <div className="h-10 min-w-0 rounded-xl bg-zinc-800 px-2 text-[0.825rem] leading-10 text-zinc-400 truncate">{t("rutinas.pesoCorporalShort")}</div>
                        ) : (serie.tipo_carga === "porcentaje_rm" || (!serie.tipo_carga && Boolean(serie.porcentaje_rm))) ? (
                          <select
                            value={serie.porcentaje_rm || ""}
                            onChange={(e) =>
                              tipoConfiguracionSeries === "simple"
                                ? actualizarSerieSimple("porcentaje_rm", e.target.value)
                                : actualizarSerie(serie.numero_serie, "porcentaje_rm", e.target.value)
                            }
                            className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-2 text-[0.825rem]"
                          >
                            <option value="">%RM</option>
                            {porcentajesRM.filter((valor) => valor > 0).map((valor) => (
                              <option key={valor} value={String(valor)}>{valor}%</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={serie.peso || ""}
                            onChange={(e) =>
                              tipoConfiguracionSeries === "simple"
                                ? actualizarSerieSimple("peso", e.target.value)
                                : actualizarSerie(serie.numero_serie, "peso", e.target.value)
                            }
                            className="h-10 min-w-0 w-full bg-zinc-800 rounded-xl px-2 text-[0.825rem]"
                            placeholder={t("rutinas.pesoShort")}
                          />
                        )}
                      </div>
                    ))}

                    <div className="pt-2">
                      <select
                        value={rir}
                        onChange={(e) => setRir(e.target.value)}
                        className="h-10 w-full bg-zinc-800 rounded-xl px-3 text-[0.825rem] leading-4"
                      >
                        <option value="">{t("rutinas.rirGeneral")}</option>
                        {opcionesRIR.map((valor) => (
                          <option key={valor} value={String(valor)}>
                            {valor}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-2">
                      <SelectorTiempo
                        value={descanso}
                        onChange={setDescanso}
                        label={t("rutinas.descansoGeneral")}
                        ultraCompacto
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 min-h-20 text-[0.825rem]"
              placeholder={t("rutinas.observaciones")}
            />
          </>
      </div>
    </RutinaEjercicioModal>
  );
}