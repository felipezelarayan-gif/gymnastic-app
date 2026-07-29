// =============================================================================
//  FMS — Functional Movement Screen
//  Datos de los 7 movimientos fundamentales (Gray Cook)
// =============================================================================

export type FMSInfo = {
  id: string;
  titulo: string;
  titulo_en: string;
  bilateral: boolean;
  descripcion: string;
  descripcion_en: string;
  instruccionesProfesor: string[];
  instruccionesProfesor_en: string[];
  instruccionesAlumno: string[];
  instruccionesAlumno_en: string[];
  criterios: {
    3: string;
    2: string;
    1: string;
    0: string;
  };
  criterios_en: {
    3: string;
    2: string;
    1: string;
    0: string;
  };
  imagenes: string[];
};

export const FMS_INFO: Record<string, FMSInfo> = {

  // ─── 1. DEEP SQUAT ────────────────────────────────────────────────────────

  "Sentadilla profunda": {
    id: "deep-squat",
    titulo: "Sentadilla profunda",
    titulo_en: "Deep squat",
    bilateral: false,
    descripcion:
      "Evalúa la movilidad bilateral y simétrica de caderas, rodillas y " +
      "tobillos, así como la movilidad del raquis torácico y los hombros. " +
      "Refleja la capacidad del cuerpo de realizar un patrón de sentadilla " +
      "profunda con control y simetría.",
    descripcion_en:
      "Assesses bilateral and symmetrical mobility of hips, knees and " +
      "ankles, as well as thoracic spine and shoulder mobility. " +
      "Reflects the body's ability to perform a deep squat pattern " +
      "with control and symmetry.",
    instruccionesProfesor: [
      "Posicionar al alumno de pie, con los pies a la anchura de los hombros y paralelos entre sí.",
      "Indicarle que sostenga el palo por encima de la cabeza con los codos a 90°, luego que extienda los brazos completamente hacia arriba.",
      "Pedirle que realice una sentadilla lo más profunda posible manteniendo los talones apoyados y el palo alineado sobre los pies.",
      "Observar la alineación de rodillas, la posición del tronco respecto a las tibias, la profundidad del fémur y si hay elevación de talones.",
      "Permitir hasta tres intentos. Si no alcanza puntuación 3, colocar una tabla de 2×6 bajo los talones y repetir.",
      "Registrar dolor con 0 si aparece en cualquier momento del test.",
    ],
    instruccionesProfesor_en: [
      "Position the member standing with feet shoulder-width apart and parallel.",
      "Instruct them to hold the dowel overhead with elbows at 90°, then fully extend arms upward.",
      "Ask them to perform a squat as deep as possible keeping heels down and the dowel aligned over the feet.",
      "Observe knee alignment, trunk position relative to the tibia, femur depth, and heel elevation.",
      "Allow up to three attempts. If score 3 is not achieved, place a 2×6 board under the heels and repeat.",
      "Record pain as 0 if it appears at any point during the test.",
    ],
    instruccionesAlumno: [
      "Párate con los pies al ancho de los hombros y paralelos.",
      "Sostén el palo con los brazos extendidos completamente por encima de la cabeza.",
      "Bajá lo más profundo que puedas en la sentadilla sin levantar los talones del piso.",
      "Intentá mantener el tronco lo más erguido posible y las rodillas alineadas con los pies.",
      "Realizá el movimiento de forma lenta y controlada.",
    ],
    instruccionesAlumno_en: [
      "Stand with your feet shoulder-width apart and parallel.",
      "Hold the dowel with your arms fully extended overhead.",
      "Squat as deep as you can without lifting your heels off the floor.",
      "Try to keep your torso as upright as possible and your knees aligned with your feet.",
      "Perform the movement slowly and with control.",
    ],
    criterios: {
      3: "El tronco superior es paralelo a las tibias o más vertical. Los fémures están por debajo de la horizontal. Las rodillas alineadas sobre los pies. El palo alineado sobre los pies. Sin elevación de talones.",
      2: "Se logra la posición solo con los talones elevados sobre una tabla. El tronco superior es paralelo a las tibias o más vertical, fémures por debajo de la horizontal y rodillas sobre los pies.",
      1: "Con o sin tabla, el tronco superior no es paralelo a las tibias, los fémures no descienden por debajo de la horizontal, o las rodillas no se mantienen alineadas sobre los pies. Puede haber flexión lumbar evidente.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Upper torso is parallel to the tibia or more vertical. Femurs below horizontal. Knees aligned over feet. Dowel aligned over feet. No heel elevation.",
      2: "Position achieved only with heels elevated on a board. Upper torso parallel to tibia or more vertical, femurs below horizontal, knees over feet.",
      1: "With or without board, upper torso is not parallel to tibia, femurs do not descend below horizontal, or knees are not aligned over feet. May have evident lumbar flexion.",
      0: "Pain is recorded anywhere in the body during the execution of the movement.",
    },
    imagenes: [],
  },

  // ─── 2. HURDLE STEP ──────────────────────────────────────────────────────

  "Paso de valla": {
    id: "hurdle-step",
    titulo: "Paso de valla",
    titulo_en: "Hurdle step",
    bilateral: true,
    descripcion:
      "Evalúa la mecánica del paso y la estabilidad del cuerpo durante el " +
      "movimiento unilateral. Desafía la movilidad y estabilidad de caderas, " +
      "rodillas y tobillos, así como el control motor y la estabilidad del " +
      "core mientras se genera un patrón de zancada.",
    descripcion_en:
      "Assesses stepping mechanics and body stability during " +
      "unilateral movement. Challenges hip, knee and ankle mobility " +
      "and stability, as well as motor control and core stability " +
      "while generating a stride pattern.",
    instruccionesProfesor: [
      "Medir la altura tibial del alumno y ajustar la cuerda o valla a esa altura.",
      "Colocar al alumno de pie con los pies juntos y los dedos tocando la base de la valla, sosteniendo el palo detrás del cuello sobre los hombros.",
      "Indicarle que eleve una rodilla para pasar el pie por encima de la valla y lo apoye en el suelo del otro lado, manteniendo el pie en flexión dorsal.",
      "Observar la alineación de cadera, rodilla y pie de ambas piernas, y la estabilidad del tronco.",
      "Evaluar ambos lados. Anotar el puntaje del lado más bajo.",
      "Registrar dolor con 0 si aparece en cualquier momento del test.",
    ],
    instruccionesProfesor_en: [
      "Measure the member's tibial height and adjust the cord or hurdle to that height.",
      "Position the member standing with feet together and toes touching the hurdle base, holding the dowel behind the neck on the shoulders.",
      "Instruct them to raise one knee to step over the hurdle and place the foot on the other side, keeping the foot in dorsiflexion.",
      "Observe hip, knee and foot alignment of both legs, and trunk stability.",
      "Assess both sides. Record the lower side score.",
      "Record pain as 0 if it appears at any point during the test.",
    ],
    instruccionesAlumno: [
      "Párate con los pies juntos y los dedos tocando la base de la valla.",
      "Sostén el palo apoyado sobre los hombros detrás de la nuca.",
      "Levantá una rodilla y pasá el pie por encima de la valla, apoyándolo del otro lado.",
      "Volvé a la posición inicial de forma controlada y repetí del otro lado.",
      "Intentá no inclinar el tronco ni mover la cadera de la pierna de apoyo.",
    ],
    instruccionesAlumno_en: [
      "Stand with your feet together and toes touching the base of the hurdle.",
      "Hold the dowel resting on your shoulders behind your neck.",
      "Lift one knee and step over the hurdle, placing your foot on the other side.",
      "Return to the starting position in a controlled manner and repeat on the other side.",
      "Try not to lean your torso or move the hip of the supporting leg.",
    ],
    criterios: {
      3: "Las caderas, rodillas y tobillos permanecen alineados en el plano sagital. La columna lumbar muestra mínimo movimiento. El palo permanece paralelo al suelo. No hay contacto entre el pie y la valla.",
      2: "Se produce alineación deficiente entre cadera, rodilla y tobillo. El palo y la valla pierden paralelismo. Puede haber movimiento lumbar visible.",
      1: "Se produce contacto entre el pie y la valla. Pérdida de equilibrio evidente.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Hips, knees and ankles remain aligned in the sagittal plane. Lumbar spine shows minimal movement. Dowel remains parallel to the ground. No contact between foot and hurdle.",
      2: "Poor alignment between hip, knee and ankle. Dowel and hurdle lose parallelism. Visible lumbar movement may occur.",
      1: "Contact occurs between foot and hurdle. Evident loss of balance.",
      0: "Pain is recorded anywhere in the body during the execution of the movement.",
    },
    imagenes: [],
  },

  // ─── 3. INLINE LUNGE ─────────────────────────────────────────────────────

  "Estocada en linea": {
    id: "inline-lunge",
    titulo: "Estocada en línea",
    titulo_en: "Inline lunge",
    bilateral: true,
    descripcion:
      "Evalúa la estabilidad del tronco, la movilidad y estabilidad de " +
      "caderas, la flexibilidad de cuádriceps y la estabilidad de tobillo y " +
      "rodilla bajo una posición de zancada en línea. También refleja el " +
      "control de la rotación y la deceleración.",
    descripcion_en:
      "Assesses trunk stability, hip mobility and stability, " +
      "quadriceps flexibility, and ankle and knee stability " +
      "in an inline lunge position. Also reflects rotation " +
      "control and deceleration.",
    instruccionesProfesor: [
      "Medir la longitud tibial del alumno. Marcar esa distancia en el suelo como punto de referencia.",
      "Colocar al alumno con el talón trasero en el punto cero y el pie delantero en la marca, en línea recta.",
      "El palo se sostiene vertical detrás de la espalda: una mano detrás de la nuca y la otra en la zona lumbar.",
      "Indicarle que baje la rodilla trasera hasta tocar el suelo detrás del talón del pie delantero.",
      "Observar que el palo permanezca vertical y sin contacto lateral, y que la rodilla delantera no colapse hacia adentro.",
      "Evaluar ambos lados. Anotar el puntaje del lado más bajo.",
    ],
    instruccionesProfesor_en: [
      "Measure the member's tibial length. Mark that distance on the floor as a reference point.",
      "Position the member with the rear heel at point zero and the front foot at the mark, in a straight line.",
      "The dowel is held vertically behind the back: one hand behind the neck and the other on the lower back.",
      "Instruct them to lower the rear knee until it touches the floor behind the front foot's heel.",
      "Observe that the dowel remains vertical without lateral contact, and that the front knee does not collapse inward.",
      "Assess both sides. Record the lower side score.",
    ],
    instruccionesAlumno: [
      "Ubicate con los pies en línea, uno adelante y el otro atrás, separados por la distancia de tu tibia.",
      "Sosté el palo vertical detrás de la espalda con una mano arriba y otra abajo.",
      "Bajá la rodilla trasera hasta que casi toque el suelo, detrás del talón del pie de adelante.",
      "Volvé a la posición inicial de forma controlada y repetí del otro lado.",
      "Intentá no mover el tronco ni que la rodilla delantera se vaya hacia adentro.",
    ],
    instruccionesAlumno_en: [
      "Stand with your feet in line, one forward and one back, separated by the length of your tibia.",
      "Hold the dowel vertically behind your back with one hand up and one hand down.",
      "Lower your back knee until it almost touches the floor, behind the heel of your front foot.",
      "Return to the starting position in a controlled manner and repeat on the other side.",
      "Try not to move your torso or let your front knee collapse inward.",
    ],
    criterios: {
      3: "El palo permanece vertical y en contacto con la cabeza, la columna torácica y el sacro. No hay movimiento lateral del tronco. La rodilla toca el suelo detrás del talón delantero. El pie y la rodilla delanteros permanecen alineados.",
      2: "Pérdida de contacto del palo con alguna de las tres referencias corporales. Movimiento lateral del tronco visible. Inestabilidad o desalineación de la rodilla delantera.",
      1: "Se pierde el equilibrio durante la ejecución del movimiento.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Dowel remains vertical and in contact with head, thoracic spine and sacrum. No lateral trunk movement. Knee touches floor behind front heel. Front foot and knee remain aligned.",
      2: "Loss of dowel contact with any of the three body references. Visible lateral trunk movement. Instability or misalignment of the front knee.",
      1: "Balance is lost during the execution of the movement.",
      0: "Pain is recorded anywhere in the body during the execution of the movement.",
    },
    imagenes: [],
  },

  // ─── 4. SHOULDER MOBILITY ────────────────────────────────────────────────

  "Movilidad de hombro": {
    id: "shoulder-mobility",
    titulo: "Movilidad de hombro",
    titulo_en: "Shoulder mobility",
    bilateral: true,
    descripcion:
      "Evalúa la amplitud de movimiento bilateral de los hombros combinando " +
      "rotación interna con aducción de un lado y rotación externa con " +
      "abducción del otro. También refleja la movilidad de la escápula y la " +
      "extensión torácica.",
    descripcion_en:
      "Assesses bilateral shoulder range of motion combining " +
      "internal rotation with adduction on one side and external rotation with " +
      "abduction on the other. Also reflects scapular mobility and " +
      "thoracic extension.",
    instruccionesProfesor: [
      "Medir la longitud de la mano del alumno (desde la muñeca hasta la punta del dedo medio) como unidad de referencia.",
      "Indicarle que cierre ambos puños con el pulgar hacia adentro.",
      "Pedirle que en un solo movimiento lleve un brazo por encima del hombro y el otro por detrás de la espalda hacia arriba, acercando los puños lo máximo posible.",
      "Medir la distancia entre los nudillos de ambos puños.",
      "Realizar un clearing test (mano palma contra hombro opuesto, elevación del codo): si hay dolor, puntaje 0.",
      "Evaluar ambos lados y anotar el puntaje del lado más bajo.",
    ],
    instruccionesProfesor_en: [
      "Measure the member's hand length (from wrist to tip of middle finger) as a reference unit.",
      "Instruct them to make fists with thumbs inside.",
      "Ask them to bring one arm over the shoulder and the other behind the back upward in one movement, bringing fists as close as possible.",
      "Measure the distance between the knuckles of both fists.",
      "Perform a clearing test (hand palm against opposite shoulder, elbow lift): if pain, score 0.",
      "Assess both sides and record the lower side score.",
    ],
    instruccionesAlumno: [
      "Cerrá los puños con el pulgar hacia adentro.",
      "En un solo movimiento, llevá un brazo por encima del hombro y el otro por detrás de la espalda.",
      "Intentá acercar los puños lo máximo posible sin mover el tronco.",
      "Mantené la posición un momento para que el profesor pueda medir.",
      "Repetí del otro lado.",
    ],
    instruccionesAlumno_en: [
      "Make fists with your thumbs inside.",
      "In one movement, bring one arm over your shoulder and the other behind your back.",
      "Try to bring your fists as close together as possible without moving your torso.",
      "Hold the position for a moment so the coach can measure.",
      "Repeat on the other side.",
    ],
    criterios: {
      3: "Los puños quedan a menos de una longitud de mano de distancia entre sí.",
      2: "Los puños quedan a entre una y una y media longitud de mano de distancia.",
      1: "Los puños quedan a más de una y media longitud de mano de distancia.",
      0: "Se registra dolor en el clearing test o durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Fists are less than one hand length apart.",
      2: "Fists are between one and one and a half hand lengths apart.",
      1: "Fists are more than one and a half hand lengths apart.",
      0: "Pain is recorded in the clearing test or during the execution of the movement.",
    },
    imagenes: [],
  },

  // ─── 5. ACTIVE STRAIGHT LEG RAISE ────────────────────────────────────────

  "Elevacion activa de pierna": {
    id: "active-straight-leg-raise",
    titulo: "Elevación activa de pierna",
    titulo_en: "Active straight leg raise",
    bilateral: true,
    descripcion:
      "Evalúa la flexibilidad funcional activa del isquiotibial y la " +
      "capacidad de disociar la pierna inferior mientras se mantiene una " +
      "posición pélvica y core estables. También refleja la extensión " +
      "disponible de la cadera contralateral.",
    descripcion_en:
      "Assesses active functional hamstring flexibility and the " +
      "ability to dissociate the lower leg while maintaining stable " +
      "pelvic and core position. Also reflects available " +
      "contralateral hip extension.",
    instruccionesProfesor: [
      "Acostar al alumno en decúbito supino con los brazos a los lados y las palmas hacia arriba.",
      "Colocar el palo verticalmente en el punto medio entre la espina ilíaca anterosuperior y la línea articular de la rodilla.",
      "Pedirle que eleve una pierna activamente, con el tobillo en dorsiflexión y la rodilla extendida, tan alto como pueda.",
      "La pierna que queda en el suelo debe permanecer en contacto con el suelo y sin rotar.",
      "Evaluar dónde queda el maléolo interno de la pierna elevada respecto al palo: por encima de la referencia, a la altura, o por debajo.",
      "Evaluar ambos lados y anotar el puntaje del lado más bajo.",
    ],
    instruccionesProfesor_en: [
      "Lay the member supine with arms at sides and palms up.",
      "Place the dowel vertically at the midpoint between the anterior superior iliac spine and the knee joint line.",
      "Ask them to actively raise one leg, with ankle in dorsiflexion and knee extended, as high as possible.",
      "The leg remaining on the floor must stay in contact with the floor without rotating.",
      "Assess where the medial malleolus of the raised leg is relative to the dowel: above the reference, at the same level, or below.",
      "Assess both sides and record the lower side score.",
    ],
    instruccionesAlumno: [
      "Acostáte boca arriba con los brazos a los costados y las palmas hacia arriba.",
      "Sin doblar la rodilla ni rotar la cadera, elevá una pierna lo más alto que puedas.",
      "Mantené el tobillo en punta hacia la espinilla (dorsiflexión) y la pierna bien recta.",
      "La pierna que queda en el suelo debe permanecer quieta y sin rotar.",
      "Mantené la posición un momento y luego bajá con control.",
    ],
    instruccionesAlumno_en: [
      "Lie on your back with your arms at your sides and palms up.",
      "Without bending your knee or rotating your hip, lift one leg as high as you can.",
      "Keep your ankle pointed toward your shin (dorsiflexion) and your leg straight.",
      "The leg remaining on the floor must stay still and not rotate.",
      "Hold the position for a moment and then lower with control.",
    ],
    criterios: {
      3: "El maléolo interno de la pierna elevada pasa más allá del punto de referencia (hacia el muslo). La pierna contraria permanece en posición neutra.",
      2: "El maléolo interno queda a la altura del punto de referencia (zona media del muslo). La pierna contraria permanece en posición neutra.",
      1: "El maléolo interno no alcanza el punto de referencia (zona de la rodilla). Puede haber rotación o elevación de la pierna contraria.",
      0: "Se registra dolor en cualquier parte del cuerpo durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Medial malleolus of the raised leg passes beyond the reference point (toward the thigh). The opposite leg remains in neutral position.",
      2: "Medial malleolus is at the reference point level (mid-thigh area). The opposite leg remains in neutral position.",
      1: "Medial malleolus does not reach the reference point (knee area). There may be rotation or elevation of the opposite leg.",
      0: "Pain is recorded anywhere in the body during the execution of the movement.",
    },
    imagenes: [],
  },

  // ─── 6. TRUNK STABILITY PUSH-UP ──────────────────────────────────────────

  "Estabilidad de tronco": {
    id: "trunk-stability-push-up",
    titulo: "Estabilidad de tronco",
    titulo_en: "Trunk stability push-up",
    bilateral: false,
    descripcion:
      "Evalúa la capacidad del tronco de estabilizarse en el plano sagital " +
      "durante un movimiento de empuje simétrico de miembros superiores. " +
      "Refleja el control reflejo del core para proteger la columna ante " +
      "fuerzas de extensión.",
    descripcion_en:
      "Assesses the trunk's ability to stabilize in the sagittal plane " +
      "during a symmetrical upper extremity pushing movement. " +
      "Reflects reflexive core control to protect the spine against " +
      "extension forces.",
    instruccionesProfesor: [
      "Colocar al alumno en posición prona con los pulgares alineados con la parte superior de la frente (hombres) o el mentón (mujeres).",
      "Los codos deben estar totalmente extendidos y los pies en posición neutra.",
      "Indicarle que realice una flexión de brazos completa manteniendo el cuerpo como una tabla rígida, sin que la columna lumbar se extienda primero.",
      "Si no puede, reposicionar con los pulgares a la altura del mentón (hombres) o las clavículas (mujeres) y repetir.",
      "Realizar un clearing test (press-up en extensión de tronco): si hay dolor, puntaje 0.",
      "Observar si hay separación de las rodillas o extensión lumbar previa al movimiento.",
    ],
    instruccionesProfesor_en: [
      "Place the member prone with thumbs aligned with the top of the forehead (men) or chin (women).",
      "Elbows must be fully extended and feet in neutral position.",
      "Instruct them to perform a full push-up keeping the body as a rigid plank, without the lumbar spine extending first.",
      "If unable, reposition with thumbs at chin level (men) or clavicle level (women) and repeat.",
      "Perform a clearing test (press-up in trunk extension): if pain, score 0.",
      "Observe if there is knee separation or lumbar extension prior to movement.",
    ],
    instruccionesAlumno: [
      "Acostáte boca abajo con los pulgares a la altura de la frente (o el mentón si el profesor lo indica).",
      "Realizá una flexión de brazos levantando todo el cuerpo como una tabla, de una sola pieza.",
      "No dejes que la cadera suba o baje antes que el tronco.",
      "Bajá de forma controlada y repetí si se indica.",
    ],
    instruccionesAlumno_en: [
      "Lie face down with your thumbs at forehead level (or chin level if the coach indicates).",
      "Perform a push-up lifting your entire body as a single plank.",
      "Do not let your hips rise or lower before your torso.",
      "Lower in a controlled manner and repeat if indicated.",
    ],
    criterios: {
      3: "Hombres: realiza una flexión correcta con los pulgares a la altura de la frente. Mujeres: realiza una flexión correcta con los pulgares a la altura del mentón. El cuerpo se mueve como una unidad sin extensión lumbar previa.",
      2: "Hombres: logra la flexión solo con los pulgares a la altura del mentón. Mujeres: logra la flexión solo con los pulgares a la altura de las clavículas.",
      1: "No puede realizar la flexión en ninguna de las posiciones descriptas.",
      0: "Se registra dolor en el clearing test de extensión o durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Men: performs a correct push-up with thumbs at forehead level. Women: performs a correct push-up with thumbs at chin level. Body moves as a unit without prior lumbar extension.",
      2: "Men: achieves the push-up only with thumbs at chin level. Women: achieves the push-up only with thumbs at clavicle level.",
      1: "Cannot perform the push-up in any of the described positions.",
      0: "Pain is recorded in the extension clearing test or during the execution of the movement.",
    },
    imagenes: [],
  },

  // ─── 7. ROTARY STABILITY ─────────────────────────────────────────────────

  "Estabilidad rotatoria": {
    id: "rotary-stability",
    titulo: "Estabilidad rotatoria",
    titulo_en: "Rotary stability",
    bilateral: true,
    descripcion:
      "Evalúa la estabilidad multiplanar del tronco durante un movimiento " +
      "combinado de miembros superiores e inferiores ipsilaterales. " +
      "Refleja la coordinación neuromuscular y la capacidad de transferir " +
      "energía de manera eficiente a través del tronco.",
    descripcion_en:
      "Assesses multiplanar trunk stability during a combined " +
      "ipsilateral upper and lower extremity movement. " +
      "Reflects neuromuscular coordination and the ability to efficiently " +
      "transfer energy through the trunk.",
    instruccionesProfesor: [
      "Colocar al alumno en posición de cuadrupedia (manos bajo hombros, rodillas bajo caderas), con el palo sobre la columna tocando cabeza, columna torácica y sacro.",
      "Indicarle que extienda simultáneamente el brazo y la pierna del mismo lado (ipsilateral) hasta quedar alineados con el tronco.",
      "Luego pedirle que lleve el codo y la rodilla del mismo lado hasta que se toquen debajo del tronco.",
      "Si no puede realizarlo de forma ipsilateral, repetir el intento de forma contralateral (brazo derecho + pierna izquierda).",
      "Realizar un clearing test (posición de child's pose): si hay dolor, puntaje 0.",
      "Evaluar ambos lados y anotar el puntaje del lado más bajo.",
    ],
    instruccionesProfesor_en: [
      "Place the member in a quadruped position (hands under shoulders, knees under hips), with the dowel on the spine touching head, thoracic spine and sacrum.",
      "Instruct them to simultaneously extend the arm and leg on the same side (ipsilateral) until aligned with the trunk.",
      "Then ask them to bring the elbow and knee on the same side together until they touch under the trunk.",
      "If unable to perform ipsilaterally, repeat the attempt contralaterally (right arm + left leg).",
      "Perform a clearing test (child's pose position): if pain, score 0.",
      "Assess both sides and record the lower side score.",
    ],
    instruccionesAlumno: [
      "Ubicate en cuatro apoyos (manos y rodillas), con la espalda plana.",
      "Extendé el brazo y la pierna del mismo lado al mismo tiempo hasta que queden paralelos al suelo.",
      "Luego acercá el codo y la rodilla del mismo lado hasta que se toquen debajo de la panza.",
      "Realizá el movimiento de forma lenta y sin perder el equilibrio ni rotar el tronco.",
      "Repetí del otro lado.",
    ],
    instruccionesAlumno_en: [
      "Get on all fours (hands and knees), with your back flat.",
      "Extend your arm and leg on the same side at the same time until they are parallel to the floor.",
      "Then bring your elbow and knee on the same side together until they touch under your belly.",
      "Perform the movement slowly without losing balance or rotating your torso.",
      "Repeat on the other side.",
    ],
    criterios: {
      3: "Realiza correctamente la extensión y el toque ipsilateral (mismo lado) sin que el palo pierda contacto con los tres puntos de referencia. El tronco no rota ni pierde estabilidad.",
      2: "No puede realizar el movimiento ipsilateral pero sí el contralateral (brazo derecho con pierna izquierda) de forma correcta.",
      1: "No puede realizar el movimiento ni en forma ipsilateral ni contralateral de manera correcta.",
      0: "Se registra dolor en el clearing test de flexión o durante la ejecución del movimiento.",
    },
    criterios_en: {
      3: "Correctly performs ipsilateral extension and touch without the dowel losing contact with all three reference points. Trunk does not rotate or lose stability.",
      2: "Cannot perform the ipsilateral movement but can perform the contralateral movement (right arm with left leg) correctly.",
      1: "Cannot perform the movement either ipsilaterally or contralaterally correctly.",
      0: "Pain is recorded in the flexion clearing test or during the execution of the movement.",
    },
    imagenes: [],
  },
};

// English aliases for FMS tests - point to the same data
const FMS_ALIASES: Record<string, string> = {
  "Deep squat": "Sentadilla profunda",
  "Hurdle step": "Paso de valla",
  "Inline lunge": "Estocada en linea",
  "Shoulder mobility": "Movilidad de hombro",
  "Active straight leg raise": "Elevacion activa de pierna",
  "Trunk stability push-up": "Estabilidad de tronco",
  "Rotary stability": "Estabilidad rotatoria",
};

// Add English aliases to FMS_INFO
for (const [enKey, esKey] of Object.entries(FMS_ALIASES)) {
  if (FMS_INFO[esKey]) {
    FMS_INFO[enKey] = FMS_INFO[esKey];
  }
}