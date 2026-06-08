import AlumnoRutinasProfesor from "@/components/alumnos/AlumnoRutinasProfesor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AlumnoRutinasProfesor params={params} />;
}
