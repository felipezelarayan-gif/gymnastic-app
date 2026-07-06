// =============================================================================
//  FMS — Functional Movement Screen
//  Datos de los 7 movimientos fundamentales (Gray Cook)
// =============================================================================

export type FMSInfo = {
  id: string;
  titulo: string;
  bilateral: boolean;
  descripcion: string;
  instruccionesProfesor: string[];
  instruccionesAlumno: string[];
  criterios: {
    3: string;
    2: string;
    1: string;
    0: string;
  };
  imagenes: string[];
};

export const FMS_INFO: Record<string, FMSInfo> = {

  // ─── 1. SENTADILLA PROFUNDA ───────────────────────────────────────────────

  "Sentadilla profunda": {
    id: "deep-squat",
    titulo: "Sentadilla profunda",
    bilateral: false,
    descripcion:
      "Evalúa la movilidad bilateral y simétrica de caderas, rodillas y " +
      "tobillos, así como la movilidad del raquis torácico y los hombros. " +
      "Refleja la capacidad del cuerpo de realizar un patrón de sentadilla " +
      "profunda con control y simetría.",
    instruccionesProfesor: [
      "Posicionar al alumno de pie, con los pies a la anchura de los hombros y paralelos entre sí.",
      "Indicarle que sostenga el palo por encima de la cabeza con los codos a 90°, luego que extienda los brazos completamente hacia arriba.",
      "Pedirle que realice una sentadilla lo más profunda posible manteniendo los talones apoyados y el palo alineado sobre los pies.",
      "Observar la alineación de rodillas, la posición del tronco respecto a las tibias, la profundidad del fémur y si hay elevación de talones.",
      "Permitir hasta tres intentos. Si no alcanza puntuación 3, colocar una tabla de 2×6 bajo los talones y repetir.",
      "Registrar dolor con 0 si aparece en cualquier momento del test.",
    ],
    instruccionesAlumno: [
      "Párate con los pies al ancho de los hombros y paralelos.",
      "Sostén el palo con los brazos extendidos completamente por encima de la cabeza.",
      "Bajá lo más profundo que puedas en la sentadilla sin levantar los talones del piso.",
      "Intentá mantener el tronco lo más erguido posible y las rodillas alineadas con los pies.",
      "Realizá el movimiento de forma lenta y controlada.",
    ],
    criterios: {
      3: "El tronco superior es paralelo a las tibias o más vertical. Los fémures están por debajo de la horizontal. Las rodillas alineadas sobre los pies. El palo alineado sobre los pies. Sin elevación de talones.",
      2: "Se logra la posición solo con los talones elevados sobre una tabla. El tronco superior es paralelo a las tibias o más vertical, fémures por debajo de la horizontal y rodillas sobre los pies.",
      1: "Con o sin tabla, el tronco superior no es paralelo a las tibias, los fémures no descienden por debajo de la horizontal, o las rodillas no se mantienen alineadas sobre los pies. Puede haber flexión lumbar evidente.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    imagenes: [],
  },

  // ─── 2. PASO DE VALLA ─────────────────────────────────────────────────────

  "Paso de valla": {
    id: "hurdle-step",
    titulo: "Paso de valla",
    bilateral: true,
    descripcion:
      "Evalúa la mecánica del paso y la estabilidad del cuerpo durante el " +
      "movimiento unilateral. Desafía la movilidad y estabilidad de caderas, " +
      "rodillas y tobillos, así como el control motor y la estabilidad del " +
      "core mientras se genera un patrón de zancada.",
    instruccionesProfesor: [
      "Medir la altura tibial del alumno y ajustar la cuerda o valla a esa altura.",
      "Colocar al alumno de pie con los pies juntos y los dedos tocando la base de la valla, sosteniendo el palo detrás del cuello sobre los hombros.",
      "Indicarle que eleve una rodilla para pasar el pie por encima de la valla y lo apoye en el suelo del otro lado, manteniendo el pie en flexión dorsal.",
      "Observar la alineación de cadera, rodilla y pie de ambas piernas, y la estabilidad del tronco.",
      "Evaluar ambos lados. Anotar el puntaje del lado más bajo.",
      "Registrar dolor con 0 si aparece en cualquier momento del test.",
    ],
    instruccionesAlumno: [
      "Párate con los pies juntos y los dedos tocando la base de la valla.",
      "Sostén el palo apoyado sobre los hombros detrás de la nuca.",
      "Levantá una rodilla y pasá el pie por encima de la valla, apoyándolo del otro lado.",
      "Volvé a la posición inicial de forma controlada y repetí del otro lado.",
      "Intentá no inclinar el tronco ni mover la cadera de la pierna de apoyo.",
    ],
    criterios: {
      3: "Las caderas, rodillas y tobillos permanecen alineados en el plano sagital. La columna lumbar muestra mínimo movimiento. El palo permanece paralelo al suelo. No hay contacto entre el pie y la valla.",
      2: "Se produce alineación deficiente entre cadera, rodilla y tobillo. El palo y la valla pierden paralelismo. Puede haber movimiento lumbar visible.",
      1: "Se produce contacto entre el pie y la valla. Pérdida de equilibrio evidente.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    imagenes: [],
  },

  // ─── 3. ESTOCADA EN LÍNEA ─────────────────────────────────────────────────

  "Estocada en linea": {
    id: "inline-lunge",
    titulo: "Estocada en línea",
    bilateral: true,
    descripcion:
      "Evalúa la estabilidad del tronco, la movilidad y estabilidad de " +
      "caderas, la flexibilidad de cuádriceps y la estabilidad de tobillo y " +
      "rodilla bajo una posición de zancada en línea. También refleja el " +
      "control de la rotación y la deceleración.",
    instruccionesProfesor: [
      "Medir la longitud tibial del alumno. Marcar esa distancia en el suelo como punto de referencia.",
      "Colocar al alumno con el talón trasero en el punto cero y el pie delantero en la marca, en línea recta.",
      "El palo se sostiene vertical detrás de la espalda: una mano detrás de la nuca y la otra en la zona lumbar.",
      "Indicarle que baje la rodilla trasera hasta tocar el suelo detrás del talón del pie delantero.",
      "Observar que el palo permanezca vertical y sin contacto lateral, y que la rodilla delantera no colapse hacia adentro.",
      "Evaluar ambos lados. Anotar el puntaje del lado más bajo.",
    ],
    instruccionesAlumno: [
      "Ubicate con los pies en línea, uno adelante y el otro atrás, separados por la distancia de tu tibia.",
      "Sosté el palo vertical detrás de la espalda con una mano arriba y otra abajo.",
      "Bajá la rodilla trasera hasta que casi toque el suelo, detrás del talón del pie de adelante.",
      "Volvé a la posición inicial de forma controlada y repetí del otro lado.",
      "Intentá no mover el tronco ni que la rodilla delantera se vaya hacia adentro.",
    ],
    criterios: {
      3: "El palo permanece vertical y en contacto con la cabeza, la columna torácica y el sacro. No hay movimiento lateral del tronco. La rodilla toca el suelo detrás del talón delantero. El pie y la rodilla delanteros permanecen alineados.",
      2: "Pérdida de contacto del palo con alguna de las tres referencias corporales. Movimiento lateral del tronco visible. Inestabilidad o desalineación de la rodilla delantera.",
      1: "Se pierde el equilibrio durante la ejecución del movimiento.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    imagenes: [],
  },

  // ─── 4. MOVILIDAD DE HOMBRO ───────────────────────────────────────────────

  "Movilidad de hombro": {
    id: "shoulder-mobility",
    titulo: "Movilidad de hombro",
    bilateral: true,
    descripcion:
      "Evalúa la amplitud de movimiento bilateral de los hombros combinando " +
      "rotación interna con aducción de un lado y rotación externa con " +
      "abducción del otro. También refleja la movilidad de la escápula y la " +
      "extensión torácica.",
    instruccionesProfesor: [
      "Medir la longitud de la mano del alumno (desde la muñeca hasta la punta del dedo medio) como unidad de referencia.",
      "Indicarle que cierre ambos puños con el pulgar hacia adentro.",
      "Pedirle que en un solo movimiento lleve un brazo por encima del hombro y el otro por detrás de la espalda hacia arriba, acercando los puños lo máximo posible.",
      "Medir la distancia entre los nudillos de ambos puños.",
      "Realizar un clearing test (mano palma contra hombro opuesto, elevación del codo): si hay dolor, puntaje 0.",
      "Evaluar ambos lados y anotar el puntaje del lado más bajo.",
    ],
    instruccionesAlumno: [
      "Cerrá los puños con el pulgar hacia adentro.",
      "En un solo movimiento, llevá un brazo por encima del hombro y el otro por detrás de la espalda.",
      "Intentá acercar los puños lo máximo posible sin mover el tronco.",
      "Mantené la posición un momento para que el profesor pueda medir.",
      "Repetí del otro lado.",
    ],
    criterios: {
      3: "Los puños quedan a menos de una longitud de mano de distancia entre sí.",
      2: "Los puños quedan a entre una y una y media longitud de mano de distancia.",
      1: "Los puños quedan a más de una y media longitud de mano de distancia.",
      0: "Se registra dolor en el clearing test o durante la ejecución del movimiento.",
    },
    imagenes: [],
  },

  // ─── 5. ELEVACIÓN ACTIVA DE PIERNA ───────────────────────────────────────

  "Elevacion activa de pierna": {
    id: "active-straight-leg-raise",
    titulo: "Elevación activa de pierna",
    bilateral: true,
    descripcion:
      "Evalúa la flexibilidad funcional activa del isquiotibial y la " +
      "capacidad de disociar la pierna inferior mientras se mantiene una " +
      "posición pélvica y core estables. También refleja la extensión " +
      "disponible de la cadera contralateral.",
    instruccionesProfesor: [
      "Acostar al alumno en decúbito supino con los brazos a los lados y las palmas hacia arriba.",
      "Colocar el palo verticalmente en el punto medio entre la espina ilíaca anterosuperior y la línea articular de la rodilla.",
      "Pedirle que eleve una pierna activamente, con el tobillo en dorsiflexión y la rodilla extendida, tan alto como pueda.",
      "La pierna que queda en el suelo debe permanecer en contacto con el suelo y sin rotar.",
      "Evaluar dónde queda el maléolo interno de la pierna elevada respecto al palo: por encima de la referencia, a la altura, o por debajo.",
      "Evaluar ambos lados y anotar el puntaje del lado más bajo.",
    ],
    instruccionesAlumno: [
      "Acostáte boca arriba con los brazos a los costados y las palmas hacia arriba.",
      "Sin doblar la rodilla ni rotar la cadera, elevá una pierna lo más alto que puedas.",
      "Mantené el tobillo en punta hacia la espinilla (dorsiflexión) y la pierna bien recta.",
      "La pierna que queda en el suelo debe permanecer quieta y sin rotar.",
      "Mantené la posición un momento y luego bajá con control.",
    ],
    criterios: {
      3: "El maléolo interno de la pierna elevada pasa más allá del punto de referencia (hacia el muslo). La pierna contraria permanece en posición neutra.",
      2: "El maléolo interno queda a la altura del punto de referencia (zona media del muslo). La pierna contraria permanece en posición neutra.",
      1: "El maléolo interno no alcanza el punto de referencia (zona de la rodilla). Puede haber rotación o elevación de la pierna contraria.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    imagenes: [],
  },

  // ─── 6. ESTABILIDAD DE TRONCO ─────────────────────────────────────────────

  "Estabilidad de tronco": {
    id: "trunk-stability-push-up",
    titulo: "Estabilidad de tronco",
    bilateral: false,
    descripcion:
      "Evalúa la capacidad del tronco de estabilizarse en el plano sagital " +
      "durante un movimiento de empuje simétrico de miembros superiores. " +
      "Refleja el control reflejo del core para proteger la columna ante " +
      "fuerzas de extensión.",
    instruccionesProfesor: [
      "Colocar al alumno en posición prona con los pulgares alineados con la parte superior de la frente (hombres) o el mentón (mujeres).",
      "Los codos deben estar totalmente extendidos y los pies en posición neutra.",
      "Indicarle que realice una flexión de brazos completa manteniendo el cuerpo como una tabla rígida, sin que la columna lumbar se extienda primero.",
      "Si no puede, reposicionar con los pulgares a la altura del mentón (hombres) o las clavículas (mujeres) y repetir.",
      "Realizar un clearing test (press-up en extensión de tronco): si hay dolor, puntaje 0.",
      "Observar si hay separación de las rodillas o extensión lumbar previa al movimiento.",
    ],
    instruccionesAlumno: [
      "Acostáte boca abajo con los pulgares a la altura de la frente (o el mentón si el profesor lo indica).",
      "Realizá una flexión de brazos levantando todo el cuerpo como una tabla, de una sola pieza.",
      "No dejes que la cadera suba o baje antes que el tronco.",
      "Bajá de forma controlada y repetí si se indica.",
    ],
    criterios: {
      3: "Hombres: realiza una flexión correcta con los pulgares a la altura de la frente. Mujeres: realiza una flexión correcta con los pulgares a la altura del mentón. El cuerpo se mueve como una unidad sin extensión lumbar previa.",
      2: "Hombres: logra la flexión solo con los pulgares a la altura del mentón. Mujeres: logra la flexión solo con los pulgares a la altura de las clavículas.",
      1: "No puede realizar la flexión en ninguna de las posiciones descriptas.",
      0: "Se registra dolor en el clearing test de extensión o durante la ejecución del movimiento.",
    },
    imagenes: [],
  },

  // ─── 7. ESTABILIDAD ROTATORIA ─────────────────────────────────────────────

  "Estabilidad rotatoria": {
    id: "rotary-stability",
    titulo: "Estabilidad rotatoria",
    bilateral: true,
    descripcion:
      "Evalúa la estabilidad multiplanar del tronco durante un movimiento " +
      "combinado de miembros superiores e inferiores ipsilaterales. " +
      "Refleja la coordinación neuromuscular y la capacidad de transferir " +
      "energía de manera eficiente a través del tronco.",
    instruccionesProfesor: [
      "Colocar al alumno en posición de cuadrupedia (manos bajo hombros, rodillas bajo caderas), con el palo sobre la columna tocando cabeza, columna torácica y sacro.",
      "Indicarle que extienda simultáneamente el brazo y la pierna del mismo lado (ipsilateral) hasta quedar alineados con el tronco.",
      "Luego pedirle que lleve el codo y la rodilla del mismo lado hasta que se toquen debajo del tronco.",
      "Si no puede realizarlo de forma ipsilateral, repetir el intento de forma contralateral (brazo derecho + pierna izquierda).",
      "Realizar un clearing test (posición de child's pose): si hay dolor, puntaje 0.",
      "Evaluar ambos lados y anotar el puntaje del lado más bajo.",
    ],
    instruccionesAlumno: [
      "Ubicate en cuatro apoyos (manos y rodillas), con la espalda plana.",
      "Extendé el brazo y la pierna del mismo lado al mismo tiempo hasta que queden paralelos al suelo.",
      "Luego acercá el codo y la rodilla del mismo lado hasta que se toquen debajo de la panza.",
      "Realizá el movimiento de forma lenta y sin perder el equilibrio ni rotar el tronco.",
      "Repetí del otro lado.",
    ],
    criterios: {
      3: "Realiza correctamente la extensión y el toque ipsilateral (mismo lado) sin que el palo pierda contacto con los tres puntos de referencia. El tronco no rota ni pierde estabilidad.",
      2: "No puede realizar el movimiento ipsilateral pero sí el contralateral (brazo derecho con pierna izquierda) de forma correcta.",
      1: "No puede realizar el movimiento ni en forma ipsilateral ni contralateral de manera correcta.",
      0: "Se registra dolor en el clearing test de flexión o durante la ejecución del movimiento.",
    },
    imagenes: [],
  },
};
